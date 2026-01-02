/**
 * ml query command
 * Week 2 Day 12-13: Core commands
 * Based on SPEC.md v4.3.10
 * 
 * Returns ACTIVE only
 * Excludes QUARANTINED (never returned)
 * Excludes DEPRECATED (excluded from truth)
 * Resolves conflicts deterministically
 */

import type { MemoryRecord, Scope, Result, ConflictResolution } from '../../core/types.js';
import { Ok } from '../../core/types.js';
import { ValidationError, StorageError, ConflictResolutionError } from '../../core/errors.js';
import { validateTopic } from '../../core/validator.js';
import { listRecordIds, loadRecord } from '../../storage/local.js';
import { resolveConflict } from '../../conflict/resolver.js';

/**
 * Query options
 */
export interface QueryOptions {
  topic: string;
  scopeType?: 'project' | 'user' | 'org';
  repoUrl?: string;
}

/**
 * Query memories by topic
 * Based on SPEC.md: ml query command
 * Returns canonical truth (resolved conflicts)
 */
export async function queryMemory(
  cwd: string,
  options: QueryOptions
): Promise<Result<ConflictResolution | null, ValidationError | StorageError | ConflictResolutionError>> {
  // Validate topic
  const topicResult = validateTopic(options.topic);
  if (!topicResult.ok) {
    return topicResult;
  }
  const conflictKey = topicResult.value;

  // Generate scope
  const scopeType = options.scopeType || 'project';
  const { generateScopeId } = await import('../../storage/paths.js');
  const scopeId = options.repoUrl
    ? generateScopeId(options.repoUrl)
    : generateScopeId(process.cwd());
  const scope: Scope = {
    type: scopeType,
    id: scopeId,
  };

  // List all record IDs in scope
  const listResult = await listRecordIds(cwd, scope);
  if (!listResult.ok) {
    return listResult;
  }

  // Load all records matching conflict_key
  // Production-grade: Handle corrupted files gracefully (skip, don't crash)
  const matchingRecords: MemoryRecord[] = [];
  
  for (const recordId of listResult.value) {
    const loadResult = await loadRecord(cwd, scope, recordId);
    if (loadResult.ok) {
      const record = loadResult.value;
      
      // Filter: Only ACTIVE records, matching conflict_key
      // QUARANTINED never returned (SPEC.md invariant)
      // DEPRECATED excluded from truth (SPEC.md)
      if (
        record.status === 'ACTIVE' &&
        record.conflict_key === conflictKey
      ) {
        matchingRecords.push(record);
      }
    } else {
      // Log warning for corrupted files but continue (graceful degradation)
      // Don't fail entire query if one record is corrupted
      if (loadResult.error.message.includes('Corrupted')) {
        console.warn(`Warning: Skipping corrupted record ${recordId}: ${loadResult.error.message}`);
      }
      // For other errors (permission, etc.), also skip gracefully
      // This ensures query doesn't fail completely if some records are inaccessible
    }
  }

  // Resolve conflicts if multiple matches
  if (matchingRecords.length === 0) {
    return Ok(null); // No matches
  }

  if (matchingRecords.length === 1) {
    // Single match - no conflict
    return Ok({
      winner: matchingRecords[0],
      reason: 'Only match',
      candidates: matchingRecords,
    });
  }

  // Multiple matches - resolve conflict
  return resolveConflict(matchingRecords);
}

