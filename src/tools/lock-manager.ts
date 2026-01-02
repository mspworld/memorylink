/**
 * Lightweight file lock manager
 * Week 6 Day 42: Tool integration
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Prevents simultaneous large operations
 * Optional: Enabled with --lock flag
 */

import { writeFile, unlink } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';

/**
 * Lock file path
 */
function getLockFilePath(cwd: string = process.cwd()): string {
  return resolve(cwd, '.memorylink', 'active-tool');
}

/**
 * Check if lock exists
 */
export function isLocked(cwd: string = process.cwd()): boolean {
  return existsSync(getLockFilePath(cwd));
}

/**
 * Get active tool name (if locked)
 */
export async function getActiveTool(cwd: string = process.cwd()): Promise<string | null> {
  if (!isLocked(cwd)) {
    return null;
  }
  
  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(getLockFilePath(cwd), 'utf-8');
    return content.trim();
  } catch {
    return null;
  }
}

/**
 * Acquire lock
 */
export async function acquireLock(
  toolName: string,
  cwd: string = process.cwd(),
  force: boolean = false
): Promise<Result<void, StorageError>> {
  if (isLocked(cwd) && !force) {
    const activeTool = await getActiveTool(cwd);
    return Err(new StorageError(
      `Another tool is active: ${activeTool || 'unknown'}. Use --force to override.`,
      'lock_acquire'
    ));
  }
  
  try {
    const lockPath = getLockFilePath(cwd);
    const { mkdir } = await import('fs/promises');
    const { dirname } = await import('path');
    
    // Ensure directory exists
    await mkdir(dirname(lockPath), { recursive: true });
    
    await writeFile(lockPath, toolName, 'utf-8');
    return Ok(undefined);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to acquire lock: ${error.message}`,
      'lock_acquire'
    ));
  }
}

/**
 * Release lock
 */
export async function releaseLock(cwd: string = process.cwd()): Promise<Result<void, StorageError>> {
  if (!isLocked(cwd)) {
    return Ok(undefined); // Already unlocked
  }
  
  try {
    await unlink(getLockFilePath(cwd));
    return Ok(undefined);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to release lock: ${error.message}`,
      'lock_release'
    ));
  }
}

