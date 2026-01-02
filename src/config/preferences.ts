/**
 * User Preferences System
 * 
 * Allows users to enable/disable features based on their needs.
 * Preferences are stored in .memorylink/config.json
 */

import { existsSync, mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';

/**
 * User preferences - all features user can toggle
 */
export interface UserPreferences {
  // Security features
  git_hooks: boolean;          // Enable git hooks (warn or block based on block_mode)
  validity_check: boolean;     // Check if secrets are working
  browser_patterns: boolean;   // Scan localStorage, sessionStorage
  debug_patterns: boolean;     // Detect console.log with secrets
  
  // Scan settings
  scan_on_init: boolean;       // Scan project on first setup
  auto_scan: boolean;          // Scan before each commit
  
  // Output settings
  show_tips: boolean;          // Show helpful tips
  colored_output: boolean;     // Use colors in terminal
  
  // Blocking behavior - KEY SETTING!
  block_mode: boolean;         // FALSE = warn only (default), TRUE = block pipeline
  strict_mode: boolean;        // Block on warnings too (only if block_mode=true)
}

/**
 * Whitelist configuration to prevent false positives
 */
export interface WhitelistConfig {
  // Patterns to ignore (key names like "integrity", "MAX_RETRIES")
  patterns: string[];
  
  // Files/directories to skip entirely
  files: string[];
  
  // Regex patterns for more complex matching
  regex: string[];
}

/**
 * Default preferences - sensible defaults for new users
 * 
 * IMPORTANT: block_mode is FALSE by default!
 * This means MemoryLink will WARN users about issues but NOT block them.
 * Users can enable blocking if they want stricter security.
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  git_hooks: true,           // Recommended: enable hooks (but won't block by default)
  validity_check: false,     // Off by default (requires network)
  browser_patterns: true,    // Recommended: catch browser leaks
  debug_patterns: true,      // Recommended: catch debug code
  
  scan_on_init: true,        // Recommended: find existing issues
  auto_scan: true,           // Recommended: continuous protection
  
  show_tips: true,           // Helpful for new users
  colored_output: true,      // Better readability
  
  block_mode: false,         // DEFAULT: WARN ONLY - don't block users!
  strict_mode: false,        // Not too strict by default
};

/**
 * Default whitelist - common false positive patterns
 * These are auto-whitelisted to prevent noise
 */
export const DEFAULT_WHITELIST: WhitelistConfig = {
  // Key patterns that are safe
  patterns: [
    'integrity',           // npm package-lock.json integrity hashes
    'sha512-*',            // SHA-512 hashes
    'sha256-*',            // SHA-256 hashes
    'MAX_*',               // Constants like MAX_RETRIES
    'MIN_*',               // Constants like MIN_LENGTH
    'DEFAULT_*',           // Default constants
    'TEST_*',              // Test constants
    'MOCK_*',              // Mock data
    'EXAMPLE_*',           // Example data
    'PLACEHOLDER_*',       // Placeholder values
  ],
  
  // Files to skip entirely
  files: [
    'package-lock.json',   // npm lockfile (full of integrity hashes)
    'yarn.lock',           // yarn lockfile
    'pnpm-lock.yaml',      // pnpm lockfile
    'composer.lock',       // PHP lockfile
    'Gemfile.lock',        // Ruby lockfile
    'poetry.lock',         // Python lockfile
    'Cargo.lock',          // Rust lockfile
    '*.min.js',            // Minified files
    '*.min.css',           // Minified files
    '*.map',               // Source maps
    'node_modules/**',     // Dependencies
    'dist/**',             // Build output
    '.git/**',             // Git directory
    'coverage/**',         // Test coverage
    '__snapshots__/**',    // Jest snapshots
    '*.test.ts',           // Test files (optional)
    '*.spec.ts',           // Spec files (optional)
  ],
  
  // Regex patterns for complex matching
  regex: [
    // Base64 that looks like integrity hashes (starts with sha)
    '^sha(256|384|512)-[A-Za-z0-9+/=]{40,}$',
    // UUID patterns (not secrets)
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  ],
};

/**
 * Human-friendly names for preferences
 */
export const PREFERENCE_NAMES: Record<keyof UserPreferences, string> = {
  git_hooks: 'Git Hooks (scan before commits)',
  validity_check: 'Validity Check (verify if secrets work)',
  browser_patterns: 'Browser Patterns (localStorage, cookies)',
  debug_patterns: 'Debug Patterns (console.log with secrets)',
  scan_on_init: 'Scan on Setup (find existing issues)',
  auto_scan: 'Auto Scan (before each commit)',
  show_tips: 'Show Tips (helpful hints)',
  colored_output: 'Colored Output (prettier terminal)',
  block_mode: 'Block Mode (stop pipeline when issues found)',
  strict_mode: 'Strict Mode (block warnings too)',
};

/**
 * Human-friendly descriptions
 */
export const PREFERENCE_DESCRIPTIONS: Record<keyof UserPreferences, string> = {
  git_hooks: 'Run security scan before commits (warns by default, blocks if block_mode=on)',
  validity_check: 'Check if detected secrets are still working (requires internet)',
  browser_patterns: 'Detect secrets in localStorage, sessionStorage, cookies',
  debug_patterns: 'Detect console.log and debug code that might leak secrets',
  scan_on_init: 'Scan your entire project when you first set up MemoryLink',
  auto_scan: 'Automatically scan changed files before each commit',
  show_tips: 'Show helpful tips and suggestions in the output',
  colored_output: 'Use colors to make output easier to read',
  block_mode: 'BLOCK commits/pushes when secrets found (default: OFF = warn only)',
  strict_mode: 'Treat warnings as errors (only works if block_mode=on)',
};

/**
 * Get config file path
 */
function getConfigPath(cwd: string): string {
  return resolve(cwd, '.memorylink', 'config.json');
}

/**
 * Load user preferences
 */
export async function loadPreferences(cwd: string): Promise<Result<UserPreferences, StorageError>> {
  const configPath = getConfigPath(cwd);
  
  if (!existsSync(configPath)) {
    // Return defaults if no config exists
    return Ok({ ...DEFAULT_PREFERENCES });
  }
  
  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    // Merge with defaults (in case new preferences were added)
    const preferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...config.preferences,
    };
    
    return Ok(preferences);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to load preferences: ${error.message}`,
      'config_load'
    ));
  }
}

/**
 * Save user preferences
 */
export async function savePreferences(
  cwd: string,
  preferences: UserPreferences
): Promise<Result<void, StorageError>> {
  const configPath = getConfigPath(cwd);
  const configDir = dirname(configPath);
  
  // Ensure directory exists
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  try {
    // Load existing config to preserve other settings
    let config: any = {};
    if (existsSync(configPath)) {
      const content = await readFile(configPath, 'utf-8');
      config = JSON.parse(content);
    }
    
    // Update preferences
    config.preferences = preferences;
    config.updated_at = new Date().toISOString();
    
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    
    return Ok(undefined);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to save preferences: ${error.message}`,
      'config_save'
    ));
  }
}

