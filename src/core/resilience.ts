/**
 * Resilience utilities for production-scale operations
 * Handles edge cases and provides self-healing mechanisms
 * Week 4: Production-grade error handling
 */

import { existsSync, mkdirSync, statSync } from 'fs';
import { dirname } from 'path';
import type { Result } from './types.js';
import { Ok, Err } from './types.js';
import { StorageError } from './errors.js';

/**
 * Check if disk is full (approximate check)
 */
export function checkDiskSpace(path: string): Result<boolean, StorageError> {
  try {
    statSync(path);
    // If we can stat the path, assume space is available
    // (exact disk space checking requires platform-specific code)
    return Ok(true);
  } catch (error: any) {
    if (error.code === 'ENOSPC') {
      return Err(new StorageError('Disk full', 'check'));
    }
    // Other errors are OK (path might not exist yet)
    return Ok(true);
  }
}

/**
 * Ensure directory exists, create if needed
 * Handles race conditions (multiple processes creating same dir)
 */
export function ensureDirectory(dirPath: string): Result<void, StorageError> {
  try {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
    return Ok(undefined);
  } catch (error: any) {
    // EEXIST is OK (race condition - another process created it)
    if (error.code === 'EEXIST') {
      return Ok(undefined);
    }
    
    if (error.code === 'ENOSPC') {
      return Err(new StorageError('Disk full: Cannot create directory', 'mkdir'));
    }
    
    if (error.code === 'EACCES') {
      return Err(new StorageError('Permission denied: Cannot create directory', 'mkdir'));
    }
    
    return Err(new StorageError(`Failed to create directory: ${error.message}`, 'mkdir'));
  }
}

/**
 * Ensure parent directory exists
 */
export function ensureParentDirectory(filePath: string): Result<void, StorageError> {
  const parentDir = dirname(filePath);
  return ensureDirectory(parentDir);
}

/**
 * Validate file is not corrupted (basic JSON check)
 */
export function validateJsonFile(content: string): Result<boolean, StorageError> {
  try {
    JSON.parse(content);
    return Ok(true);
  } catch (error: any) {
    return Err(new StorageError(`Corrupted JSON file: ${error.message}`, 'validate'));
  }
}

/**
 * Handle concurrent access errors
 */
export function isConcurrentAccessError(error: Error): boolean {
  const code = (error as any).code || '';
  const message = error.message || '';
  
  return /EBUSY|EAGAIN|EMFILE|ENFILE/i.test(code) ||
         /resource.*busy|too many open files/i.test(message);
}

/**
 * Handle permission errors
 */
export function isPermissionError(error: Error): boolean {
  const code = (error as any).code || '';
  return /EACCES|EPERM/i.test(code);
}

/**
 * Handle disk full errors
 */
export function isDiskFullError(error: Error): boolean {
  const code = (error as any).code || '';
  return /ENOSPC/i.test(code);
}

/**
 * Handle file not found errors
 */
export function isFileNotFoundError(error: Error): boolean {
  const code = (error as any).code || '';
  return /ENOENT/i.test(code);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: Error): string {
  if (isDiskFullError(error)) {
    return 'Disk is full. Please free up space and try again.';
  }
  
  if (isPermissionError(error)) {
    return 'Permission denied. Please check file permissions.';
  }
  
  if (isConcurrentAccessError(error)) {
    return 'File is busy. Please try again in a moment.';
  }
  
  if (isFileNotFoundError(error)) {
    return 'File not found. It may have been deleted or moved.';
  }
  
  return error.message || 'An unexpected error occurred';
}

/**
 * Safe file size check (prevent memory issues)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validateFileSize(size: number): Result<boolean, StorageError> {
  if (size > MAX_FILE_SIZE) {
    return Err(new StorageError(
      `File too large: ${size} bytes (max: ${MAX_FILE_SIZE} bytes)`,
      'validate'
    ));
  }
  return Ok(true);
}

