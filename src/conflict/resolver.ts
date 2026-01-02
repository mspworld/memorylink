/**
 * Conflict resolution
 * Week 2 Day 12-13: ml query with conflict resolution
 * Based on SPEC.md v4.3.10
 * 
 * Deterministic conflict resolution:
 * 1. Evidence (E2 > E1 > E0)
 * 2. Recency (newest created_at)
 * 3. Lexicographic (id tiebreaker)
 * 
 * Only ACTIVE records eligible
 * QUARANTINED never returned
 * DEPRECATED excluded from truth
 */

import type { MemoryRecord, ConflictResolution, Result } from '../core/types.js';
import { ConflictResolutionError } from '../core/errors.js';
import { Ok, Err } from '../core/types.js';
import { compareFileTier } from '../precedence/hub-aware.js';

/**
 * Compare evidence levels
 * E2 > E1 > E0
 */
function compareEvidence(a: MemoryRecord, b: MemoryRecord): number {
  const levels = { E2: 2, E1: 1, E0: 0 };
  return levels[b.evidence_level] - levels[a.evidence_level];
}

/**
 * Compare by recency (created_at)
 * Newer > Older
 */
function compareRecency(a: MemoryRecord, b: MemoryRecord): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

/**
 * Compare by ID (lexicographic)
 * For tiebreaker
 */
function compareId(a: MemoryRecord, b: MemoryRecord): number {
  return a.id.localeCompare(b.id);
}

/**
 * Resolve conflicts using 3-level hierarchy
 * Based on SPEC.md conflict resolution rules
 */
export function resolveConflict(
  records: MemoryRecord[]
): Result<ConflictResolution, ConflictResolutionError> {
  if (records.length === 0) {
    return Err(new ConflictResolutionError('No records provided'));
  }

  // Filter: Only ACTIVE records eligible
  const activeRecords = records.filter(r => r.status === 'ACTIVE');

  if (activeRecords.length === 0) {
    return Err(new ConflictResolutionError('No ACTIVE records found'));
  }

  // Week 6: Sort with hub-aware precedence
  // Precedence: File tier > Evidence > Recency > ID
  const sorted = [...activeRecords].sort((a, b) => {
    // Level 1: File tier (hub-aware precedence)
    const tierDiff = compareFileTier(a, b);
    if (tierDiff !== 0) {
      return tierDiff;
    }
    
    // Level 2: Evidence
    const evidenceDiff = compareEvidence(a, b);
    if (evidenceDiff !== 0) {
      return evidenceDiff;
    }

    // Level 3: Recency
    const recencyDiff = compareRecency(a, b);
    if (recencyDiff !== 0) {
      return recencyDiff;
    }

    // Level 4: Lexicographic ID
    return compareId(a, b);
  });

  const winner = sorted[0];
  const reason = getResolutionReason(winner, sorted);

  return Ok({
    winner,
    reason,
    candidates: sorted,
  });
}

/**
 * Get human-readable reason for resolution
 */
function getResolutionReason(
  winner: MemoryRecord,
  candidates: MemoryRecord[]
): string {
  if (candidates.length === 1) {
    return 'Only candidate';
  }

  const second = candidates[1];
  
  // Week 6: Check file tier first (hub-aware precedence)
  if (compareFileTier(winner, second) !== 0) {
    const tierA = compareFileTier(winner, second) < 0 ? 'higher' : 'lower';
    return `File tier (${tierA} tier file)`;
  }
  
  // Check which level decided
  if (compareEvidence(winner, second) !== 0) {
    return `Evidence level (${winner.evidence_level} > ${second.evidence_level})`;
  }

  if (compareRecency(winner, second) !== 0) {
    return 'Recency (newer created_at)';
  }

  return 'Lexicographic ID (tiebreaker)';
}

