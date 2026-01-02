/**
 * Diff mode for gate system
 * Week 8 Day 56: ml gate modes
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Checks only changed files (git diff)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import { detectSecrets } from '../quarantine/detector.js';

/**
 * Get changed files from git diff
 */
export function getChangedFiles(
  cwd: string = process.cwd()
): Result<string[], StorageError> {
  // Check if .git exists
  const gitDir = resolve(cwd, '.git');
  if (!existsSync(gitDir)) {
    return Err(new StorageError(
      'Not a Git repository. Run: git init',
      'not_git_repo'
    ));
  }
  
  try {
    // Get staged files (for pre-commit)
    const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      cwd,
      encoding: 'utf-8',
    }).trim().split('\n').filter(f => f.length > 0);
    
    // Get unstaged files (for pre-commit)
    const unstagedFiles = execSync('git diff --name-only --diff-filter=ACMR', {
      cwd,
      encoding: 'utf-8',
    }).trim().split('\n').filter(f => f.length > 0);
    
    // Combine and deduplicate
    const allFiles = [...new Set([...stagedFiles, ...unstagedFiles])];
    
    // Resolve to absolute paths
    const resolvedFiles = allFiles.map(file => resolve(cwd, file));
    
    return Ok(resolvedFiles);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to get changed files: ${error.message}`,
      'git_diff'
    ));
  }
}

/**
 * Scan changed files for secrets
 */
export async function scanChangedFiles(
  cwd: string = process.cwd()
): Promise<Result<Array<{
  file: string;
  detections: Array<{
    pattern: string;
    severity: 'error' | 'warn';
    line?: number;
  }>;
}>, StorageError>> {
  const filesResult = getChangedFiles(cwd);
  if (!filesResult.ok) {
    return filesResult;
  }
  
  const files = filesResult.value;
  const results: Array<{
    file: string;
    detections: Array<{
      pattern: string;
      severity: 'error' | 'warn';
      line?: number;
    }>;
  }> = [];
  
  const { readFile } = await import('fs/promises');
  
  for (const file of files) {
    // Skip if file doesn't exist (might be deleted)
    if (!existsSync(file)) {
      continue;
    }
    
    try {
      const content = await readFile(file, 'utf-8');
      const detection = detectSecrets(content, cwd, file);
      
      if (detection.found) {
        // Calculate line number
        const lineNumber = detection.position
          ? content.substring(0, detection.position).split('\n').length
          : undefined;
        
        results.push({
          file,
          detections: [{
            pattern: detection.pattern?.name || 'Unknown',
            severity: detection.severity || 'error',
            line: lineNumber,
          }],
        });
      }
    } catch (error: any) {
      // Skip files that can't be read
      continue;
    }
  }
  
  return Ok(results);
}

