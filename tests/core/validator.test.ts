/**
 * Tests for input validation
 * Week 1 Day 7: Validation tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateTopic,
  validateContent,
  validateEvidenceLevel,
  validateRecordId,
} from '../../src/core/validator.js';

describe('Input Validation', () => {
  describe('validateTopic', () => {
    it('validates valid topic', () => {
      const result = validateTopic('package_manager');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('package_manager');
      }
    });

    it('rejects empty topic', () => {
      const result = validateTopic('');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('empty');
      }
    });

    it('rejects topic over 200 characters', () => {
      const longTopic = 'a'.repeat(201);
      const result = validateTopic(longTopic);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('200');
      }
    });

    it('normalizes topic', () => {
      const result = validateTopic('Package Manager');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe('package.manager');
      }
    });
  });

  describe('validateContent', () => {
    it('validates valid content', () => {
      const result = validateContent('Use pnpm for packages');
      expect(result.ok).toBe(true);
    });

    it('rejects empty content', () => {
      const result = validateContent('');
      expect(result.ok).toBe(false);
    });

    it('rejects content over 1MB', () => {
      const largeContent = 'a'.repeat(1024 * 1024 + 1);
      const result = validateContent(largeContent);
      expect(result.ok).toBe(false);
    });
  });

  describe('validateEvidenceLevel', () => {
    it('validates E0', () => {
      const result = validateEvidenceLevel('E0');
      expect(result.ok).toBe(true);
    });

    it('validates E1', () => {
      const result = validateEvidenceLevel('E1');
      expect(result.ok).toBe(true);
    });

    it('rejects E2 when allowE2 is false', () => {
      const result = validateEvidenceLevel('E2', false);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('promote');
      }
    });

    it('allows E2 when allowE2 is true', () => {
      const result = validateEvidenceLevel('E2', true);
      expect(result.ok).toBe(true);
    });

    it('rejects invalid level', () => {
      const result = validateEvidenceLevel('E3');
      expect(result.ok).toBe(false);
    });
  });

  describe('validateRecordId', () => {
    it('validates valid record ID', () => {
      const result = validateRecordId('mem_1234567890');
      expect(result.ok).toBe(true);
    });

    it('rejects ID not starting with mem_', () => {
      const result = validateRecordId('record_123');
      expect(result.ok).toBe(false);
    });

    it('rejects ID too short', () => {
      const result = validateRecordId('mem_123');
      expect(result.ok).toBe(false);
    });
  });
});