/**
 * Get a single preference
 */
export async function getPreference<K extends keyof UserPreferences>(
  cwd: string,
  key: K
): Promise<Result<UserPreferences[K], StorageError>> {
  const result = await loadPreferences(cwd);
  if (!result.ok) {
    return result;
  }
  return Ok(result.value[key]);
}

/**
 * Set a single preference
 */
export async function setPreference<K extends keyof UserPreferences>(
  cwd: string,
  key: K,
  value: UserPreferences[K]
): Promise<Result<void, StorageError>> {
  const loadResult = await loadPreferences(cwd);
  if (!loadResult.ok) {
    return loadResult;
  }
  
  const preferences = loadResult.value;
  preferences[key] = value;
  
  return savePreferences(cwd, preferences);
}

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(
  cwd: string,
  feature: keyof UserPreferences
): Promise<boolean> {
  const result = await getPreference(cwd, feature);
  if (!result.ok) {
    // Return default if can't load
    return DEFAULT_PREFERENCES[feature];
  }
  return result.value;
}

/**
 * Get all preference keys
 */
export function getPreferenceKeys(): (keyof UserPreferences)[] {
  return Object.keys(DEFAULT_PREFERENCES) as (keyof UserPreferences)[];
}

// ============================================================================
// WHITELIST FUNCTIONS
// ============================================================================

