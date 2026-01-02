/**
 * Tests for key-value based secret detection
 * Tests the truly dynamic detection that catches ANY key name
 */

import { describe, it, expect } from 'vitest';
import {
  isSecretKey,
  looksLikeSecret,
  detectKeyValueSecrets,
  createKeyValuePattern,
} from '../../src/quarantine/keyvalue.js';

describe('Key-Value Secret Detection', () => {
  describe('isSecretKey', () => {
    it('detects secret-indicating key names', () => {
      expect(isSecretKey('API_KEY')).toBe(true);
      expect(isSecretKey('MY_SECRET')).toBe(true);
      expect(isSecretKey('PASSWORD')).toBe(true);
      expect(isSecretKey('TOKEN')).toBe(true);
      expect(isSecretKey('CREDENTIAL')).toBe(true);
      expect(isSecretKey('AUTH_KEY')).toBe(true);
      expect(isSecretKey('PRIVATE_KEY')).toBe(true);
      expect(isSecretKey('CLIENT_SECRET')).toBe(true);
    });

    it('does not detect normal key names', () => {
      expect(isSecretKey('DATABASE_URL')).toBe(false);
      expect(isSecretKey('PORT')).toBe(false);
      expect(isSecretKey('HOST')).toBe(false);
      expect(isSecretKey('DEBUG')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isSecretKey('api_key')).toBe(true);
      expect(isSecretKey('Api_Key')).toBe(true);
      expect(isSecretKey('API_key')).toBe(true);
    });
  });

  describe('looksLikeSecret', () => {
    it('detects long alphanumeric strings', () => {
      expect(looksLikeSecret('abc123xyz789def456ghi012jkl345mno678pqr901')).toBe(true);
      expect(looksLikeSecret('abcdefghijklmnopqrstuvwxyz12345678901234567890')).toBe(true);
    });

    it('detects Base64-like strings', () => {
      expect(looksLikeSecret('SGVsbG9Xb3JsZFRoaXNJc0FMYW5nU3RyaW5nV2l0aEJhc2U2NA==')).toBe(true);
    });

    it('detects hex strings', () => {
      expect(looksLikeSecret('abcdef1234567890abcdef1234567890abcdef12')).toBe(true);
    });

    it('detects keys with common prefixes', () => {
      expect(looksLikeSecret('sk-proj-abc123xyz789def456ghi012jkl345')).toBe(true);
      expect(looksLikeSecret('api-key-abc123xyz789def456ghi012jkl345')).toBe(true);
      expect(looksLikeSecret('token-abc123xyz789def456ghi012jkl345')).toBe(true);
    });

    it('does not detect short values', () => {
      expect(looksLikeSecret('short')).toBe(false);
      expect(looksLikeSecret('abc123')).toBe(false);
      expect(looksLikeSecret('normal_value')).toBe(false);
    });

    it('handles quoted values', () => {
      expect(looksLikeSecret('"abc123xyz789def456ghi012jkl345mno678"')).toBe(true);
      expect(looksLikeSecret("'abc123xyz789def456ghi012jkl345mno678'")).toBe(true);
    });
  });

  describe('detectKeyValueSecrets', () => {
    it('detects secrets in KEY=value format', () => {
      const result = detectKeyValueSecrets('MY_SECRET=abc123xyz789def456ghi012jkl345mno678');
      expect(result.found).toBe(true);
      expect(result.key).toBe('MY_SECRET');
    });

    it('detects secrets in KEY: value format', () => {
      const result = detectKeyValueSecrets('API_KEY: abc123xyz789def456ghi012jkl345mno678');
      expect(result.found).toBe(true);
      expect(result.key).toBe('API_KEY');
    });

    it('detects secrets with quoted values', () => {
      const result = detectKeyValueSecrets('TOKEN="abc123xyz789def456ghi012jkl345mno678"');
      expect(result.found).toBe(true);
      expect(result.key).toBe('TOKEN');
    });

    it('detects unknown key names with secret-like values', () => {
      const result = detectKeyValueSecrets('UNKNOWN_KEY=sk-proj-abc123xyz789def456ghi012jkl345');
      expect(result.found).toBe(true);
      expect(result.key).toBe('UNKNOWN_KEY');
    });

    it('detects long secret-like values regardless of key name', () => {
      const result = detectKeyValueSecrets('CUSTOM=abcdefghijklmnopqrstuvwxyz12345678901234567890');
      expect(result.found).toBe(true);
      expect(result.key).toBe('CUSTOM');
    });

    it('does not detect normal key-value pairs', () => {
      const result = detectKeyValueSecrets('PORT=3000');
      expect(result.found).toBe(false);
    });

    it('does not detect short values', () => {
      const result = detectKeyValueSecrets('DEBUG=true');
      expect(result.found).toBe(false);
    });

    it('handles multiple key-value pairs', () => {
      const content = 'PORT=3000\nMY_SECRET=abc123xyz789def456ghi012jkl345mno678\nDEBUG=true';
      const result = detectKeyValueSecrets(content);
      expect(result.found).toBe(true);
      expect(result.key).toBe('MY_SECRET');
    });
  });

  describe('createKeyValuePattern', () => {
    it('creates a valid pattern', () => {
      const pattern = createKeyValuePattern();
      expect(pattern.id).toBe('key-value-dynamic');
      expect(pattern.name).toBe('Key-Value Secret (Dynamic)');
      expect(pattern.pattern).toBeInstanceOf(RegExp);
    });
  });
});

