/**
 * Draft tier system
 * Week 6 Day 39-41: Memory poisoning protection
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Prevents auto-poisoning by requiring human review
 * Agent-generated content → Draft tier (*-draft.md)
 * Human-reviewed content → Trusted tier (*.md)
 */

/**
 * Check if file is a draft file
 * Draft files: *-draft.md (not read by future agents)
 */
export function isDraftFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return /-draft\.md$/i.test(normalized);
}

/**
 * Check if file is a trusted file
 * Trusted files: *.md (read by agents)
 */
export function isTrustedFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return /\.md$/i.test(normalized) && !isDraftFile(filePath);
}

/**
 * Get draft file name from trusted file name
 * Example: plan.md → plan-draft.md
 */
export function getDraftFileName(trustedFileName: string): string {
  if (trustedFileName.endsWith('.md')) {
    return trustedFileName.replace(/\.md$/, '-draft.md');
  }
  return `${trustedFileName}-draft.md`;
}

/**
 * Get trusted file name from draft file name
 * Example: plan-draft.md → plan.md
 */
export function getTrustedFileName(draftFileName: string): string {
  return draftFileName.replace(/-draft\.md$/i, '.md');
}

/**
 * Check if draft can be promoted to trusted
 * Requires human review (approval)
 */
export function canPromoteDraft(draftPath: string): boolean {
  // Draft files can always be promoted (with approval)
  return isDraftFile(draftPath);
}

