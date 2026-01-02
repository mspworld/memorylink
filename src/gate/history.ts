/**
 * History scanning for gate system
 * Week 8 Day 56: ml gate modes
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Scans Git commit history for secrets
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import { detectSecrets } from '../quarantine/detector.js';

/**
 * Get commit history
 */
export function getCommitHistory(
  cwd: string = process.cwd(),
  limit: number = 10
): Result<Array<{
  hash: string;
  message: string;
  date: string;
  files: string[];
}>, StorageError> {
  // Check if .git exists
  const gitDir = resolve(cwd, '.git');
  if (!existsSync(gitDir)) {
    return Err(new StorageError(
      'Not a Git repository. Run: git init',
      'not_git_repo'
    ));
  }
  
  try {
    // Get commit list
    const commits = execSync(
      `git log --oneline --format="%H|%s|%ai" -n ${limit}`,
      { cwd, encoding: 'utf-8' }
    ).trim().split('\n').filter(l => l.length > 0);
    
    const history: Array<{
      hash: string;
      message: string;
      date: string;
      files: string[];
    }> = [];
    
    for (const commitLine of commits) {
      const [hash, ...messageParts] = commitLine.split('|');
      const message = messageParts.slice(0, -1).join('|');
      const date = messageParts[messageParts.length - 1];
      
      // Get files changed in this commit
      const files = execSync(
        `git diff-tree --no-commit-id --name-only -r ${hash}`,
        { cwd, encoding: 'utf-8' }
      ).trim().split('\n').filter(f => f.length > 0);
      
      history.push({
        hash: hash || '',
        message: message || '',
        date: date || '',
        files: files.map(f => resolve(cwd, f)),
      });
    }
    
    return Ok(history);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to get commit history: ${error.message}`,
      'git_history'
    ));
  }
}

/**
 * Scan commit history for secrets
 */
export async function scanCommitHistory(
  cwd: string = process.cwd(),
  limit: number = 10
): Promise<Result<Array<{
  commit: string;
  message: string;
  date: string;
  file: string;
  pattern: string;
  severity: 'error' | 'warn';
}>, StorageError>> {
  const historyResult = getCommitHistory(cwd, limit);
  if (!historyResult.ok) {
    return historyResult;
  }
  
  const history = historyResult.value;
  const results: Array<{
    commit: string;
    message: string;
    date: string;
    file: string;
    pattern: string;
    severity: 'error' | 'warn';
  }> = [];
  
  for (const commit of history) {
    for (const file of commit.files) {
      // Skip if file doesn't exist
      if (!existsSync(file)) {
        continue;
      }
      
      try {
        // Week 10: Performance optimization - skip binary files
        const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib'];
        const isBinary = binaryExtensions.some(ext => file.toLowerCase().endsWith(ext));
        if (isBinary) {
          continue; // Skip binary files
        }
        
        // Week 10: Performance optimization - limit file size
        const fileSize = execSync(
          `git show ${commit.hash}:${file} | wc -c`,
          { cwd, encoding: 'utf-8' }
        ).trim();
        const sizeBytes = parseInt(fileSize, 10);
        if (sizeBytes > 5 * 1024 * 1024) { // Skip files > 5MB
          continue;
        }
        
        // Get file content at that commit
        const content = execSync(
          `git show ${commit.hash}:${file}`,
          { cwd, encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 } // 5MB buffer (reduced from 10MB)
        );
        
        const detection = detectSecrets(content, cwd, file);
        
        if (detection.found) {
          results.push({
            commit: commit.hash,
            message: commit.message,
            date: commit.date,
            file,
            pattern: detection.pattern?.name || 'Unknown',
            severity: detection.severity || 'error',
          });
        }
      } catch (error: any) {
        // Skip files that can't be read (might be deleted, renamed, etc.)
        continue;
      }
    }
  }
  
  return Ok(results);
}

