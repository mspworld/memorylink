/**
 * Tests for secret detection
 * Week 2 Day 8-9: Secret detection tests
 * Updated for 112 patterns
 */

import { describe, it, expect } from 'vitest';
import { detectSecrets, detectSecretsSafe, shouldQuarantine } from '../../src/quarantine/detector.js';
import { SECRET_PATTERNS } from '../../src/quarantine/patterns.js';

describe('Secret Detection', () => {
  describe('detectSecrets', () => {
    it('detects OpenAI API key', () => {
      const content = 'API_KEY=sk-abc123xyz789012345678901234567890';
      const result = detectSecrets(content);
      expect(result.found).toBe(true);
    });

    it('detects AWS access key', () => {
      const content = 'AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE';
      const result = detectSecrets(content);
      expect(result.found).toBe(true);
    });

    it('detects password', () => {
      const content = 'password: mySecretPassword123';
      const result = detectSecrets(content);
      expect(result.found).toBe(true);
    });

    it('detects private key', () => {
      const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA';
      const result = detectSecrets(content);
      expect(result.found).toBe(true);
      expect(result.pattern?.id).toBe('private-key');
    });

    it('detects database URL', () => {
      const content = 'postgres://user:password@localhost:5432/db';
      const result = detectSecrets(content);
      expect(result.found).toBe(true);
      expect(result.pattern?.id).toBe('db-url');
    });

    it('returns false for safe content', () => {
      const content = 'Use pnpm for package management';
      const result = detectSecrets(content);
      expect(result.found).toBe(false);
    });

    it('handles empty content', () => {
      const result = detectSecrets('');
      expect(result.found).toBe(false);
    });
  });

  describe('shouldQuarantine', () => {
    it('returns true for content with secrets', () => {
      expect(shouldQuarantine('password: mySecretPassword123')).toBe(true);
    });

    it('returns false for safe content', () => {
      expect(shouldQuarantine('Use pnpm')).toBe(false);
    });
  });

  describe('detectSecretsSafe', () => {
    it('returns Err for secret detected', () => {
      const result = detectSecretsSafe('password: mySecretPassword123');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.pattern).toBeDefined();
      }
    });

    it('returns Ok for safe content', () => {
      const result = detectSecretsSafe('Use pnpm');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.found).toBe(false);
      }
    });
  });

  describe('Pattern Coverage', () => {
    it('has 112+ secret patterns', () => {
      expect(SECRET_PATTERNS.length).toBeGreaterThanOrEqual(112);
    });

    it('all patterns have required fields', () => {
      SECRET_PATTERNS.forEach(pattern => {
        expect(pattern.id).toBeDefined();
        expect(pattern.name).toBeDefined();
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(pattern.description).toBeDefined();
      });
    });
  });
});
