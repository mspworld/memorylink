/**
 * Team isolation and ownership management
 * Week 5 Day 35: Team isolation
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Prevents cross-team pollution by enforcing ownership and permissions
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { ValidationError } from '../core/errors.js';

/**
 * Ownership metadata from file frontmatter
 */
export interface OwnershipMetadata {
  owner?: string; // Team name (e.g., "frontend", "backend")
  editors?: string[]; // Users who can edit
  readonly?: string[]; // Teams/users who can only read
}

/**
 * Parse YAML frontmatter from markdown file
 * Format:
 * ---
 * memorylink:
 *   owner: frontend
 *   editors: [alice, bob]
 *   readonly: [backend, devops]
 * ---
 */
export async function parseOwnershipMetadata(
  filePath: string
): Promise<Result<OwnershipMetadata | null, ValidationError>> {
  try {
    if (!existsSync(filePath)) {
      return Ok(null);
    }

    const content = await readFile(filePath, 'utf-8');
    
    // Check if file has frontmatter
    if (!content.startsWith('---')) {
      return Ok(null); // No frontmatter, no ownership metadata
    }

    // Extract frontmatter (between first --- and second ---)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return Ok(null); // Invalid frontmatter format
    }

    const frontmatter = frontmatterMatch[1];
    
    // Simple YAML parsing for memorylink section
    // Look for memorylink: section
    const memorylinkMatch = frontmatter.match(/memorylink:\s*\n((?:\s+[^\n]+\n?)+)/);
    if (!memorylinkMatch) {
      return Ok(null); // No memorylink section
    }

    const memorylinkSection = memorylinkMatch[1];
    const metadata: OwnershipMetadata = {};

    // Parse owner
    const ownerMatch = memorylinkSection.match(/owner:\s*(.+)/);
    if (ownerMatch) {
      metadata.owner = ownerMatch[1].trim();
    }

    // Parse editors (array)
    const editorsMatch = memorylinkSection.match(/editors:\s*\[([^\]]+)\]/);
    if (editorsMatch) {
      metadata.editors = editorsMatch[1]
        .split(',')
        .map(e => e.trim().replace(/['"]/g, ''));
    }

    // Parse readonly (array)
    const readonlyMatch = memorylinkSection.match(/readonly:\s*\[([^\]]+)\]/);
    if (readonlyMatch) {
      metadata.readonly = readonlyMatch[1]
        .split(',')
        .map(r => r.trim().replace(/['"]/g, ''));
    }

    return Ok(Object.keys(metadata).length > 0 ? metadata : null);
  } catch (error: any) {
    return Err(new ValidationError(
      `Failed to parse ownership metadata: ${error.message}`,
      'ownership'
    ));
  }
}

/**
 * Check if file is a team file
 * Team files are in .agent/teams/ directory
 */
export function isTeamFile(filePath: string, cwd: string = process.cwd()): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const relative = normalized.startsWith(cwd) 
    ? normalized.substring(cwd.length + 1)
    : normalized;
  
  return relative.includes('.agent/teams/') || relative.includes('.agent\\teams\\');
}

/**
 * Get team name from file path
 * Example: .agent/teams/frontend.md -> "frontend"
 */
export function getTeamNameFromPath(filePath: string): string | null {
  const match = filePath.match(/[\/\\]teams[\/\\]([^\/\\]+)\.md$/);
  return match ? match[1] : null;
}

/**
 * Check if user/team has permission to edit
 * Returns true if:
 * - File has no ownership metadata (open)
 * - User is in editors list
 * - User's team matches owner
 */
export async function canEdit(
  filePath: string,
  userOrTeam: string,
  cwd: string = process.cwd()
): Promise<Result<boolean, ValidationError>> {
  // If not a team file, allow editing (no restrictions)
  if (!isTeamFile(filePath, cwd)) {
    return Ok(true);
  }

  // Parse ownership metadata
  const metadataResult = await parseOwnershipMetadata(filePath);
  if (!metadataResult.ok) {
    return metadataResult;
  }

  const metadata = metadataResult.value;
  
  // If no metadata, allow editing (open file)
  if (!metadata) {
    return Ok(true);
  }

  // Check if user is in editors list
  if (metadata.editors && metadata.editors.includes(userOrTeam)) {
    return Ok(true);
  }

  // Check if user's team matches owner
  if (metadata.owner && metadata.owner === userOrTeam) {
    return Ok(true);
  }

  // Check if user's team is in readonly (deny edit)
  if (metadata.readonly && metadata.readonly.includes(userOrTeam)) {
    return Ok(false);
  }

  // If owner is set but user doesn't match, deny
  if (metadata.owner && metadata.owner !== userOrTeam) {
    return Ok(false);
  }

  // Default: allow if no restrictions
  return Ok(true);
}

/**
 * Get current user/team (from environment or Git config)
 * Week 5: Basic implementation - can be enhanced later
 */
export function getCurrentUser(): string {
  // Try GIT_AUTHOR_NAME first (if set)
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

