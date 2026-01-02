/**
 * Retry mechanism with exponential backoff
 * Production-grade error handling for millions of users
 * Week 4: Self-healing and resilience
 */

import type { Result } from './types.js';
import { Err } from './types.js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryable?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 100, // 100ms
  maxDelay: 5000, // 5 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryable: () => true,
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Add jitter to delay (prevents thundering herd)
 */
function addJitter(delay: number): number {
  const jitter = Math.random() * 0.3 * delay; // Up to 30% jitter
  return delay + jitter;
}

/**
 * Calculate delay for retry attempt
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  let delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  delay = Math.min(delay, options.maxDelay);
  
  if (options.jitter) {
    delay = addJitter(delay);
  }
  
  return Math.floor(delay);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: Error, options: Required<RetryOptions>): boolean {
  // Check custom retryable function
  if (!options.retryable(error)) {
    return false;
  }

  // Common retryable errors
  const retryablePatterns = [
    /ENOENT/i,           // File not found (may be transient)
    /EAGAIN/i,           // Resource temporarily unavailable
    /ETIMEDOUT/i,        // Operation timed out
    /ECONNRESET/i,       // Connection reset
    /ENOTFOUND/i,        // DNS lookup failed
    /EACCES/i,           // Permission denied (may be transient)
    /EBUSY/i,            // Resource busy
    /EMFILE/i,           // Too many open files
    /ENFILE/i,           // Too many open files in system
  ];

  const errorMessage = error.message || '';
  const errorCode = (error as any).code || '';

  return retryablePatterns.some(pattern => 
    pattern.test(errorMessage) || pattern.test(errorCode)
  );
}

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry (must return Promise<Result<T, E>>)
 * @param options - Retry options
 * @returns Result from function or last error
 */
export async function withRetry<T, E extends Error>(
  fn: () => Promise<Result<T, E>>,
  options: RetryOptions = {}
): Promise<Result<T, E>> {
  const opts: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...options };
  let lastError: E | undefined;
  let lastResult: Result<T, E> | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      lastResult = await fn();
      
      // If successful, return immediately
      if (lastResult.ok) {
        return lastResult;
      }

      // If error, check if retryable
      lastError = lastResult.error;
      
      if (attempt < opts.maxRetries && isRetryableError(lastError, opts)) {
        const delay = calculateDelay(attempt, opts);
        await sleep(delay);
        continue; // Retry
      }

      // Not retryable or max retries reached
      return lastResult;
    } catch (error) {
      lastError = error as E;
      
      // If not retryable or max retries, return error
      if (attempt >= opts.maxRetries || !isRetryableError(lastError, opts)) {
        return Err(lastError);
      }

      // Wait before retry
      const delay = calculateDelay(attempt, opts);
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  return lastResult || Err(lastError!);
}

/**
 * Retry options for file operations
 */
export const FILE_OPERATION_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 2000,
  backoffMultiplier: 2,
  jitter: true,
  retryable: (error: Error) => {
    const code = (error as any).code || '';
    // Retry on transient file system errors
    return /EAGAIN|EBUSY|EMFILE|ENFILE|ETIMEDOUT/i.test(code);
  },
};

/**
 * Retry options for network operations (if applicable)
 */
export const NETWORK_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5,
  initialDelay: 200,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  retryable: (error: Error) => {
    const code = (error as any).code || '';
    return /ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN/i.test(code);
  },
};

