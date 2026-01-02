/**
 * Atomic write operations
 * Week 1 Day 5-6: Storage layer
 * Pattern from Implementation Guide: Atomic Write Pattern
 * Ensures data integrity during writes
 * 
 * Enhanced with file locking (Day 4 - 8 AI consensus)
 */

import { writeFile, rename } from 'fs/promises';
import { dirname } from 'path';
import { StorageError, FileWriteError } from '../core/errors.js';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { ensureParentDirectory } from '../core/resilience.js';
import { acquireLock } from '../core/filelock.js';

/**
 * Atomic write - Write to temp file then rename
 * Ensures all-or-nothing write operation
 */
export async function atomicWrite(
  filePath: string,
  content: string | Buffer
): Promise<Result<void, StorageError>> {
  try {
    // Ensure parent directory exists (with error handling)
    const dirResult = ensureParentDirectory(filePath);
    if (!dirResult.ok) {
      return dirResult;
    }

    // Write to temp file first
    const tempPath = `${filePath}.tmp`;
    const data = typeof content === 'string' ? content : content.toString();
    
    await writeFile(tempPath, data, 'utf-8');

    // Atomic rename (OS-level operation)
    await rename(tempPath, filePath);

    return Ok(undefined);
  } catch (error: any) {
    // Clean up temp file if it exists
    try {
      await rename(`${filePath}.tmp`, `${filePath}.tmp.broken`);
    } catch {
      // Ignore cleanup errors
    }

    if (error.code === 'ENOENT') {
      return Err(new StorageError(`Directory not found: ${dirname(filePath)}`, 'write'));
    }

    return Err(new FileWriteError(error.message));
  }
}

/**
 * Atomic write JSON - Serialize and write atomically
 */
export async function atomicWriteJson<T>(
  filePath: string,
  data: T
): Promise<Result<void, StorageError>> {
  try {
    const json = JSON.stringify(data, null, 2);
    return await atomicWrite(filePath, json);
  } catch (error: any) {
    return Err(new FileWriteError(`Failed to serialize JSON: ${error.message}`));
  }
}

/**
 * Atomic write with file locking - For critical operations
 * Prevents race conditions when multiple processes write to the same file
 */
export async function atomicWriteLocked(
  filePath: string,
  content: string | Buffer,
  lockTimeout: number = 5000
): Promise<Result<void, StorageError>> {
  const lock = await acquireLock(filePath, { timeout: lockTimeout });
  
  if (!lock.acquired) {
    return Err(new StorageError(
      `Could not acquire lock for ${filePath} - file may be in use by another process`,
      'write'
    ));
  }
  
  try {
    return await atomicWrite(filePath, content);
  } finally {
    await lock.release();
  }
}

/**
 * Atomic write JSON with file locking - For critical JSON operations
 */
export async function atomicWriteJsonLocked<T>(
  filePath: string,
  data: T,
  lockTimeout: number = 5000
): Promise<Result<void, StorageError>> {
  try {
    const json = JSON.stringify(data, null, 2);
    return await atomicWriteLocked(filePath, json, lockTimeout);
  } catch (error: any) {
    return Err(new FileWriteError(`Failed to serialize JSON: ${error.message}`));
  }
}

