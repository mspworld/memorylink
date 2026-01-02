/**
 * File Locking System
 * Prevents race conditions when multiple processes access the same files
 * Based on 8 AI expert feedback
 */

import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Lock file options
 */
interface LockOptions {
  /** Maximum wait time in milliseconds (default: 5000) */
  timeout?: number;
  /** Retry interval in milliseconds (default: 100) */
  retryInterval?: number;
  /** Stale lock threshold in milliseconds (default: 30000) */
  staleThreshold?: number;
}

/**
 * Lock state
 */
interface LockState {
  pid: number;
  timestamp: number;
  hostname: string;
}

const DEFAULT_OPTIONS: Required<LockOptions> = {
  timeout: 5000,
  retryInterval: 100,
  staleThreshold: 30000,
};

/**
 * Get lock file path for a given file
 */
function getLockPath(filePath: string): string {
  const dir = dirname(filePath);
  const lockDir = join(dir, '.locks');
  const fileName = filePath.split(/[/\\]/).pop() || 'file';
  return join(lockDir, `${fileName}.lock`);
}

/**
 * Create lock state
 */
function createLockState(): LockState {
  return {
    pid: process.pid,
    timestamp: Date.now(),
    hostname: require('os').hostname(),
  };
}

/**
 * Check if lock is stale
 */
async function isLockStale(lockPath: string, staleThreshold: number): Promise<boolean> {
  try {
    if (!existsSync(lockPath)) {
      return true;
    }
    
    const content = await readFile(lockPath, 'utf-8');
    const lockState: LockState = JSON.parse(content);
    
    // Check if lock is older than threshold
    const age = Date.now() - lockState.timestamp;
    if (age > staleThreshold) {
      return true;
    }
    
    // Check if process is still running (only works on same machine)
    if (lockState.hostname === require('os').hostname()) {
      try {
        process.kill(lockState.pid, 0);
        return false; // Process is still running
      } catch {
        return true; // Process is dead
      }
    }
    
    return false;
  } catch {
    return true; // Assume stale if we can't read it
  }
}

/**
 * Acquire a file lock
 */
export async function acquireLock(
  filePath: string,
  options: LockOptions = {}
): Promise<{ acquired: boolean; release: () => Promise<void> }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lockPath = getLockPath(filePath);
  const lockDir = dirname(lockPath);
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < opts.timeout) {
    try {
      // Ensure lock directory exists
      if (!existsSync(lockDir)) {
        await mkdir(lockDir, { recursive: true });
      }
      
      // Check for stale lock
      if (existsSync(lockPath) && await isLockStale(lockPath, opts.staleThreshold)) {
        await unlink(lockPath);
      }
      
      // Try to create lock file
      if (!existsSync(lockPath)) {
        const lockState = createLockState();
        await writeFile(lockPath, JSON.stringify(lockState), { flag: 'wx' });
        
        // Return release function
        return {
          acquired: true,
          release: async () => {
            try {
              // Verify we still own the lock
              const content = await readFile(lockPath, 'utf-8');
              const state: LockState = JSON.parse(content);
              if (state.pid === process.pid) {
                await unlink(lockPath);
              }
            } catch {
              // Lock file already removed or not ours
            }
          },
        };
      }
    } catch (error: any) {
      if (error.code !== 'EEXIST') {
        // Unexpected error
        console.error(`Lock error: ${error.message}`);
      }
    }
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, opts.retryInterval));
  }
  
  // Timeout - could not acquire lock
  return {
    acquired: false,
    release: async () => {},
  };
}

/**
 * Execute a function with file lock
 */
export async function withFileLock<T>(
  filePath: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<{ success: boolean; result?: T; error?: string }> {
  const lock = await acquireLock(filePath, options);
  
  if (!lock.acquired) {
    return {
      success: false,
      error: `Could not acquire lock for ${filePath} within timeout`,
    };
  }
  
  try {
    const result = await fn();
    return { success: true, result };
  } catch (error: any) {
    return { success: false, error: error.message };
  } finally {
    await lock.release();
  }
}

/**
 * Atomic JSON write with locking
 */
export async function atomicWriteJsonLocked<T>(
  filePath: string,
  data: T,
  options: LockOptions = {}
): Promise<{ success: boolean; error?: string }> {
  return withFileLock(filePath, async () => {
    // Ensure directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    
    // Write to temp file first
    const tempPath = `${filePath}.tmp.${process.pid}`;
    await writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Rename to target (atomic on most filesystems)
    const { rename } = await import('fs/promises');
    await rename(tempPath, filePath);
  }, options);
}

/**
 * Atomic read JSON with locking
 */
export async function atomicReadJsonLocked<T>(
  filePath: string,
  options: LockOptions = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const result = await withFileLock(filePath, async () => {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }, options);
  
  if (result.success) {
    return { success: true, data: result.result };
  }
  return { success: false, error: result.error };
}

/**
 * Clean up stale locks in a directory
 */
export async function cleanupStaleLocks(
  dirPath: string,
  staleThreshold: number = DEFAULT_OPTIONS.staleThreshold
): Promise<number> {
  const lockDir = join(dirPath, '.locks');
  
  if (!existsSync(lockDir)) {
    return 0;
  }
  
  let cleaned = 0;
  
  try {
    const { readdir } = await import('fs/promises');
    const files = await readdir(lockDir);
    
    for (const file of files) {
      if (file.endsWith('.lock')) {
        const lockPath = join(lockDir, file);
        if (await isLockStale(lockPath, staleThreshold)) {
          try {
            await unlink(lockPath);
            cleaned++;
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }
  
  return cleaned;
}

