/**
 * Git History Scanner
 * 
 * Scans ALL past commits for leaked secrets
 * This is critical because:
 * 1. Secrets may have been committed in the past
 * 2. Even deleted secrets remain in Git history
 * 3. Attackers can search Git history for secrets
 */

import { execSync } from 'child_process';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import { detectSecretsSafe } from '../quarantine/detector.js';

/**
 * History scan result
 */
export interface HistoryScanResult {
  total_commits: number;
  commits_scanned: number;
  secrets_found: SecretInHistory[];
  clean: boolean;
}

/**
 * Secret found in history
 */
export interface SecretInHistory {
  commit_hash: string;
  commit_date: string;
  commit_author: string;
  commit_message: string;
  file_path: string;
  line_number: number;
  pattern: string;
  preview: string; // Truncated for safety
  still_exists: boolean; // Is it still in current code?
}

/**
 * Get all commits in repository
 */
async function getAllCommits(cwd: string, limit?: number): Promise<string[]> {
  try {
    const limitArg = limit ? `-n ${limit}` : '';
    const output = execSync(
      `git log ${limitArg} --format="%H" --all`,
      { cwd, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
    );
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

/**
 * Get commit info
 */
function getCommitInfo(cwd: string, hash: string): {
  date: string;
  author: string;
  message: string;
} {
  try {
    const output = execSync(
      `git show -s --format="%ai|%an|%s" ${hash}`,
      { cwd, encoding: 'utf-8' }
    );
    const [date, author, message] = output.trim().split('|');
    return { date, author, message: message || '' };
  } catch (error) {
    return { date: 'unknown', author: 'unknown', message: '' };
  }
}

/**
 * Get files changed in a commit
 */
function getFilesInCommit(cwd: string, hash: string): string[] {
  try {
    const output = execSync(
      `git diff-tree --no-commit-id --name-only -r ${hash}`,
      { cwd, encoding: 'utf-8' }
    );
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

/**
 * Get file content at specific commit
 */
function getFileAtCommit(cwd: string, hash: string, file: string): string | null {
  try {
    const output = execSync(
      `git show ${hash}:${file}`,
      { cwd, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );
    return output;
  } catch (error) {
    return null;
  }
}

/**
 * Check if secret still exists in current file
 */
function secretStillExists(cwd: string, file: string, _pattern: string): boolean {
  try {
    const { readFileSync, existsSync } = require('fs');
    const { resolve } = require('path');
    const filePath = resolve(cwd, file);
    
    if (!existsSync(filePath)) {
      return false;
    }
    
    const content = readFileSync(filePath, 'utf-8');
    const detection = detectSecretsSafe(content, cwd, file);
    
    return !detection.ok; // If detection failed, secret exists
  } catch (error) {
    return false;
  }
}

/**
 * Skip binary and large files
 */
function shouldSkipFile(file: string): boolean {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.svg',
    '.pdf', '.zip', '.tar', '.gz', '.rar',
    '.exe', '.dll', '.so', '.dylib',
    '.woff', '.woff2', '.ttf', '.eot',
    '.mp3', '.mp4', '.wav', '.avi', '.mov',
    '.lock', '.min.js', '.min.css'
  ];
  
  const skipPaths = [
    'node_modules/', 'vendor/', '.git/', 'dist/', 'build/',
    'coverage/', '.next/', '__pycache__/'
  ];
  
  const lowerFile = file.toLowerCase();
  
  if (binaryExtensions.some(ext => lowerFile.endsWith(ext))) {
    return true;
  }
  
  if (skipPaths.some(path => lowerFile.includes(path))) {
    return true;
  }
  
  return false;
}

/**
 * Scan entire Git history for secrets
 */
export async function scanGitHistory(
  cwd: string,
  options: {
    limit?: number;      // Max commits to scan (default: all)
    verbose?: boolean;   // Show progress
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<Result<HistoryScanResult, StorageError>> {
  // Check if it's a Git repository
  try {
    execSync('git rev-parse --is-inside-work-tree', { cwd, encoding: 'utf-8' });
  } catch (error) {
    return Err(new StorageError(
      'Not a Git repository. Run this command in a Git project.',
      'not_git_repo'
    ));
  }
  
  const commits = await getAllCommits(cwd, options.limit);
  
  if (commits.length === 0) {
    return Ok({
      total_commits: 0,
      commits_scanned: 0,
      secrets_found: [],
      clean: true,
    });
  }
  
  const secretsFound: SecretInHistory[] = [];
  let scanned = 0;
  
  for (const hash of commits) {
    scanned++;
    
    if (options.onProgress) {
      options.onProgress(scanned, commits.length);
    }
    
    const files = getFilesInCommit(cwd, hash);
    
    for (const file of files) {
      // Skip binary and generated files
      if (shouldSkipFile(file)) {
        continue;
      }
      
      const content = getFileAtCommit(cwd, hash, file);
      
      if (!content || content.length > 1024 * 1024) {
        // Skip empty or very large files
        continue;
      }
      
      // Detect secrets
      const detection = detectSecretsSafe(content, cwd, file);
      
      if (!detection.ok && detection.error.code !== 'CONFIG_ERROR') {
        // Secret found!
        const commitInfo = getCommitInfo(cwd, hash);
        const pattern = 'pattern' in detection.error ? detection.error.pattern : 'unknown';
        
        // Find line number (simplified)
        let lineNumber = 1;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const lineDetection = detectSecretsSafe(lines[i], cwd, file);
          if (!lineDetection.ok) {
            lineNumber = i + 1;
            break;
          }
        }
        
        // Truncate preview for safety
        const previewLine = lines[lineNumber - 1] || '';
        const preview = previewLine.length > 50 
          ? previewLine.substring(0, 50) + '...' 
          : previewLine;
        
        // Check if it still exists in current code
        const stillExists = secretStillExists(cwd, file, pattern);
        
        // Avoid duplicates (same secret in same file)
        const isDuplicate = secretsFound.some(s => 
          s.file_path === file && s.pattern === pattern
        );
        
        if (!isDuplicate) {
          secretsFound.push({
            commit_hash: hash.substring(0, 8),
            commit_date: commitInfo.date,
            commit_author: commitInfo.author,
            commit_message: commitInfo.message.substring(0, 50),
            file_path: file,
            line_number: lineNumber,
            pattern,
            preview,
            still_exists: stillExists,
          });
        }
      }
    }
  }
  
  return Ok({
    total_commits: commits.length,
    commits_scanned: scanned,
    secrets_found: secretsFound,
    clean: secretsFound.length === 0,
  });
}

/**
 * Format history scan results for display
 */
export function formatHistoryScanResults(result: HistoryScanResult): string {
  const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[0;31m',
    green: '\x1b[0;32m',
    yellow: '\x1b[1;33m',
    cyan: '\x1b[0;36m',
    white: '\x1b[1;37m',
    underline: '\x1b[4m',
  };
  
  const lines: string[] = [];
  
  lines.push('');
  lines.push(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  lines.push(`  ${c.bold}🔍 GIT HISTORY SCAN${c.reset}`);
  lines.push(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  lines.push('');
  lines.push(`  ${c.white}Commits scanned:${c.reset} ${result.commits_scanned}`);
  lines.push(`  ${c.white}Secrets found:${c.reset}   ${result.secrets_found.length > 0 ? c.red + result.secrets_found.length + c.reset : c.green + '0' + c.reset}`);
  lines.push('');
  
  if (result.clean) {
    lines.push(`  ${c.green}✓${c.reset} ${c.green}${c.bold}No secrets found in Git history!${c.reset}`);
    lines.push(`    ${c.dim}Your repository history is clean.${c.reset}`);
    lines.push('');
  } else {
    lines.push(`  ${c.red}⚠ SECRETS FOUND IN GIT HISTORY${c.reset}`);
    lines.push('');
    lines.push(`  ${c.white}These secrets are in your Git history even if deleted from current code!${c.reset}`);
    lines.push(`  ${c.dim}Attackers can find them by searching commit history.${c.reset}`);
    lines.push('');
    
    // Group by still_exists
    const stillActive = result.secrets_found.filter(s => s.still_exists);
    const historical = result.secrets_found.filter(s => !s.still_exists);
    
    if (stillActive.length > 0) {
      lines.push(`  ${c.red}${c.bold}🔴 CRITICAL - Still in current code (${stillActive.length}):${c.reset}`);
      lines.push('');
      
      for (const secret of stillActive) {
        lines.push(`  ${c.red}●${c.reset} ${c.cyan}${c.underline}${secret.file_path}:${secret.line_number}${c.reset}`);
        lines.push(`     ${c.white}Pattern:${c.reset} ${c.yellow}${secret.pattern}${c.reset}`);
        lines.push(`     ${c.white}Commit:${c.reset}  ${c.dim}${secret.commit_hash} - ${secret.commit_message}${c.reset}`);
        lines.push(`     ${c.white}When:${c.reset}    ${c.dim}${secret.commit_date} by ${secret.commit_author}${c.reset}`);
        lines.push('');
      }
    }
    
    if (historical.length > 0) {
      lines.push(`  ${c.yellow}${c.bold}🟡 HISTORICAL - Deleted but in Git history (${historical.length}):${c.reset}`);
      lines.push('');
      
      for (const secret of historical) {
        lines.push(`  ${c.yellow}●${c.reset} ${c.dim}${secret.file_path}:${secret.line_number}${c.reset}`);
        lines.push(`     ${c.white}Pattern:${c.reset} ${c.yellow}${secret.pattern}${c.reset}`);
        lines.push(`     ${c.white}Commit:${c.reset}  ${c.dim}${secret.commit_hash} - ${secret.commit_message}${c.reset}`);
        lines.push('');
      }
    }
    
    lines.push(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    lines.push('');
    lines.push(`  ${c.white}How to clean Git history:${c.reset}`);
    lines.push('');
    lines.push(`    ${c.dim}1.${c.reset} First, rotate all found secrets immediately!`);
    lines.push(`    ${c.dim}2.${c.reset} Remove from history using git filter-branch:`);
    lines.push('');
    lines.push(`       ${c.cyan}git filter-branch --force --index-filter \\${c.reset}`);
    lines.push(`       ${c.cyan}  'git rm --cached --ignore-unmatch <file>' \\${c.reset}`);
    lines.push(`       ${c.cyan}  --prune-empty --tag-name-filter cat -- --all${c.reset}`);
    lines.push('');
    lines.push(`    ${c.dim}3.${c.reset} Or use BFG Repo-Cleaner (faster):`);
    lines.push('');
    lines.push(`       ${c.cyan}bfg --delete-files <file> --no-blob-protection${c.reset}`);
    lines.push('');
    lines.push(`    ${c.dim}4.${c.reset} Force push to update remote:`);
    lines.push('');
    lines.push(`       ${c.cyan}git push --force --all${c.reset}`);
    lines.push('');
    lines.push(`  ${c.red}⚠ WARNING: This rewrites Git history. Coordinate with your team!${c.reset}`);
    lines.push('');
  }
  
  return lines.join('\n');
}

