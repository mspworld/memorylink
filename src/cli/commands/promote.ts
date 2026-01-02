/**
 * ml promote command
 * Week 3 Day 15-16: Advanced commands
 * Based on SPEC.md v4.3.10
 * 
 * ONLY path to E2 (cannot create E2 via capture)
 * Promotes E1→E2 or E0→E2
 * Requires reason for audit trail
 * Logs promotion event
 */

import type { MemoryRecord, Scope, Result } from '../../core/types.js';
import { Ok, Err } from '../../core/types.js';
import { ValidationError, StorageError, EvidenceLevelError } from '../../core/errors.js';
import { validateRecordId } from '../../core/validator.js';
import { loadRecord, saveRecord } from '../../storage/local.js';
import { generateScopeId } from '../../storage/paths.js';
import { appendAuditEvent } from '../../audit/logger.js';
import { findConstitutionFile } from '../../protection/hub-files.js';

/**
 * Promote options
 */
export interface PromoteOptions {
  recordId: string;
  to: 'E2';
  reason: string;
  scopeType?: 'project' | 'user' | 'org';
  repoUrl?: string;
  constitution?: boolean; // Week 5: Constitution approval flag
}

/**
 * Promote a memory to E2
 * Based on SPEC.md: ml promote command
 * ONLY path to E2 (capture cannot create E2)
 */
export async function promoteMemory(
  cwd: string,
  options: PromoteOptions
): Promise<Result<MemoryRecord, ValidationError | StorageError | EvidenceLevelError>> {
  // Validate record ID
  const idResult = validateRecordId(options.recordId);
  if (!idResult.ok) {
    return idResult;
  }

  // Validate target level (must be E2)
  if (options.to !== 'E2') {
    return Err(new ValidationError(
      'Can only promote to E2. Use ml capture for E0/E1.',
      'evidence_level'
    ));
  }

  // Generate scope
  const scopeType = options.scopeType || 'project';
  const scopeId = options.repoUrl
    ? generateScopeId(options.repoUrl)
    : generateScopeId(process.cwd());
  const scope: Scope = {
    type: scopeType,
    id: scopeId,
  };

  // Load existing record
  const loadResult = await loadRecord(cwd, scope, options.recordId);
  if (!loadResult.ok) {
    return loadResult;
  }

  const record = loadResult.value;

  // Validate current status
  if (record.status !== 'ACTIVE') {
    return Err(new ValidationError(
      `Cannot promote ${record.status} record. Only ACTIVE records can be promoted.`,
      'status'
    ));
  }

  // Validate current evidence level
  if (record.evidence_level === 'E2') {
    return Err(new EvidenceLevelError(
      'Record is already E2',
      record.evidence_level,
      'E2'
    ));
  }

  // Validate promotion path (E0→E2 or E1→E2 allowed)
  const fromLevel = record.evidence_level;
  if (fromLevel !== 'E0' && fromLevel !== 'E1') {
    return Err(new EvidenceLevelError(
      `Cannot promote from ${fromLevel} to E2`,
      fromLevel,
      'E2'
    ));
  }

  // Validate reason (required for audit)
  if (!options.reason || options.reason.trim().length === 0) {
    return Err(new ValidationError(
      'Promotion reason is required for audit trail',
      'reason'
    ));
  }

  // Week 5: Constitution protection check
  // If promoting a record from a constitution file, require --constitution flag
  const constitutionFile = findConstitutionFile(cwd);
  if (constitutionFile) {
    // Check if record source is from constitution file
    const isFromConstitution = record.sources?.some(source => 
      source.ref.includes('constitution.md') || 
      source.ref.includes('.specify/memory/constitution.md')
    );
    
    if (isFromConstitution && !options.constitution) {
      return Err(new ValidationError(
        'Constitution file changes require --constitution flag for approval',
        'constitution'
      ));
    }
  }

  // Create promoted record
  const promotedRecord: MemoryRecord = {
    ...record,
    evidence_level: 'E2',
    // Keep all other fields unchanged
  };

  // Save promoted record
  const saveResult = await saveRecord(cwd, scope, promotedRecord);
  if (!saveResult.ok) {
    return saveResult;
  }

  // Log promotion event to audit trail
  const auditResult = await appendAuditEvent(cwd, {
    event_type: 'PROMOTE',
    record_id: record.id,
    from_evidence: fromLevel,
    to_evidence: 'E2',
    reason: options.reason,
    timestamp: new Date().toISOString(),
    constitution_approved: options.constitution || false, // Week 5: Track constitution approval
  });

  if (!auditResult.ok) {
    // Audit failure doesn't fail promotion, but log it
    console.warn(`Warning: Failed to log audit event: ${auditResult.error.message}`);
  }

  return Ok(promotedRecord);
}