/**
 * Load whitelist configuration
 */
export async function loadWhitelist(cwd: string): Promise<Result<WhitelistConfig, StorageError>> {
  const configPath = getConfigPath(cwd);
  
  if (!existsSync(configPath)) {
    return Ok({ ...DEFAULT_WHITELIST });
  }
  
  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    
    // Merge with defaults
    const whitelist: WhitelistConfig = {
      patterns: [
        ...DEFAULT_WHITELIST.patterns,
        ...(config.whitelist?.patterns || []),
      ],
      files: [
        ...DEFAULT_WHITELIST.files,
        ...(config.whitelist?.files || []),
      ],
      regex: [
        ...DEFAULT_WHITELIST.regex,
        ...(config.whitelist?.regex || []),
      ],
    };
    
    return Ok(whitelist);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to load whitelist: ${error.message}`,
      'config_load'
    ));
  }
}

/**
 * Save whitelist configuration
 */
export async function saveWhitelist(
  cwd: string,
  whitelist: Partial<WhitelistConfig>
): Promise<Result<void, StorageError>> {
  const configPath = getConfigPath(cwd);
  const configDir = dirname(configPath);
  
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
  
  try {
    let config: any = {};
    if (existsSync(configPath)) {
      const content = await readFile(configPath, 'utf-8');
      config = JSON.parse(content);
    }
    
    // Update whitelist (only user-added, not defaults)
    config.whitelist = {
      patterns: whitelist.patterns || [],
      files: whitelist.files || [],
      regex: whitelist.regex || [],
    };
    config.updated_at = new Date().toISOString();
    
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    
    return Ok(undefined);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to save whitelist: ${error.message}`,
      'config_save'
    ));
  }
}

/**
 * Add item to whitelist
 */
export async function addToWhitelist(
  cwd: string,
  type: 'patterns' | 'files' | 'regex',
  value: string
): Promise<Result<void, StorageError>> {
  const loadResult = await loadWhitelist(cwd);
  if (!loadResult.ok) {
    return loadResult;
  }
  
  const whitelist = loadResult.value;
  
  // Don't add duplicates
  if (!whitelist[type].includes(value)) {
    whitelist[type].push(value);
  }
  
  return saveWhitelist(cwd, whitelist);
}

/**
 * Check if a key name is whitelisted
 */
export function isKeyWhitelisted(keyName: string, whitelist: WhitelistConfig): boolean {
  // Check exact pattern match
  if (whitelist.patterns.includes(keyName)) {
    return true;
  }
  
  // Check wildcard patterns
  for (const pattern of whitelist.patterns) {
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      if (new RegExp(`^${regexPattern}$`, 'i').test(keyName)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a file path is whitelisted
 */
export function isFileWhitelisted(filePath: string, whitelist: WhitelistConfig): boolean {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  for (const pattern of whitelist.files) {
    // Exact match
    if (normalizedPath === pattern || normalizedPath.endsWith('/' + pattern)) {
      return true;
    }
    
    // Glob pattern matching
    if (pattern.includes('*')) {
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '.');
      if (new RegExp(regexPattern).test(normalizedPath)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a value matches whitelist regex
 */
export function isValueWhitelisted(value: string, whitelist: WhitelistConfig): boolean {
  for (const pattern of whitelist.regex) {
    try {
      if (new RegExp(pattern, 'i').test(value)) {
        return true;
      }
    } catch {
      // Invalid regex, skip
    }
  }
  
  return false;
}

/**
 * Check if something should be skipped (key, file, or value)
 */
export function shouldSkip(
  whitelist: WhitelistConfig,
  options: {
    keyName?: string;
    filePath?: string;
    value?: string;
  }
): boolean {
  if (options.keyName && isKeyWhitelisted(options.keyName, whitelist)) {
    return true;
  }
  
  if (options.filePath && isFileWhitelisted(options.filePath, whitelist)) {
    return true;
  }
  
  if (options.value && isValueWhitelisted(options.value, whitelist)) {
    return true;
  }
  
  return false;
}

