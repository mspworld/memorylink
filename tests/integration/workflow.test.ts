/**
 * Integration tests for MemoryLink workflows
 * Week 4: Final testing - End-to-end workflows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { captureMemory } from '../../src/cli/commands/capture.js';
import { queryMemory } from '../../src/cli/commands/query.js';
import { promoteMemory } from '../../src/cli/commands/promote.js';
import { runGate } from '../../src/cli/commands/gate.js';
import { readAuditEvents } from '../../src/audit/logger.js';
import { listRecordIds, loadRecord } from '../../src/storage/local.js';
import { generateScopeId } from '../../src/storage/paths.js';

describe('Integration: Complete Workflow', () => {
  const testCwd = join(process.cwd(), '.test-memorylink');
  const scopeId = generateScopeId('https://github.com/test/repo');

  beforeEach(async () => {
    // Clean test directory
    if (existsSync(testCwd)) {
      await rm(testCwd, { recursive: true, force: true });
    }
    await mkdir(testCwd, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup
    if (existsSync(testCwd)) {
      await rm(testCwd, { recursive: true, force: true });
    }
  });

  it('should complete full capture → query → promote → audit workflow', async () => {
    // Step 1: Capture
    const captureResult = await captureMemory(testCwd, {
      topic: 'package_manager',
      content: 'Use pnpm for package management',
      evidence: 'E1',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(captureResult.ok).toBe(true);
    if (!captureResult.ok) return;

    const recordId = captureResult.value.id;
    expect(recordId).toMatch(/^mem_/);
    expect(captureResult.value.evidence_level).toBe('E1');
    expect(captureResult.value.status).toBe('ACTIVE');

    // Step 2: Query
    const queryResult = await queryMemory(testCwd, {
      topic: 'package_manager',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(queryResult.ok).toBe(true);
    if (!queryResult.ok) return;

    expect(queryResult.value).not.toBeNull();
    if (queryResult.value) {
      expect(queryResult.value.id).toBe(recordId);
      expect(queryResult.value.content).toBe('Use pnpm for package management');
    }

    // Step 3: Promote
    const promoteResult = await promoteMemory(testCwd, {
      recordId,
      to: 'E2',
      reason: 'Team verified in 5 PRs',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(promoteResult.ok).toBe(true);
    if (!promoteResult.ok) return;

    expect(promoteResult.value.evidence_level).toBe('E2');

    // Step 4: Verify in audit
    const auditEvents = await readAuditEvents(testCwd);
    expect(auditEvents.length).toBeGreaterThanOrEqual(2); // CAPTURE + PROMOTE

    const captureEvent = auditEvents.find(e => e.event_type === 'CAPTURE');
    expect(captureEvent).toBeDefined();

    const promoteEvent = auditEvents.find(e => e.event_type === 'PROMOTE');
    expect(promoteEvent).toBeDefined();
  });

  it('should handle quarantine workflow', async () => {
    // Capture with secret
    const captureResult = await captureMemory(testCwd, {
      topic: 'api_config',
      content: 'API_KEY=sk-prod-abc123xyz789def456ghi012jkl345mno678pqr901',
      evidence: 'E0',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(captureResult.ok).toBe(true);
    if (!captureResult.ok) return;

    const recordId = captureResult.value.id;
    expect(captureResult.value.status).toBe('QUARANTINED');
    expect(captureResult.value.quarantine_ref).toBeDefined();

    // Query should return nothing (quarantined excluded)
    const queryResult = await queryMemory(testCwd, {
      topic: 'api_config',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(queryResult.ok).toBe(true);
    if (!queryResult.ok) return;
    expect(queryResult.value).toBeNull(); // Quarantined excluded

    // Gate should fail
    const gateResult = await runGate(testCwd, {
      rule: 'block-quarantined',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(gateResult.passed).toBe(false);
    expect(gateResult.violations.length).toBeGreaterThan(0);
    expect(gateResult.violations[0].record_id).toBe(recordId);
  });

  it('should resolve conflicts correctly', async () => {
    // Create conflicting memories
    const result1 = await captureMemory(testCwd, {
      topic: 'deployment',
      content: 'Use npm for deployments',
      evidence: 'E0',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(result1.ok).toBe(true);
    if (!result1.ok) return;

    const result2 = await captureMemory(testCwd, {
      topic: 'deployment',
      content: 'Use pnpm for deployments',
      evidence: 'E1',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(result2.ok).toBe(true);
    if (!result2.ok) return;

    // Promote second to E2
    const promoteResult = await promoteMemory(testCwd, {
      recordId: result2.value.id,
      to: 'E2',
      reason: 'Verified',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(promoteResult.ok).toBe(true);

    // Query should return E2 (highest evidence)
    const queryResult = await queryMemory(testCwd, {
      topic: 'deployment',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(queryResult.ok).toBe(true);
    if (!queryResult.ok) return;

    expect(queryResult.value).not.toBeNull();
    if (queryResult.value) {
      expect(queryResult.value.evidence_level).toBe('E2');
      expect(queryResult.value.content).toBe('Use pnpm for deployments');
      expect(queryResult.value.id).toBe(result2.value.id);
    }
  });

  it('should handle multiple scopes independently', async () => {
    // Capture in project scope
    const projectResult = await captureMemory(testCwd, {
      topic: 'config',
      content: 'Project config',
      evidence: 'E1',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(projectResult.ok).toBe(true);

    // Capture in user scope
    const userResult = await captureMemory(testCwd, {
      topic: 'config',
      content: 'User config',
      evidence: 'E1',
      scopeType: 'user',
      repoUrl: 'https://github.com/test/user',
    });

    expect(userResult.ok).toBe(true);

    // Query project scope
    const projectQuery = await queryMemory(testCwd, {
      topic: 'config',
      scopeType: 'project',
      repoUrl: 'https://github.com/test/repo',
    });

    expect(projectQuery.ok).toBe(true);
    if (projectQuery.value) {
      expect(projectQuery.value.content).toBe('Project config');
    }

    // Query user scope
    const userQuery = await queryMemory(testCwd, {
      topic: 'config',
      scopeType: 'user',
      repoUrl: 'https://github.com/test/user',
    });

    expect(userQuery.ok).toBe(true);
    if (userQuery.value) {
      expect(userQuery.value.content).toBe('User config');
    }
  });
});

describe('Integration: Error Handling', () => {
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

  it('should handle invalid evidence level in capture', async () => {
    const result = await captureMemory(testCwd, {
      topic: 'test',
      content: 'Test content',
      evidence: 'E2', // E2 not allowed in capture
      scopeType: 'project',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Cannot create E2 via capture');
    }
  });

  it('should handle promotion of non-existent record', async () => {
    const result = await promoteMemory(testCwd, {
      recordId: 'mem_nonexistent',
      to: 'E2',
      reason: 'Test',
      scopeType: 'project',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('not found');
    }
  });

  it('should handle query with no matches', async () => {
    const result = await queryMemory(testCwd, {
      topic: 'nonexistent_topic',
      scopeType: 'project',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeNull();
    }
  });
});

