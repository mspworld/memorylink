/**
 * Tests for validation utilities
 * Phase 1: Luhn checksum, SSN validation, entropy calculation
 */

import { describe, it, expect } from 'vitest';
import {
  validateLuhnChecksum,
  validateSSN,
  calculateEntropy,
  hasHighEntropy,
  isBase64Encoded,
  isHexEncoded,
  isObfuscatedSecret,
} from '../../src/quarantine/validation.js';

describe('validateLuhnChecksum', () => {
  it('should validate valid credit card numbers', () => {
    // Valid Visa test card
    expect(validateLuhnChecksum('4111111111111111')).toBe(true);
    // Valid Mastercard test card
    expect(validateLuhnChecksum('5555555555554444')).toBe(true);
    // Valid Amex test card
    expect(validateLuhnChecksum('378282246310005')).toBe(true);
  });

  it('should reject invalid credit card numbers', () => {
    // Invalid checksum
    expect(validateLuhnChecksum('4111111111111112')).toBe(false);
    // Too short
    expect(validateLuhnChecksum('411111111111')).toBe(false);
    // Too long
    expect(validateLuhnChecksum('41111111111111111111')).toBe(false);
    // All zeros
    expect(validateLuhnChecksum('0000000000000000')).toBe(false);
  });

  it('should handle formatted card numbers', () => {
    // With spaces
    expect(validateLuhnChecksum('4111 1111 1111 1111')).toBe(true);
    // With dashes
    expect(validateLuhnChecksum('4111-1111-1111-1111')).toBe(true);
  });
});

describe('validateSSN', () => {
  it('should validate valid SSNs', () => {
    // Valid SSN
    expect(validateSSN('123-45-6789')).toBe(true);
    expect(validateSSN('123456789')).toBe(true);
    expect(validateSSN('123 45 6789')).toBe(true);
  });

  it('should reject invalid SSN ranges', () => {
    // All zeros (000-xx-xxxx)
    expect(validateSSN('000-12-3456')).toBe(false);
    expect(validateSSN('000123456')).toBe(false);
    
    // Devil's number (666-xx-xxxx)
    expect(validateSSN('666-12-3456')).toBe(false);
    expect(validateSSN('666123456')).toBe(false);
    
    // Invalid range (900-99-9999 and above)
    expect(validateSSN('900-12-3456')).toBe(false);
    expect(validateSSN('999-12-3456')).toBe(false);
  });

  it('should reject invalid SSN formats', () => {
    // Wrong length
    expect(validateSSN('123-45-678')).toBe(false);
    expect(validateSSN('12345678')).toBe(false);
    
    // Group 00
    expect(validateSSN('123-00-4567')).toBe(false);
    
    // Serial 0000
    expect(validateSSN('123-45-0000')).toBe(false);
  });
});

describe('calculateEntropy', () => {
  it('should calculate entropy correctly', () => {
    // High entropy (random string)
    const random = 'aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5z';
    const entropy = calculateEntropy(random);
    expect(entropy).toBeGreaterThan(4.0);
    
    // Low entropy (repeating pattern)
    const repeating = 'aaaaaaaaaaaaaaaa';
    const lowEntropy = calculateEntropy(repeating);
    expect(lowEntropy).toBeLessThan(1.0);
  });

  it('should return 0 for empty string', () => {
    expect(calculateEntropy('')).toBe(0);
  });
});

describe('hasHighEntropy', () => {
  it('should detect high entropy strings', () => {
    // Random secret-like string
    const secret = 'sk-proj-abc123def456ghi789jkl012mno345pqr678';
    expect(hasHighEntropy(secret, 3.5)).toBe(true);
  });

  it('should reject low entropy strings', () => {
    // Repeating pattern
    const repeating = 'aaaaaaaaaaaaaaaa';
    expect(hasHighEntropy(repeating, 3.5)).toBe(false);
  });
});

describe('isBase64Encoded', () => {
  it('should detect base64 encoded strings', () => {
    // Valid base64
    expect(isBase64Encoded('dGVzdCBzdHJpbmc=')).toBe(true);
    expect(isBase64Encoded('YWJjZGVmZ2hpams=')).toBe(true);
  });

  it('should reject invalid base64', () => {
    // Invalid characters
    expect(isBase64Encoded('test@string#')).toBe(false);
    // Too short
    expect(isBase64Encoded('abc')).toBe(false);
  });
});

describe('isHexEncoded', () => {
  it('should detect hex encoded strings', () => {
    // Valid hex
    expect(isHexEncoded('deadbeef1234567890abcdef')).toBe(true);
    expect(isHexEncoded('0123456789abcdef')).toBe(true);
  });

  it('should reject invalid hex', () => {
    // Invalid characters
    expect(isHexEncoded('deadbeefg')).toBe(false);
    // Odd length
    expect(isHexEncoded('deadbeef1')).toBe(false);
    // Too short
    expect(isHexEncoded('abc')).toBe(false);
  });
});

describe('isObfuscatedSecret', () => {
  it('should detect obfuscated secrets', () => {
    // Base64 encoded secret
    expect(isObfuscatedSecret('dGVzdCBzdHJpbmcgd2l0aCBoaWdoIGVudHJvcHk=')).toBe(true);
    // Hex encoded secret
    expect(isObfuscatedSecret('deadbeef1234567890abcdef1234567890abcdef')).toBe(true);
    // High entropy random string
    expect(isObfuscatedSecret('aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1')).toBe(true);
  });

  it('should reject low entropy strings', () => {
    // Repeating pattern
    expect(isObfuscatedSecret('aaaaaaaaaaaaaaaa')).toBe(false);
    // Common word
    expect(isObfuscatedSecret('password12345678')).toBe(false);
  });
});

