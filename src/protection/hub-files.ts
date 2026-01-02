/**
 * Protected file system detection
 * Week 5 Day 32-34: Constitution protection
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Detects and protects constitution files and other governance files
 */

import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Constitution file paths (in order of precedence)
 * Tier 1: Highest priority (locked)
 */
export const CONSTITUTION_PATHS = [
  'constitution.md',
  '.specify/memory/constitution.md',
] as const;

/**
 * Universal hub file paths (Tier 2: Locked)
 */
export const HUB_PATHS = [
  'AI.md',
  'AGENTS.md',
  'AGENT.md',
] as const;

/**
 * Check if a file path is a constitution file
 */
export function isConstitutionFile(filePath: string, cwd: string = process.cwd()): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const relative = normalized.startsWith(cwd) 
    ? normalized.substring(cwd.length + 1)
    : normalized;
  
  return CONSTITUTION_PATHS.some(path => 
    relative === path || relative.endsWith(`/${path}`)
  );
}

/**
 * Check if a file path is a universal hub file
 */
export function isHubFile(filePath: string, cwd: string = process.cwd()): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const relative = normalized.startsWith(cwd) 
    ? normalized.substring(cwd.length + 1)
    : normalized;
  
  return HUB_PATHS.some(path => 
    relative === path || relative.endsWith(`/${path}`)
  );
}

/**
 * Find constitution file in project
 * Returns the first constitution file found (highest precedence)
 */
export function findConstitutionFile(cwd: string = process.cwd()): string | null {
  for (const path of CONSTITUTION_PATHS) {
    const fullPath = resolve(cwd, path);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}

/**
 * Get file protection tier
 * Returns tier number (lower = higher priority)
 */
export function getFileProtectionTier(filePath: string, cwd: string = process.cwd()): number | null {
  if (isConstitutionFile(filePath, cwd)) {
    return 1; // Tier 1: Constitution (locked)
  }
  if (isHubFile(filePath, cwd)) {
    return 2; // Tier 2: Universal hubs (locked)
  }
  return null; // Not a protected file
}

/**
 * Check if file requires constitution approval
 */
export function requiresConstitutionApproval(filePath: string, cwd: string = process.cwd()): boolean {
  return isConstitutionFile(filePath, cwd);
}

