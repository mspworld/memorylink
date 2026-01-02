/**
 * Hub-aware precedence resolution
 * Week 6 Day 36-38: Universal hub support
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Extends conflict resolution with file tier precedence
 * Higher tier files win over lower tier files
 */

import type { MemoryRecord } from '../core/types.js';
import { getFileProtectionTier } from '../protection/hub-files.js';
import { getSpecifyFileTier } from '../hub/specify-detector.js';

/**
 * Get file tier for a memory record
 * Based on source file path
 * Returns tier number (lower = higher priority)
 */
export function getRecordFileTier(record: MemoryRecord): number {
  // If no sources, default to lowest tier
  if (!record.sources || record.sources.length === 0) {
    return 999; // Lowest priority
  }

  // Check all sources, return highest priority (lowest tier number)
  let minTier = 999;

  for (const source of record.sources) {
    const sourcePath = source.ref;
    
    // Check protection tier (constitution, hub files)
    const protectionTier = getFileProtectionTier(sourcePath);
    if (protectionTier !== null) {
      minTier = Math.min(minTier, protectionTier);
      continue;
    }
    
    // Check .specify/ tier
    const specifyTier = getSpecifyFileTier(sourcePath);
    if (specifyTier !== null) {
      minTier = Math.min(minTier, specifyTier);
      continue;
    }
    
    // Check other tier patterns
    const normalized = sourcePath.replace(/\\/g, '/');
    
    // Tier 4: .agent/memory/, .agent/teams/
    if (normalized.includes('.agent/memory/') || normalized.includes('.agent/teams/')) {
      minTier = Math.min(minTier, 4);
      continue;
    }
    
    // Tier 5: .specify/workflows/, .agent/workflows/
    if (normalized.includes('.specify/workflows/') || normalized.includes('.agent/workflows/')) {
      minTier = Math.min(minTier, 5);
      continue;
    }
    
    // Tier 6: .agent/skills/, .augment/
    if (normalized.includes('.agent/skills/') || normalized.includes('.augment/')) {
      minTier = Math.min(minTier, 6);
      continue;
    }
    
    // Tier 7: .cursor/plans/ (auto-ignored, lowest priority)
    if (normalized.includes('.cursor/plans/')) {
      minTier = Math.min(minTier, 7);
      continue;
    }
  }

  return minTier;
}

/**
 * Compare records by file tier
 * Lower tier number = higher priority
 */
export function compareFileTier(a: MemoryRecord, b: MemoryRecord): number {
  const tierA = getRecordFileTier(a);
  const tierB = getRecordFileTier(b);
  return tierA - tierB; // Lower tier wins
}

/**
 * Enhanced conflict resolution with hub-aware precedence
 * Precedence order:
 * 1. File tier (lower = higher priority)
 * 2. Evidence level (E2 > E1 > E0)
 * 3. Recency (newer created_at)
 * 4. Lexicographic ID (tiebreaker)
 */
export function resolveWithHubAwarePrecedence(
  records: MemoryRecord[]
): MemoryRecord | null {
  if (records.length === 0) {
    return null;
  }

  // Sort by precedence hierarchy
  const sorted = [...records].sort((a, b) => {
    // Level 1: File tier (lower tier = higher priority)
    const tierDiff = compareFileTier(a, b);
    if (tierDiff !== 0) {
      return tierDiff;
    }

    // Level 2: Evidence (E2 > E1 > E0)
    const levels = { E2: 2, E1: 1, E0: 0 };
    const evidenceDiff = levels[b.evidence_level] - levels[a.evidence_level];
    if (evidenceDiff !== 0) {
      return evidenceDiff;
    }

    // Level 3: Recency (newer first)
    const recencyDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (recencyDiff !== 0) {
      return recencyDiff;
    }

    // Level 4: Lexicographic ID (tiebreaker)
    return a.id.localeCompare(b.id);
  });

  return sorted[0];
}

