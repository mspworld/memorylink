/**
 * ml capture command
 * Week 2 Day 10-11: Core commands
 * Based on SPEC.md v4.3.10
 * 
 * Creates E0 or E1 ONLY (never E2)
 * Detects secrets and quarantines if needed
 */

import type { MemoryRecord, Scope, EvidenceLevel, Result } from '../../core/types.js';
import { Ok, Err } from '../../core/types.js';
import { ValidationError, StorageError } from '../../core/errors.js';
import { validateTopic, validateContent, validateEvidenceLevel } from '../../core/validator.js';
import { generateRecordId } from '../../core/id.js';
import { checkAndQuarantine } from '../../quarantine/handler.js';
import { saveRecord } from '../../storage/local.js';
import { generateScopeId } from '../../storage/paths.js';
import { appendAuditEvent } from '../../audit/logger.js';
// Week 6: Memory poisoning protection
import { detectInstructionInjection } from '../../detection/instruction-injection.js';
import { classifyMemoryType, requiresApproval } from '../../validation/memory-type.js';
import { createProvenance } from '../../validation/provenance.js';

/**
 * Capture options
 */
export interface CaptureOptions {
  topic: string;
  content: string;
  evidence?: EvidenceLevel;
  scopeType?: 'project' | 'user' | 'org';
  repoUrl?: string;
  purposeTags?: string[];
  approve?: boolean; // Week 6: Approval flag for instructions
}

/**
 * Capture a memory
 * Based on SPEC.md: ml capture command
 */
export async function captureMemory(
  cwd: string,
  options: CaptureOptions
): Promise<Result<MemoryRecord, ValidationError | StorageError>> {
  // Validate topic
  const topicResult = validateTopic(options.topic);
  if (!topicResult.ok) {
    return topicResult;
  }
  const conflictKey = topicResult.value;

  // Validate content
  const contentResult = validateContent(options.content);
  if (!contentResult.ok) {
    return contentResult;
  }
  const content = contentResult.value;

  // Validate evidence level (E0 or E1 only, never E2)
  const evidence: EvidenceLevel = options.evidence || 'E0';
  const evidenceResult = validateEvidenceLevel(evidence, false); // false = don't allow E2
  if (!evidenceResult.ok) {
    return evidenceResult;
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

  // Generate record ID
  const recordId = generateRecordId();

  // Week 6: Check for instruction-injection patterns (memory poisoning)
  const hasInstructionInjection = detectInstructionInjection(content);
  if (hasInstructionInjection) {
    // Instruction-injection detected - quarantine immediately
    // This prevents memory poisoning attacks
    return Err(new ValidationError(
      'Instruction-injection pattern detected. This content could poison AI memory. ' +
      'If this is legitimate, use --approve flag.',
      'instruction_injection'
    ));
  }

  // Week 6: Classify memory type and check if approval needed
  const memoryType = classifyMemoryType(content);
  const needsApproval = requiresApproval(content);
  if (needsApproval && !options.approve) {
    // Instructions require explicit approval
    return Err(new ValidationError(
      `Memory type '${memoryType}' requires approval. Use --approve flag if this is intentional.`,
      'memory_type'
    ));
  }

  // Check for secrets and quarantine if needed
  // Production-grade: Handle quarantine errors gracefully
  const quarantineResult = await checkAndQuarantine(cwd, content, recordId);
  if (!quarantineResult.ok) {
    // If quarantine save fails (e.g., disk full), still create record but warn
    // This ensures capture doesn't completely fail due to quarantine storage issues
    console.warn(`Warning: Failed to quarantine content: ${quarantineResult.error.message}`);
    // Continue with capture (record will be created without quarantine_ref)
    // This is a production decision: capture succeeds even if quarantine storage fails
  }

  // Create record
  // Handle case where quarantine detection succeeded but save failed
  const wasQuarantined = quarantineResult.ok && quarantineResult.value.quarantined;
  const quarantineRef = quarantineResult.ok && quarantineResult.value.quarantined
    ? quarantineResult.value.quarantineRef
    : undefined;

  // Week 6: Create provenance information
  const provenanceInfo = createProvenance({
    author: process.env.USER || process.env.USERNAME || 'unknown',
    reason: needsApproval ? 'Instruction approved' : undefined,
    precedenceLevel: scopeType,
  });

  const record: MemoryRecord = {
    id: recordId,
    content,
    evidence_level: evidence,
    status: wasQuarantined ? 'QUARANTINED' : 'ACTIVE',
    scope,
    conflict_key: conflictKey,
    purpose_tags: options.purposeTags || ['work'],
    created_at: new Date().toISOString(),
    ...(quarantineRef && {
      quarantine_ref: quarantineRef,
    }),
    // Week 6: Memory poisoning protection fields
    memory_type: memoryType,
    provenance: {
      author: provenanceInfo.author,
      approved_by: needsApproval && options.approve ? provenanceInfo.author : undefined,
      approved_at: needsApproval && options.approve ? new Date().toISOString() : undefined,
      reason: provenanceInfo.reason,
    },
    // Sources for tracking origin
    sources: [{
      type: 'capture',
      ref: `memory:${recordId}`,
      captured_at: new Date().toISOString(),
    }],
  };

  // Save record
  const saveResult = await saveRecord(cwd, scope, record);
  if (!saveResult.ok) {
    return saveResult;
  }

  // Log capture event to audit trail
  const auditResult = await appendAuditEvent(cwd, {
    event_type: 'CAPTURE',
    record_id: record.id,
    content: record.content.substring(0, 100), // Preview only
    evidence_level: record.evidence_level,
    status: record.status,
    conflict_key: record.conflict_key,
    ...(record.status === 'QUARANTINED' && quarantineResult.ok && {
      quarantine: true,
      pattern: quarantineResult.value.pattern,
    }),
  });

  if (!auditResult.ok) {
    // Audit failure doesn't fail capture, but log it
    console.warn(`Warning: Failed to log audit event: ${auditResult.error.message}`);
  }

  return Ok(record);
}

