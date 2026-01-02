/**
 * block-quarantined gate rule
 * Week 2 Day 14: ml gate command
 * Based on SPEC.md v4.3.10
 * 
 * Rule: FAIL if any QUARANTINED records exist
 * Exit code: 1 = FAIL, 0 = PASS, 2 = ERROR
 * 
 * Gate output MUST NOT print:
 * - Quarantined content
 * - Raw secrets
 * Only: IDs, quarantine_ref (paths), metadata
 */

import type { Scope, GateResult, GateViolation } from '../../core/types.js';
import { EXIT_CODES } from '../../core/exit-codes.js';
import { generateScopeId } from '../../storage/paths.js';
import { canEdit, isTeamFile, getCurrentUser } from '../../protection/ownership.js';
import { resolve } from 'path';

/**
 * Check for quarantined records
 * Based on SPEC.md: block-quarantined rule
 */
export async function checkBlockQuarantined(
  cwd: string,
  scope?: Scope
): Promise<GateResult> {
  try {
    // Use provided scope or default to project scope
    const checkScope: Scope = scope || {
      type: 'project',
      id: generateScopeId(process.cwd()),
    };

    // List all record IDs
    const { listRecordIds, loadRecord } = await import('../../storage/local.js');
    const listResult = await listRecordIds(cwd, checkScope);
    if (!listResult.ok) {
      return {
        passed: false,
        rule: 'block-quarantined',
        violations: [],
        exitCode: EXIT_CODES.ERROR,
      };
    }

    // Load all records and check for QUARANTINED
    // Production-grade: Handle corrupted files gracefully (skip, don't crash)
    // Week 5: Also check team permissions for team files
    const violations: GateViolation[] = [];
    const currentUser = getCurrentUser();

    for (const recordId of listResult.value) {
      const loadResult = await loadRecord(cwd, checkScope, recordId);
      if (loadResult.ok) {
        const record = loadResult.value;
        
        // Check if QUARANTINED
        if (record.status === 'QUARANTINED') {
          violations.push({
            record_id: record.id,
            conflict_key: record.conflict_key,
            created_at: record.created_at,
            quarantine_ref: record.quarantine_ref, // Path only, never content
          });
        }

        // Week 5: Check team permissions if record is from team file
        if (record.sources && record.sources.length > 0) {
          for (const source of record.sources) {
            const sourcePath = resolve(cwd, source.ref);
            if (isTeamFile(sourcePath, cwd)) {
              const permissionResult = await canEdit(sourcePath, currentUser, cwd);
              if (permissionResult.ok && !permissionResult.value) {
                // Cross-team edit detected - add to violations
                violations.push({
                  record_id: record.id,
                  conflict_key: record.conflict_key,
                  created_at: record.created_at,
                  // Note: This is a permission violation, not a quarantine violation
                  // But we use the same structure for consistency
                });
              }
            }
          }
        }
      } else {
        // Log warning for corrupted files but continue (graceful degradation)
        // Gate should still work even if some records are corrupted
        if (loadResult.error.message.includes('Corrupted')) {
          console.warn(`Warning: Skipping corrupted record ${recordId} in gate check`);
        }
        // For other errors, also skip gracefully
        // This ensures gate doesn't fail completely if some records are inaccessible
      }
    }

    // Gate fails if any violations
    const passed = violations.length === 0;

    return {
      passed,
      rule: 'block-quarantined',
      violations,
      exitCode: passed ? EXIT_CODES.SUCCESS : EXIT_CODES.FAILURE,
    };
  } catch (error: any) {
    return {
      passed: false,
      rule: 'block-quarantined',
      violations: [],
      exitCode: EXIT_CODES.ERROR,
    };
  }
}

