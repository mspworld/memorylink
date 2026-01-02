/**
 * Tests for path utilities
 * Week 1 Day 5-6: Storage layer tests
 */

import { describe, it, expect } from 'vitest';
import {
  getMemoryLinkRoot,
  getRecordsPath,
  getRecordPath,
  getQuarantinedPath,
  getQuarantinedFilePath,
  getAuditPath,
  getAuditEventsPath,
  generateScopeId,
  normalizeRepoUrl,
} from '../../src/storage/paths.js';
import type { Scope } from '../../src/core/types.js';

describe('Path Utilities', () => {
  const testCwd = '/test/project';
  const testScope: Scope = {
    type: 'project',
    id: 'test-scope-id',
  };

  describe('getMemoryLinkRoot', () => {
    it('returns .memorylink path', () => {
      const root = getMemoryLinkRoot(testCwd);
      expect(root).toBe('/test/project/.memorylink');
    });
  });

  describe('getRecordsPath', () => {
    it('returns records path for scope', () => {
      const path = getRecordsPath(testCwd, testScope);
      expect(path).toBe('/test/project/.memorylink/records/project/test-scope-id');
    });
  });

  describe('getRecordPath', () => {
    it('returns record file path', () => {
      const path = getRecordPath(testCwd, testScope, 'mem_123');
      expect(path).toBe('/test/project/.memorylink/records/project/test-scope-id/mem_123.json');
    });
  });

  describe('getQuarantinedPath', () => {
    it('returns quarantined directory path', () => {
      const path = getQuarantinedPath(testCwd);
      expect(path).toBe('/test/project/.memorylink/quarantined');
    });
  });

  describe('getQuarantinedFilePath', () => {
    it('returns quarantined file path', () => {
      const path = getQuarantinedFilePath(testCwd, 'mem_456');
      expect(path).toBe('/test/project/.memorylink/quarantined/mem_456.original');
    });
  });

  describe('normalizeRepoUrl', () => {
    it('normalizes repository URL', () => {
      expect(normalizeRepoUrl('https://github.com/user/repo.git')).toBe('github.com/user/repo');
      expect(normalizeRepoUrl('http://github.com/user/repo')).toBe('github.com/user/repo');
      expect(normalizeRepoUrl('https://github.com/USER/REPO.git')).toBe('github.com/user/repo');
    });
  });

  describe('generateScopeId', () => {
    it('generates consistent scope ID', () => {
      const id1 = generateScopeId('https://github.com/user/repo.git');
      const id2 = generateScopeId('https://github.com/user/repo.git');
      expect(id1).toBe(id2);
      expect(id1).toHaveLength(64); // sha256 hex
    });
  });
});

