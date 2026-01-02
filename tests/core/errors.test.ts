/**
 * Tests for error hierarchy
 * Week 1 Day 3-4: Error tests
 */

import { describe, it, expect } from 'vitest';
import {
  MemoryLinkError,
  ValidationError,
  StorageError,
  QuarantineError,
  GateError,
  FileNotFoundError,
  FileReadError,
  FileWriteError,
  EvidenceLevelError,
} from '../../src/core/errors.js';
import { EXIT_CODES } from '../../src/core/exit-codes.js';

describe('Error Hierarchy', () => {
  describe('MemoryLinkError', () => {
    it('creates base error with exit code', () => {
      const error = new MemoryLinkError('Test error', 'TEST_ERROR', EXIT_CODES.ERROR);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.exitCode).toBe(EXIT_CODES.ERROR);
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ValidationError', () => {
    it('creates validation error with field', () => {
      const error = new ValidationError('Topic cannot be empty', 'topic');
      expect(error.message).toBe('Topic cannot be empty');
      expect(error.field).toBe('topic');
      expect(error.exitCode).toBe(EXIT_CODES.FAILURE);
      expect(error).toBeInstanceOf(MemoryLinkError);
    });
  });

  describe('StorageError', () => {
    it('creates storage error with operation', () => {
      const error = new StorageError('Failed to write', 'write');
      expect(error.message).toBe('Failed to write');
      expect(error.operation).toBe('write');
      expect(error.exitCode).toBe(EXIT_CODES.ERROR);
    });
  });

  describe('FileNotFoundError', () => {
    it('creates file not found error', () => {
      const error = new FileNotFoundError('/path/to/file.json');
      expect(error.path).toBe('/path/to/file.json');
      expect(error.message).toContain('File not found');
      expect(error).toBeInstanceOf(StorageError);
    });
  });

  describe('QuarantineError', () => {
    it('creates quarantine error with pattern', () => {
      const error = new QuarantineError('Secret detected', 'api-key-pattern', 'mem_123');
      expect(error.message).toBe('Secret detected');
      expect(error.pattern).toBe('api-key-pattern');
      expect(error.recordId).toBe('mem_123');
      expect(error.exitCode).toBe(EXIT_CODES.FAILURE);
    });
  });

  describe('GateError', () => {
    it('creates gate error with violations', () => {
      const error = new GateError('Gate failed', 3, 'block-quarantined');
      expect(error.message).toBe('Gate failed');
      expect(error.violations).toBe(3);
      expect(error.rule).toBe('block-quarantined');
      expect(error.exitCode).toBe(EXIT_CODES.FAILURE);
    });
  });

  describe('EvidenceLevelError', () => {
    it('creates evidence level error', () => {
      const error = new EvidenceLevelError(
        'Cannot promote to E2',
        'E0',
        'E2'
      );
      expect(error.message).toBe('Cannot promote to E2');
      expect(error.currentLevel).toBe('E0');
      expect(error.targetLevel).toBe('E2');
      expect(error.exitCode).toBe(EXIT_CODES.FAILURE);
    });
  });
});

