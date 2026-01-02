/**
 * Bypass workflow for gate system
 * Week 8 Day 53-55: Tiered gate system
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Allows users to bypass gate checks with reason + expiry
 * Tracks bypasses and auto-expires them
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';

/**
 * Bypass record
 */
export interface BypassRecord {
  reason: string;        // Why bypass was needed
  created_at: string;     // ISO-8601 timestamp
  expires_at: string;     // ISO-8601 timestamp (auto-expiry)
  created_by?: string;    // User who created bypass
  pattern_id?: string;    // Specific pattern to bypass (optional)
  file_path?: string;     // Specific file to bypass (optional)
}

/**
 * Bypass configuration
 */
export interface BypassConfig {
  bypasses: BypassRecord[];
}

/**
 * Get bypass file path
 */
function getBypassPath(cwd: string = process.cwd()): string {
  return resolve(cwd, '.memorylink', 'bypasses.json');
}

/**
 * Load bypass configuration
 */
export async function loadBypassConfig(
  cwd: string = process.cwd()
): Promise<Result<BypassConfig, StorageError>> {
  const bypassPath = getBypassPath(cwd);
  
  if (!existsSync(bypassPath)) {
    return Ok({ bypasses: [] });
  }
  
  try {
    const content = await readFile(bypassPath, 'utf-8');
    const config = JSON.parse(content) as BypassConfig;
    
    // Filter out expired bypasses
    const now = new Date();
    const activeBypasses = config.bypasses.filter(bypass => {
      const expiresAt = new Date(bypass.expires_at);
      return expiresAt > now;
    });
    
    // If some bypasses expired, save updated config
    if (activeBypasses.length !== config.bypasses.length) {
      await saveBypassConfig(cwd, { bypasses: activeBypasses });
    }
    
    return Ok({ bypasses: activeBypasses });
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to load bypass config: ${error.message}`,
      'bypass_load'
    ));
  }
}

/**
 * Save bypass configuration
 */
async function saveBypassConfig(
  cwd: string,
  config: BypassConfig
): Promise<Result<void, StorageError>> {
  const bypassPath = getBypassPath(cwd);
  const bypassDir = join(bypassPath, '..');
  
  try {
    await mkdir(bypassDir, { recursive: true });
    await writeFile(bypassPath, JSON.stringify(config, null, 2), 'utf-8');
    return Ok(undefined);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to save bypass config: ${error.message}`,
      'bypass_save'
    ));
  }
}

/**
 * Create a bypass record
 */
export async function createBypass(
  cwd: string,
  options: {
    reason: string;
    expiresInHours?: number; // Default: 24 hours
    patternId?: string;
    filePath?: string;
  }
): Promise<Result<BypassRecord, StorageError>> {
  const expiresInHours = options.expiresInHours || 24;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
  
  const bypass: BypassRecord = {
    reason: options.reason,
    created_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    created_by: process.env.USER || process.env.USERNAME || 'unknown',
    pattern_id: options.patternId,
    file_path: options.filePath,
  };
  
  // Load existing config
  const configResult = await loadBypassConfig(cwd);
  if (!configResult.ok) {
    return configResult;
  }
  
  const config = configResult.value;
  config.bypasses.push(bypass);
  
  // Save updated config
  const saveResult = await saveBypassConfig(cwd, config);
  if (!saveResult.ok) {
    return saveResult;
  }
  
  return Ok(bypass);
}

/**
 * Check if a detection is bypassed
 */
export async function isBypassed(
  cwd: string,
  patternId?: string,
  filePath?: string
): Promise<Result<boolean, StorageError>> {
  const configResult = await loadBypassConfig(cwd);
  if (!configResult.ok) {
    return configResult;
  }
  
  const config = configResult.value;
  
  // Check for matching bypasses
  for (const bypass of config.bypasses) {
    // Check if bypass matches
    const patternMatch = !bypass.pattern_id || bypass.pattern_id === patternId;
    const fileMatch = !bypass.file_path || bypass.file_path === filePath;
    
    // If bypass has no specific pattern/file, it's a global bypass
    const isGlobal = !bypass.pattern_id && !bypass.file_path;
    
    if (isGlobal || (patternMatch && fileMatch)) {
      // Check if bypass is still valid (not expired)
      const expiresAt = new Date(bypass.expires_at);
      if (expiresAt > new Date()) {
        return Ok(true);
      }
    }
  }
  
  return Ok(false);
}

/**
 * List all active bypasses
 */
export async function listBypasses(
  cwd: string = process.cwd()
): Promise<Result<BypassRecord[], StorageError>> {
  const configResult = await loadBypassConfig(cwd);
  if (!configResult.ok) {
    return configResult;
  }
  
  return Ok(configResult.value.bypasses);
}

/**
 * Remove a bypass (by index or pattern/file match)
 */
export async function removeBypass(
  cwd: string,
  options: {
    index?: number;
    patternId?: string;
    filePath?: string;
  }
): Promise<Result<void, StorageError>> {
  const configResult = await loadBypassConfig(cwd);
  if (!configResult.ok) {
    return configResult;
  }
  
  const config = configResult.value;
  
  if (options.index !== undefined) {
    // Remove by index
    if (options.index >= 0 && options.index < config.bypasses.length) {
      config.bypasses.splice(options.index, 1);
    } else {
      return Err(new StorageError(
        `Invalid bypass index: ${options.index}`,
        'bypass_remove'
      ));
    }
  } else if (options.patternId || options.filePath) {
    // Remove by pattern/file match
    config.bypasses = config.bypasses.filter(bypass => {
      const patternMatch = options.patternId && bypass.pattern_id === options.patternId;
      const fileMatch = options.filePath && bypass.file_path === options.filePath;
      return !(patternMatch || fileMatch);
    });
  } else {
    return Err(new StorageError(
      'Must specify index, patternId, or filePath',
      'bypass_remove'
    ));
  }
  
  // Save updated config
  return saveBypassConfig(cwd, config);
}

