/**
 * Tests for retry mechanism
 * Week 4: Self-healing and resilience
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, FILE_OPERATION_RETRY_OPTIONS } from '../../src/core/retry.js';
import { Ok, Err } from '../../src/core/types.js';
import { StorageError } from '../../src/core/errors.js';

describe('Retry Mechanism', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const fn = vi.fn(() => Promise.resolve(Ok('success')));
    
    const result = await withRetry(fn);
    
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('success');
    }
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on transient errors', async () => {
    let attempts = 0;
    const fn = vi.fn(() => {
      attempts++;
      if (attempts < 3) {
        const error = new Error('EAGAIN: Resource temporarily unavailable');
        (error as any).code = 'EAGAIN';
        return Promise.resolve(Err(error as StorageError));
      }
      return Promise.resolve(Ok('success'));
    });
    
    const resultPromise = withRetry(fn, { maxRetries: 3, initialDelay: 10 });
    
    // Fast-forward timers
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    
    expect(result.ok).toBe(true);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = vi.fn(() => {
      const error = new Error('Invalid input');
      return Promise.resolve(Err(error as StorageError));
    });
    
    const result = await withRetry(fn, {
      maxRetries: 3,
      retryable: () => false,
    });
    
    expect(result.ok).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should respect max retries', async () => {
    const fn = vi.fn(() => {
      const error = new Error('EAGAIN: Resource temporarily unavailable');
      (error as any).code = 'EAGAIN';
      return Promise.resolve(Err(error as StorageError));
    });
    
    const resultPromise = withRetry(fn, { maxRetries: 2, initialDelay: 10 });
    
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    
    expect(result.ok).toBe(false);
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const delays: number[] = [];
    const originalSetTimeout = global.setTimeout;
    
    global.setTimeout = vi.fn((fn: Function, delay: number) => {
      delays.push(delay);
      return originalSetTimeout(fn, delay);
    }) as any;
    
    let attempts = 0;
    const fn = vi.fn(() => {
      attempts++;
      if (attempts < 3) {
        const error = new Error('EAGAIN');
        (error as any).code = 'EAGAIN';
        return Promise.resolve(Err(error as StorageError));
      }
      return Promise.resolve(Ok('success'));
    });
    
    const resultPromise = withRetry(fn, {
      maxRetries: 3,
      initialDelay: 100,
      backoffMultiplier: 2,
      jitter: false,
    });
    
    await vi.advanceTimersByTimeAsync(1000);
    
    const result = await resultPromise;
    
    expect(result.ok).toBe(true);
    // First retry: 100ms, second retry: 200ms
    expect(delays.length).toBeGreaterThanOrEqual(2);
    if (delays.length >= 2) {
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[1]).toBeGreaterThanOrEqual(200);
    }
    
    global.setTimeout = originalSetTimeout;
  });
});

