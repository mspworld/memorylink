/**
 * Severity classification for gate system
 * Week 8 Day 53-55: Tiered gate system
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * RED/YELLOW/GREEN severity classification
 * Active = Block, Inactive = Warn logic
 */

import type { DetectionResult } from '../quarantine/detector.js';

/**
 * Severity tiers
 */
export enum SeverityTier {
  RED = 'red',      // Block - Active secrets (ERROR severity)
  YELLOW = 'yellow', // Warn - Inactive secrets or warnings (WARN severity)
  GREEN = 'green',   // Info - No issues
}

/**
 * Get severity tier from detection result
 * 
 * RED: ERROR severity (blocking - active secrets)
 * YELLOW: WARN severity (warning - inactive secrets, browser/debug patterns)
 * GREEN: No detection
 */
export function getSeverityTier(detection: DetectionResult | null): SeverityTier {
  if (!detection || !detection.found) {
    return SeverityTier.GREEN;
  }
  
  // RED: ERROR severity (blocking)
  if (detection.severity === 'error') {
    return SeverityTier.RED;
  }
  
  // YELLOW: WARN severity (warning)
  if (detection.severity === 'warn') {
    return SeverityTier.YELLOW;
  }
  
  // Default: RED for safety (if severity not specified)
  return SeverityTier.RED;
}

/**
 * Check if tier should block (RED) or warn (YELLOW)
 * 
 * RED: Blocks (exit code 1)
 * YELLOW: Warns (exit code 0, but shows warning)
 * GREEN: Passes (exit code 0)
 */
export function shouldBlock(tier: SeverityTier): boolean {
  return tier === SeverityTier.RED;
}

/**
 * Get human-readable description of tier
 */
export function getTierDescription(tier: SeverityTier): string {
  switch (tier) {
    case SeverityTier.RED:
      return '🔴 CRITICAL: Working secrets found - Fix before continuing!';
    case SeverityTier.YELLOW:
      return '🟡 WARNING: Possible issues found - Review recommended';
    case SeverityTier.GREEN:
      return '🟢 ALL CLEAR: No problems found';
  }
}

/**
 * Get exit code for tier
 */
export function getTierExitCode(tier: SeverityTier): number {
  switch (tier) {
    case SeverityTier.RED:
      return 1; // Block
    case SeverityTier.YELLOW:
      return 0; // Warn but don't block
    case SeverityTier.GREEN:
      return 0; // Pass
  }
}

