/**
 * Tests for resilience utilities
 * Week 4: Production-grade error handling
 */

import { describe, it, expect } from 'vitest';
import {
  ensureDirectory,
  validateJsonFile,
  validateFileSize,
  getUserFriendlyError,
  isDiskFullError,
  isPermissionError,
  isConcurrentAccessError,
  isFileNotFoundError,
  MAX_FILE_SIZE,
} from '../../src/core/resilience.js';
import { StorageError } from '../../src/core/errors.js';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Resilience Utilities', () => {
  const testDir = join(process.cwd(), '.test-resilience');

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  describe('ensureDirectory', () => {
    it('should create directory if it does not exist', async () => {
      const dirPath = join(testDir, 'new-dir');
      const result = await ensureDirectory(dirPath);
      
      expect(result.ok).toBe(true);
      expect(existsSync(dirPath)).toBe(true);
    });

    it('should succeed if directory already exists', async () => {
      const dirPath = join(testDir, 'existing-dir');
      await mkdir(dirPath, { recursive: true });
      
      const result = await ensureDirectory(dirPath);
      
      expect(result.ok).toBe(true);
    });
  });

  describe('validateJsonFile', () => {
    it('should validate valid JSON', () => {
      const validJson = '{"key": "value"}';
      const result = validateJsonFile(validJson);
      
      expect(result.ok).toBe(true);
    });

    it('should reject invalid JSON', () => {
      const invalidJson = '{key: value}';
      const result = validateJsonFile(invalidJson);
      
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('Corrupted JSON');
      }
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within limit', () => {
      const result = validateFileSize(MAX_FILE_SIZE - 1);
      expect(result.ok).toBe(true);
    });

    it('should reject files exceeding limit', () => {
      const result = validateFileSize(MAX_FILE_SIZE + 1);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('too large');
      }
    });
  });

  describe('Error Detection', () => {
    it('should detect disk full errors', () => {
      const error = new Error('ENOSPC: No space left on device');
      (error as any).code = 'ENOSPC';
      
      expect(isDiskFullError(error)).toBe(true);
    });

    it('should detect permission errors', () => {
      const error = new Error('EACCES: Permission denied');
      (error as any).code = 'EACCES';
      
      expect(isPermissionError(error)).toBe(true);
    });

    it('should detect concurrent access errors', () => {
      const error = new Error('EBUSY: Resource busy');
      (error as any).code = 'EBUSY';
      
      expect(isConcurrentAccessError(error)).toBe(true);
    });

    it('should detect file not found errors', () => {
      const error = new Error('ENOENT: No such file or directory');
      (error as any).code = 'ENOENT';
      
      expect(isFileNotFoundError(error)).toBe(true);
    });
  });

  describe('getUserFriendlyError', () => {
    it('should provide friendly message for disk full', () => {
      const error = new Error('ENOSPC');
      (error as any).code = 'ENOSPC';
      
      const message = getUserFriendlyError(error);
      expect(message).toContain('Disk is full');
    });

    it('should provide friendly message for permission denied', () => {
      const error = new Error('EACCES');
      (error as any).code = 'EACCES';
      
      const message = getUserFriendlyError(error);
      expect(message).toContain('Permission denied');
    });

    it('should fall back to original message for unknown errors', () => {
      const error = new Error('Custom error message');
      const message = getUserFriendlyError(error);
      expect(message).toBe('Custom error message');
    });
  });
});

