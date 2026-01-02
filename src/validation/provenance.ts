/**
 * Provenance tracking
 * Week 6 Day 39-41: Memory poisoning protection
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Tracks WHO changed WHAT and WHY
 * Full audit trail for accountability
 */

/**
 * Provenance information
 */
export interface Provenance {
  source_file?: string; // File path where memory originated
  source_line?: number; // Line number in source file
  author?: string; // Who created/modified
  approved_by?: string; // Who approved (if applicable)
  approved_at?: string; // ISO-8601 timestamp
  reason?: string; // Why this change was made
  precedence_level?: string; // 'project', 'user', 'org', etc.
}

/**
 * Get current user (from environment or Git)
 */
export function getCurrentUser(): string {
  // Try GIT_AUTHOR_NAME first
  if (process.env.GIT_AUTHOR_NAME) {
    return process.env.GIT_AUTHOR_NAME;
  }
  
  // Try USER environment variable
  if (process.env.USER) {
    return process.env.USER;
  }
  
  // Try USERNAME (Windows)
  if (process.env.USERNAME) {
    return process.env.USERNAME;
  }
  
  // Fallback
  return 'unknown';
}

/**
 * Create provenance from source information
 */
export function createProvenance(options: {
  sourceFile?: string;
  sourceLine?: number;
  author?: string;
  reason?: string;
  precedenceLevel?: string;
}): Provenance {
  return {
    source_file: options.sourceFile,
    source_line: options.sourceLine,
    author: options.author || getCurrentUser(),
    reason: options.reason,
    precedence_level: options.precedenceLevel || 'project',
  };
}

/**
 * Add approval to provenance
 */
export function addApproval(
  provenance: Provenance,
  approver: string,
  approvedAt?: string
): Provenance {
  return {
    ...provenance,
    approved_by: approver,
    approved_at: approvedAt || new Date().toISOString(),
  };
}

/**
 * Format provenance for display
 */
export function formatProvenance(provenance: Provenance): string {
  const parts: string[] = [];
  
  if (provenance.author) {
    parts.push(`Author: ${provenance.author}`);
  }
  
  if (provenance.source_file) {
    const location = provenance.source_line
      ? `${provenance.source_file}:${provenance.source_line}`
      : provenance.source_file;
    parts.push(`Source: ${location}`);
  }
  
  if (provenance.approved_by) {
    parts.push(`Approved by: ${provenance.approved_by}`);
    if (provenance.approved_at) {
      parts.push(`Approved at: ${provenance.approved_at}`);
    }
  }
  
  if (provenance.reason) {
    parts.push(`Reason: ${provenance.reason}`);
  }
  
  return parts.join(' | ');
}

