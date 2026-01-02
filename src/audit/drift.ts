/**
 * Memory drift detection
 * Week 9 Day 63: All drift detection
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Detects conflicts between memory records
 */

import type { Result } from '../core/types.js';
import { Ok } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import { resolveConflict } from '../conflict/resolver.js';
import type { MemoryRecord } from '../core/types.js';

/**
 * Drift detection result
 */
export interface DriftResult {
  conflicts: Array<{
    conflict_key: string;
    records: Array<{
      id: string;
      evidence_level: string;
      created_at: string;
      status: string;
    }>;
    canonical: string; // ID of canonical record
    reason: string; // Why this record was chosen
  }>;
  total_conflicts: number;
}

/**
 * Detect memory drift (conflicts)
 * Finds all conflict_keys with multiple records
 */
export async function detectDrift(
  cwd: string
): Promise<Result<DriftResult, StorageError>> {
  const { listRecordIds, loadRecord } = await import('../storage/local.js');
  const { generateScopeId } = await import('../storage/paths.js');
  
  const scope = {
    type: 'project' as const,
    id: generateScopeId(cwd),
  };
  
  // List all records
  const listResult = await listRecordIds(cwd, scope);
  if (!listResult.ok) {
    return listResult;
  }
  
  // Group records by conflict_key
  const recordsByKey: Record<string, MemoryRecord[]> = {};
  
  for (const recordId of listResult.value) {
    const loadResult = await loadRecord(cwd, scope, recordId);
    if (loadResult.ok) {
      const record = loadResult.value;
      // Only consider ACTIVE records (ignore DEPRECATED and QUARANTINED)
      if (record.status === 'ACTIVE') {
        const key = record.conflict_key;
        if (!recordsByKey[key]) {
          recordsByKey[key] = [];
        }
        recordsByKey[key].push(record);
      }
    }
  }
  
  // Find conflicts (multiple records for same conflict_key)
  const conflicts: DriftResult['conflicts'] = [];
  
  for (const [conflictKey, records] of Object.entries(recordsByKey)) {
    if (records.length > 1) {
      // Multiple records for same key - resolve conflict
      const resolvedResult = resolveConflict(records);
      
      if (resolvedResult.ok) {
        const resolved = resolvedResult.value;
        conflicts.push({
          conflict_key: conflictKey,
          records: records.map(r => ({
            id: r.id,
            evidence_level: r.evidence_level,
            created_at: r.created_at,
            status: r.status,
          })),
          canonical: resolved.winner.id,
          reason: `Selected ${resolved.winner.evidence_level} record (most recent)`,
        });
      }
    }
  }
  
  return Ok({
    conflicts,
    total_conflicts: conflicts.length,
  });
}

