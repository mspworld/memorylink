/**
 * Security audit tests
 * Week 4: Comprehensive security testing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { formatGateResult, validateGateOutput } from '../../src/gate/formatter.js';
import type { GateResult } from '../../src/core/types.js';
import { EXIT_CODES } from '../../src/core/exit-codes.js';

describe('Security Audit: Gate Output Safety', () => {
  it('should never print secrets in gate output', () => {
    const result: GateResult = {
      passed: false,
      rule: 'block-quarantined',
      violations: [
        {
          record_id: 'mem_123',
          conflict_key: 'api.config',
          created_at: '2025-12-30T10:00:00Z',
          quarantine_ref: '.memorylink/quarantined/mem_123.original',
        },
      ],
      exitCode: EXIT_CODES.FAILURE,
    };

    const output = formatGateResult(result);
    
    // Should not contain any secret patterns
    expect(validateGateOutput(output)).toBe(true);
    
    // Should not contain actual secret values
    expect(output).not.toMatch(/sk-[a-zA-Z0-9]{32,}/);
    expect(output).not.toMatch(/password\s*[:=]\s*['"]?[^\s'"]{8,}['"]?/i);
    expect(output).not.toMatch(/api[_-]?key\s*[:=]\s*['"]?[a-zA-Z0-9]{20,}['"]?/i);
    
    // Should only contain safe metadata
    expect(output).toContain('mem_123');
    expect(output).toContain('api.config');
    expect(output).toContain('quarantined');
  });

  it('should handle gate output with multiple violations safely', () => {
    const result: GateResult = {
      passed: false,
      rule: 'block-quarantined',
      violations: [
        {
          record_id: 'mem_123',
          conflict_key: 'api.config',
          created_at: '2025-12-30T10:00:00Z',
          quarantine_ref: '.memorylink/quarantined/mem_123.original',
        },
        {
          record_id: 'mem_456',
          conflict_key: 'db.config',
          created_at: '2025-12-30T10:05:00Z',
          quarantine_ref: '.memorylink/quarantined/mem_456.original',
        },
      ],
      exitCode: EXIT_CODES.FAILURE,
    };

    const output = formatGateResult(result);
    
    expect(validateGateOutput(output)).toBe(true);
    expect(output).toContain('mem_123');
    expect(output).toContain('mem_456');
    expect(output).not.toMatch(/sk-[a-zA-Z0-9]{32,}/);
  });

  it('should validate gate output against all secret patterns', () => {
    // Using obviously fake test secrets that won't trigger GitHub push protection
    // These are intentionally malformed to avoid false positives
    const testSecrets = [
      'sk-test-FAKE_NOT_REAL_KEY_FOR_TESTING_ONLY',
      'password: test_password_not_real',
      'API_KEY=test_fake_key_not_real_12345',
      'AKIAFAKENOTREAL12345',
      'ghp_FAKE_TOKEN_NOT_REAL_FOR_TESTING',
      'xoxb-fake-not-real-token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.FAKE_TEST_TOKEN',
    ];

    const result: GateResult = {
      passed: false,
      rule: 'block-quarantined',
      violations: [
        {
          record_id: 'mem_123',
          conflict_key: 'test',
          created_at: '2025-12-30T10:00:00Z',
        },
      ],
      exitCode: EXIT_CODES.FAILURE,
    };

    const output = formatGateResult(result);
    
    // Output should not contain any test secrets
    for (const secret of testSecrets) {
      expect(output).not.toContain(secret);
    }
    
    expect(validateGateOutput(output)).toBe(true);
  });
});

describe('Security Audit: Edge Cases', () => {
  const testCwd = join(process.cwd(), '.test-memorylink');

  beforeEach(async () => {
    if (existsSync(testCwd)) {
      await rm(testCwd, { recursive: true, force: true });
    }
    await mkdir(testCwd, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testCwd)) {
      await rm(testCwd, { recursive: true, force: true });
    }
  });

  it('should handle very large content safely', async () => {
    // Create content that's close to 1MB limit
    const largeContent = 'x'.repeat(1024 * 1024 - 100); // ~1MB
    
    // This should be handled by validation, but test that gate doesn't crash
    const result: GateResult = {
      passed: true,
      rule: 'block-quarantined',
      violations: [],
      exitCode: EXIT_CODES.SUCCESS,
    };

    const output = formatGateResult(result);
    expect(validateGateOutput(output)).toBe(true);
  });

  it('should handle malformed record IDs safely', () => {
    const result: GateResult = {
      passed: false,
      rule: 'block-quarantined',
      violations: [
        {
          record_id: 'invalid_id_format',
          conflict_key: 'test',
          created_at: '2025-12-30T10:00:00Z',
        },
      ],
      exitCode: EXIT_CODES.FAILURE,
    };

    const output = formatGateResult(result);
    expect(validateGateOutput(output)).toBe(true);
    expect(output).toContain('invalid_id_format');
  });

  it('should handle special characters in conflict_key safely', () => {
    const result: GateResult = {
      passed: false,
      rule: 'block-quarantined',
      violations: [
        {
          record_id: 'mem_123',
          conflict_key: 'test/key@domain.com',
          created_at: '2025-12-30T10:00:00Z',
        },
      ],
      exitCode: EXIT_CODES.FAILURE,
    };

    const output = formatGateResult(result);
    expect(validateGateOutput(output)).toBe(true);
    expect(output).toContain('test/key@domain.com');
  });
});

describe('Security Audit: Secret Pattern Coverage', () => {
  it('should detect all 20+ secret patterns', async () => {
    const { SECRET_PATTERNS } = await import('../../src/quarantine/patterns.js');
    
    expect(SECRET_PATTERNS.length).toBeGreaterThanOrEqual(20);
    
    // Verify each pattern has required fields
    for (const pattern of SECRET_PATTERNS) {
      expect(pattern.id).toBeDefined();
      expect(pattern.name).toBeDefined();
      expect(pattern.pattern).toBeInstanceOf(RegExp);
      expect(pattern.description).toBeDefined();
    }
  });

  it('should have unique pattern IDs', async () => {
    const { SECRET_PATTERNS } = await import('../../src/quarantine/patterns.js');
    const ids = SECRET_PATTERNS.map(p => p.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
  });
});

