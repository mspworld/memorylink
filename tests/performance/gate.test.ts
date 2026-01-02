/**
 * Performance tests for gate command
 * Week 4: Performance profiling - verify gate < 100ms
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { checkBlockQuarantined } from '../../src/gate/rules/block-quarantined.js';
import { saveRecord } from '../../src/storage/local.js';
import { generateScopeId } from '../../src/storage/paths.js';
import type { MemoryRecord, Scope } from '../../src/core/types.js';
import { generateRecordId } from '../../src/core/id.js';

describe('Performance: Gate Command', () => {
  const testCwd = join(process.cwd(), '.test-memorylink');
  const scope: Scope = {
    type: 'project',
    id: generateScopeId('https://github.com/test/repo'),
  };

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

  it('should complete gate check in < 100ms with 10 records', async () => {
    // Create 10 active records
    for (let i = 0; i < 10; i++) {
      const record: MemoryRecord = {
        id: generateRecordId(),
        content: `Test content ${i}`,
        evidence_level: 'E0',
        status: 'ACTIVE',
        scope,
        conflict_key: `test.${i}`,
        purpose_tags: ['test'],
        created_at: new Date().toISOString(),
      };
      await saveRecord(testCwd, scope, record);
    }

    const startTime = performance.now();
    const result = await checkBlockQuarantined(testCwd, scope);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result.passed).toBe(true);
    expect(duration).toBeLessThan(100); // < 100ms requirement
  });

  it('should complete gate check in < 100ms with 100 records', async () => {
    // Create 100 active records
    for (let i = 0; i < 100; i++) {
      const record: MemoryRecord = {
        id: generateRecordId(),
        content: `Test content ${i}`,
        evidence_level: 'E0',
        status: 'ACTIVE',
        scope,
        conflict_key: `test.${i}`,
        purpose_tags: ['test'],
        created_at: new Date().toISOString(),
      };
      await saveRecord(testCwd, scope, record);
    }

    const startTime = performance.now();
    const result = await checkBlockQuarantined(testCwd, scope);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result.passed).toBe(true);
    expect(duration).toBeLessThan(100); // < 100ms requirement
  });

  it('should complete gate check in < 100ms with 1 quarantined record', async () => {
    // Create 10 active records
    for (let i = 0; i < 10; i++) {
      const record: MemoryRecord = {
        id: generateRecordId(),
        content: `Test content ${i}`,
        evidence_level: 'E0',
        status: 'ACTIVE',
        scope,
        conflict_key: `test.${i}`,
        purpose_tags: ['test'],
        created_at: new Date().toISOString(),
      };
      await saveRecord(testCwd, scope, record);
    }

    // Create 1 quarantined record
    const quarantinedRecord: MemoryRecord = {
      id: generateRecordId(),
      content: 'API_KEY=sk-prod-abc123xyz789',
      evidence_level: 'E0',
      status: 'QUARANTINED',
      scope,
      conflict_key: 'api.config',
      purpose_tags: ['test'],
      created_at: new Date().toISOString(),
      quarantine_ref: '.memorylink/quarantined/test.original',
    };
    await saveRecord(testCwd, scope, quarantinedRecord);

    const startTime = performance.now();
    const result = await checkBlockQuarantined(testCwd, scope);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result.passed).toBe(false);
    expect(result.violations.length).toBe(1);
    expect(duration).toBeLessThan(100); // < 100ms requirement
  });

  it('should handle empty scope efficiently', async () => {
    const startTime = performance.now();
    const result = await checkBlockQuarantined(testCwd, scope);
    const endTime = performance.now();
    const duration = endTime - startTime;

    expect(result.passed).toBe(true);
    expect(duration).toBeLessThan(50); // Should be very fast for empty scope
  });
});

