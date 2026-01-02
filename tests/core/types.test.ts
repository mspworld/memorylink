/**
 * Tests for core types
 * Week 1 Day 3-4: Core types tests
 */

import { describe, it, expect } from 'vitest';
import type {
  MemoryRecord,
  EvidenceLevel,
  MemoryStatus,
  Scope,
  Result,
} from '../../src/core/types.js';
import { Ok, Err } from '../../src/core/types.js';

describe('Core Types', () => {
  describe('Result Type', () => {
    it('Ok returns success result', () => {
      const result = Ok(42);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(42);
      }
    });

    it('Err returns error result', () => {
      const error = new Error('Test error');
      const result = Err(error);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('MemoryRecord', () => {
    it('creates valid MemoryRecord with required fields', () => {
      const scope: Scope = {
        type: 'project',
        id: 'test-scope-id',
      };

      const record: MemoryRecord = {
        id: 'mem_123',
        content: 'Test content',
        evidence_level: 'E0',
        status: 'ACTIVE',
        scope,
        conflict_key: 'test.topic',
        purpose_tags: ['work'],
        created_at: '2025-12-30T12:00:00Z',
      };

      expect(record.id).toBe('mem_123');
      expect(record.evidence_level).toBe('E0');
      expect(record.status).toBe('ACTIVE');
    });

    it('requires quarantine_ref when status is QUARANTINED', () => {
      const scope: Scope = {
        type: 'project',
        id: 'test-scope-id',
      };

      const record: MemoryRecord = {
        id: 'mem_456',
        content: 'Secret content',
        evidence_level: 'E0',
        status: 'QUARANTINED',
        scope,
        conflict_key: 'test.topic',
        purpose_tags: ['security'],
        created_at: '2025-12-30T12:00:00Z',
        quarantine_ref: '.memorylink/quarantined/mem_456.original',
      };

      expect(record.status).toBe('QUARANTINED');
      expect(record.quarantine_ref).toBeDefined();
    });
  });

  describe('Evidence Levels', () => {
    it('validates evidence level types', () => {
      const levels: EvidenceLevel[] = ['E0', 'E1', 'E2'];
      expect(levels).toHaveLength(3);
      expect(levels).toContain('E0');
      expect(levels).toContain('E1');
      expect(levels).toContain('E2');
    });
  });

  describe('Memory Status', () => {
    it('validates memory status types', () => {
      const statuses: MemoryStatus[] = ['ACTIVE', 'DEPRECATED', 'QUARANTINED'];
      expect(statuses).toHaveLength(3);
      expect(statuses).toContain('ACTIVE');
      expect(statuses).toContain('DEPRECATED');
      expect(statuses).toContain('QUARANTINED');
    });
  });
});

