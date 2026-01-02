/**
 * Dynamic pattern configuration loader
 * Allows users to customize secret detection patterns via .memorylink/config.json
 * 
 * Features:
 * - Load built-in patterns (static, always available)
 * - Load user-defined patterns from config.json (dynamic)
 * - Enable/disable specific patterns
 * - Merge patterns with user patterns taking precedence
 */

import { existsSync, readFileSync } from 'fs';
import { getConfigPath } from '../storage/paths.js';
import { SECRET_PATTERNS as BUILTIN_PATTERNS, type SecretPattern } from './patterns.js';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { ConfigError } from '../core/errors.js';

/**
 * Configuration structure for secret patterns
 */
export interface PatternConfig {
  /**
   * Patterns to disable (by ID)
   * Example: ["api-key-2", "generic-secret"]
   */
  disabled?: string[];
  
  /**
   * Custom patterns to add
   * Example: [
   *   {
   *     "id": "custom-api-key",
   *     "name": "Custom API Key",
   *     "pattern": "custom_[a-zA-Z0-9]{32,}",
   *     "description": "Custom API key format"
   *   }
   * ]
   */
  custom?: Array<{
    id: string;
    name: string;
    pattern: string; // Regex pattern as string
    description: string;
  }>;
}

/**
 * Full MemoryLink config structure
 */
export interface MemoryLinkConfig {
  patterns?: PatternConfig;
  // Future: other config options can go here
}

/**
 * Load configuration from .memorylink/config.json
 * Returns default config if file doesn't exist (graceful degradation)
 */
export function loadConfig(cwd: string): Result<MemoryLinkConfig, ConfigError> {
  try {
    const configPath = getConfigPath(cwd);
    
    if (!existsSync(configPath)) {
      // No config file = use defaults (all built-in patterns enabled)
      return Ok({});
    }
    
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as MemoryLinkConfig;
    
    // Validate config structure
    if (config.patterns) {
      if (config.patterns.disabled && !Array.isArray(config.patterns.disabled)) {
        return Err(new ConfigError('config.patterns.disabled must be an array'));
      }
      if (config.patterns.custom && !Array.isArray(config.patterns.custom)) {
        return Err(new ConfigError('config.patterns.custom must be an array'));
      }
    }
    
    return Ok(config);
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return Err(new ConfigError(`Invalid JSON in config file: ${error.message}`));
    }
    return Err(new ConfigError(`Failed to load config: ${error.message}`));
  }
}

/**
 * Compile regex pattern from string
 * Handles invalid regex gracefully
 */
function compilePattern(patternString: string): Result<RegExp, ConfigError> {
  try {
    // Support both /pattern/flags and plain pattern formats
    let regex: RegExp;
    
    if (patternString.startsWith('/') && patternString.lastIndexOf('/') > 0) {
      // Format: /pattern/flags
      const lastSlash = patternString.lastIndexOf('/');
      const pattern = patternString.slice(1, lastSlash);
      const flags = patternString.slice(lastSlash + 1);
      regex = new RegExp(pattern, flags);
    } else {
      // Plain pattern (default to case-insensitive)
      regex = new RegExp(patternString, 'i');
    }
    
    return Ok(regex);
  } catch (error: any) {
    return Err(new ConfigError(`Invalid regex pattern: ${patternString}. Error: ${error.message}`));
  }
}

/**
 * Load active patterns (built-in + custom, minus disabled)
 * This is the main function that combines static and dynamic patterns
 */
export function loadActivePatterns(cwd: string): Result<SecretPattern[], ConfigError> {
  const configResult = loadConfig(cwd);
  if (!configResult.ok) {
    // On config error, fall back to built-in patterns only (graceful degradation)
    console.warn(`Warning: Failed to load config: ${configResult.error.message}. Using built-in patterns only.`);
    return Ok([...BUILTIN_PATTERNS]);
  }
  
  const config = configResult.value;
  const disabled = config.patterns?.disabled || [];
  const custom = config.patterns?.custom || [];
  
  // Start with built-in patterns (filter out disabled)
  const activePatterns: SecretPattern[] = BUILTIN_PATTERNS.filter(
    pattern => !disabled.includes(pattern.id)
  );
  
  // Add custom patterns
  for (const customPattern of custom) {
    // Validate custom pattern
    if (!customPattern.id || !customPattern.name || !customPattern.pattern) {
      console.warn(`Warning: Skipping invalid custom pattern: ${JSON.stringify(customPattern)}`);
      continue;
    }
    
    // Check for ID conflicts (custom patterns override built-in)
    const existingIndex = activePatterns.findIndex(p => p.id === customPattern.id);
    
    const regexResult = compilePattern(customPattern.pattern);
    if (!regexResult.ok) {
      console.warn(`Warning: Skipping custom pattern "${customPattern.id}": ${regexResult.error.message}`);
      continue;
    }
    
    const newPattern: SecretPattern = {
      id: customPattern.id,
      name: customPattern.name,
      pattern: regexResult.value,
      description: customPattern.description || 'Custom pattern',
    };
    
    if (existingIndex >= 0) {
      // Replace existing pattern (custom overrides built-in)
      activePatterns[existingIndex] = newPattern;
    } else {
      // Add new pattern
      activePatterns.push(newPattern);
    }
  }
  
  return Ok(activePatterns);
}

/**
 * Get pattern statistics (for debugging/info)
 */
export function getPatternStats(cwd: string): {
  builtin: number;
  active: number;
  disabled: number;
  custom: number;
} {
  const configResult = loadConfig(cwd);
  const config = configResult.ok ? configResult.value : {};
  
  const disabled = config.patterns?.disabled || [];
  const custom = config.patterns?.custom || [];
  
  const activeResult = loadActivePatterns(cwd);
  const active = activeResult.ok ? activeResult.value.length : BUILTIN_PATTERNS.length;
  
  return {
    builtin: BUILTIN_PATTERNS.length,
    active,
    disabled: disabled.length,
    custom: custom.length,
  };
}

