/**
 * ml scan command
 * Real-time project scanning for secrets and personal data
 * Scans entire project and shows human-readable results
 */

import { readFile, readdir, stat, lstat } from 'fs/promises';
import { join, relative, resolve } from 'path';
import { detectSecrets } from '../../quarantine/detector.js';
import type { Result } from '../../core/types.js';
import { Ok, Err } from '../../core/types.js';
import { StorageError } from '../../core/errors.js';

/**
 * v2.1: Check if path is a symlink (for security - prevent traversal attacks)
 */
async function isSymlink(filePath: string): Promise<boolean> {
  try {
    const lstats = await lstat(filePath);
    return lstats.isSymbolicLink();
  } catch {
    return false;
  }
}
// Week 10: Performance optimization
import { 
  measurePerformance, 
  processInBatches, 
  isLargeRepository, 
  getOptimalBatchSize,
  logPerformance 
} from '../../core/performance.js';

/**
 * Get human-readable category from pattern ID
 */
function getCategoryFromPattern(patternId: string): string {
  // API Keys & Tokens
  if (patternId.includes('api-key') || patternId.includes('claude-api-key') || 
      patternId.includes('github-token') || patternId.includes('slack-token') ||
      patternId.includes('stripe-key') || patternId.includes('google-api-key') ||
      patternId.includes('twilio-key') || patternId.includes('sendgrid-key') ||
      patternId.includes('mailgun-key') || patternId.includes('paypal-key') ||
      patternId.includes('square-key') || patternId.includes('shopify-key') ||
      patternId.includes('discord-token') || patternId.includes('jwt') ||
      patternId.includes('token') || patternId.includes('oauth')) {
    return 'API Keys & Tokens';
  }
  
  // Cloud Credentials
  if (patternId.includes('aws') || patternId.includes('azure') || 
      patternId.includes('gcp') || patternId.includes('heroku')) {
    return 'Cloud Credentials';
  }
  
  // Database & Infrastructure
  if (patternId.includes('redis') || patternId.includes('db-url') ||
      patternId.includes('terraform') || patternId.includes('helm') ||
      patternId.includes('docker') || patternId.includes('kubernetes')) {
    return 'Database & Infrastructure';
  }
  
  // Payment Information
  if (patternId.includes('credit-card') || patternId.includes('cvv') ||
      patternId.includes('bank-account') || patternId.includes('upi') ||
      patternId.includes('pin-code') || patternId.includes('iban')) {
    return 'Payment Information';
  }
  
  // Personal Data
  if (patternId.includes('ssn') || patternId.includes('pan-card') ||
      patternId.includes('aadhaar') || patternId.includes('sin') ||
      patternId.includes('phone-number') || patternId.includes('email-password') ||
      patternId.includes('driver-license') || patternId.includes('passport')) {
    return 'Personal Data';
  }
  
  // Browser Leaks
  if (patternId.includes('localstorage') || patternId.includes('sessionstorage') ||
      patternId.includes('cookie') || patternId.includes('url-secret') ||
      patternId.includes('console-log')) {
    return 'Browser Data Leak';
  }
  
  // CI/CD
  if (patternId.includes('github-actions') || patternId.includes('gitlab-ci') ||
      patternId.includes('jenkins') || patternId.includes('circleci') ||
      patternId.includes('ci-secret')) {
    return 'CI/CD Secrets';
  }
  
  // Log Files
  if (patternId.includes('error-log') || patternId.includes('access-log') ||
      patternId.includes('debug-log') || patternId.includes('stack-trace')) {
    return 'Log File Exposure';
  }
  
  // Cloud Storage
  if (patternId.includes('s3-public') || patternId.includes('azure-public') ||
      patternId.includes('gcp-public') || patternId.includes('cloud-storage')) {
    return 'Cloud Storage Misconfiguration';
  }
  
  // Generic
  if (patternId.includes('password') || patternId.includes('private-key') ||
      patternId.includes('smtp') || patternId.includes('vpn')) {
    return 'Credentials & Secrets';
  }
  
  return 'Other Secrets';
}

/**
 * Get type from category
 */
function getTypeFromCategory(category: string): 'secret' | 'personal' | 'browser-leak' | 'payment' {
  if (category === 'Personal Data') {
    return 'personal';
  }
  if (category === 'Payment Information') {
    return 'payment';
  }
  if (category === 'Browser Data Leak') {
    return 'browser-leak';
  }
  return 'secret';
}

/**
 * Check if pattern is personal data
 */
function isPersonalDataPattern(patternId: string): boolean {
  return patternId.includes('ssn') || patternId.includes('pan-card') ||
         patternId.includes('aadhaar') || patternId.includes('sin') ||
         patternId.includes('phone-number') || patternId.includes('email-password') ||
         patternId.includes('driver-license') || patternId.includes('passport');
}

/**
 * Check if pattern is payment data
 */
function isPaymentPattern(patternId: string): boolean {
  return patternId.includes('credit-card') || patternId.includes('cvv') ||
         patternId.includes('bank-account') || patternId.includes('upi') ||
         patternId.includes('pin-code') || patternId.includes('iban');
}

/**
 * Check if pattern is browser leak
 */
function isBrowserLeakPattern(patternId: string): boolean {
  return patternId.includes('localstorage') || patternId.includes('sessionstorage') ||
         patternId.includes('cookie-secret') || patternId.includes('url-secret') ||
         patternId.includes('console-log');
}

export interface ScanResult {
  file: string;
  line: number;
  type: 'secret' | 'personal' | 'browser-leak' | 'payment';
  pattern: string;
  patternId?: string;
  preview: string;
  category?: string; // Human-readable category (API Key, Credit Card, etc.)
}

export interface ScanOptions {
  path?: string;
  exclude?: string[];
  showPreview?: boolean;
  json?: boolean;  // v2.1: JSON output for CI/automation
}

/**
 * Scan a single file for secrets
 * Week 10: Performance optimization - skip large files
 */
async function scanFile(
  filePath: string,
  cwd: string
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  
  try {
    // v2.1: Skip symlinks to prevent traversal attacks
    if (await isSymlink(filePath)) {
      return results;
    }
    
    // Week 10: Performance optimization - skip files > 5MB
    const stats = await stat(filePath);
    if (stats.size > 5 * 1024 * 1024) { // 5MB limit
      return results; // Skip large files
    }
    
    // Week 10: Performance optimization - skip binary files
    // NOTE: .svg and .min.js are TEXT files that can contain secrets - DO NOT SKIP
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff',  // Images
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',  // Documents
      '.zip', '.tar', '.gz', '.rar', '.7z', '.bz2',               // Archives
      '.exe', '.dll', '.so', '.dylib', '.bin',                    // Binaries
      '.woff', '.woff2', '.ttf', '.eot', '.otf',                  // Fonts
      '.ico', '.mp3', '.mp4', '.wav', '.avi', '.mov',             // Media
    ];
    const isBinary = binaryExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
    if (isBinary) {
      return results; // Skip binary files
    }
    
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Week 10: Performance optimization - skip files with too many lines (> 10k lines)
    if (lines.length > 10000) {
      // For very large files, only scan first 1000 and last 1000 lines
      const firstLines = lines.slice(0, 1000);
      const lastLines = lines.slice(-1000);
      const linesToScan = [...firstLines, ...lastLines];
      
      for (let i = 0; i < linesToScan.length; i++) {
        const line = linesToScan[i];
        const lineNum = i < 1000 ? i + 1 : lines.length - 1000 + i;
        
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) {
          continue;
        }
        
        // Check for secrets
        const detection = detectSecrets(line, cwd, filePath);
        
        if (detection.found && detection.pattern) {
          const category = getCategoryFromPattern(detection.pattern.id || detection.pattern.name);
          const type = getTypeFromCategory(category);
          
          results.push({
            file: relative(cwd, filePath),
            line: lineNum,
            type: type,
            pattern: detection.pattern.name,
            patternId: detection.pattern.id,
            preview: line.trim().substring(0, 100),
            category: category,
          });
        }
      }
      
      return results;
    }
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) {
        continue;
      }
      
      // Check for secrets (Phase 2: Context-aware detection with file path)
      const detection = detectSecrets(line, cwd, filePath);
      
      if (detection.found && detection.pattern) {
        // Determine category for better grouping
        const category = getCategoryFromPattern(detection.pattern.id || detection.pattern.name);
        const type = getTypeFromCategory(category);
        
        results.push({
          file: relative(cwd, filePath),
          line: lineNum,
          type: type,
          pattern: detection.pattern.name,
          patternId: detection.pattern.id,
          preview: line.trim().substring(0, 100),
          category: category,
        });
      }
      
      // Check for browser data leaks (use detection for consistency)
      const browserDetection = detectSecrets(line, cwd, filePath);
      if (browserDetection.found && browserDetection.pattern) {
        const patternId = browserDetection.pattern.id || '';
        if (isBrowserLeakPattern(patternId)) {
          const category = getCategoryFromPattern(patternId);
          results.push({
            file: relative(cwd, filePath),
            line: lineNum,
            type: 'browser-leak',
            pattern: browserDetection.pattern.name,
            patternId: patternId,
            preview: line.trim().substring(0, 100),
            category: category,
          });
        }
      }
      
      // Check for personal data patterns (use detection for consistency)
      const personalDetection = detectSecrets(line, cwd, filePath);
      if (personalDetection.found && personalDetection.pattern) {
        const patternId = personalDetection.pattern.id || '';
        if (isPersonalDataPattern(patternId)) {
          const category = getCategoryFromPattern(patternId);
          results.push({
            file: relative(cwd, filePath),
            line: lineNum,
            type: 'personal',
            pattern: personalDetection.pattern.name,
            patternId: patternId,
            preview: line.trim().substring(0, 100),
            category: category,
          });
        } else if (isPaymentPattern(patternId)) {
          const category = getCategoryFromPattern(patternId);
          results.push({
            file: relative(cwd, filePath),
            line: lineNum,
            type: 'payment',
            pattern: personalDetection.pattern.name,
            patternId: patternId,
            preview: line.trim().substring(0, 100),
            category: category,
          });
        }
      }
    }
  } catch (error: any) {
    // Skip files that can't be read
  }
  
  return results;
}

/**
 * Check if file should be excluded
 */
function shouldExclude(filePath: string, excludes: string[]): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  // Special case: Don't exclude test-pattern-detection/ (it's for pattern testing)
  if (normalized.includes('test-pattern-detection/')) {
    return false;
  }
  return excludes.some(exclude => normalized.includes(exclude));
}

/**
 * Recursively scan directory
 * Week 10: Performance optimization - batch processing for large repos
 */
async function scanDirectory(
  dirPath: string,
  cwd: string,
  excludes: string[] = [],
  fileCount: { count: number } = { count: 0 } // Track total files for optimization
): Promise<ScanResult[]> {
  const results: ScanResult[] = [];
  
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    
    // Week 10: Performance optimization - collect files first, then process in batches
    const filesToScan: string[] = [];
    const dirsToScan: string[] = [];
    
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const relativePath = relative(cwd, fullPath);
      
      // Skip excluded directories/files
      if (shouldExclude(relativePath, excludes)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Week 10: Performance optimization - collect directories for batch processing
        dirsToScan.push(fullPath);
      } else if (entry.isFile()) {
        fileCount.count++;
        // Week 10: Performance optimization - collect files for batch processing
        filesToScan.push(fullPath);
      }
    }
    
    // Week 10: Performance optimization - process directories recursively first
    for (const dirPathToScan of dirsToScan) {
      const relativePath = relative(cwd, dirPathToScan);
      const entryName = dirPathToScan.split(/[/\\]/).pop() || '';
      
      // Skip excluded directories
      if (shouldExclude(relativePath, excludes)) {
        continue;
      }
      
      // Week 5: Always scan .github/ and docs/ directories (even if excluded elsewhere)
      if (entryName === '.github' || entryName === 'docs') {
        const subResults = await scanDirectory(dirPathToScan, cwd, [], fileCount);
        results.push(...subResults);
      } else {
        const subResults = await scanDirectory(dirPathToScan, cwd, excludes, fileCount);
        results.push(...subResults);
      }
    }
    
    // Week 10: Performance optimization - process files in batches for large repos
    const isLarge = isLargeRepository(fileCount.count);
    const batchSize = getOptimalBatchSize(fileCount.count);
    
    if (isLarge && filesToScan.length > batchSize) {
      // Process files in batches for large repos
      const batchResults = await processInBatches(
        filesToScan,
        batchSize,
        async (batch: string[]) => {
          const batchResults: ScanResult[] = [];
          for (const fullPath of batch) {
            const relativePath = relative(cwd, fullPath);
            
            // Skip excluded files
            if (shouldExclude(relativePath, excludes)) {
              continue;
            }
            
            // Apply same filtering logic as before
            const entryName = fullPath.split(/[/\\]/).pop() || '';
            
            // Skip test files entirely UNLESS they're in test-pattern-detection/
            if (!relativePath.includes('test-pattern-detection/')) {
              if (entryName.includes('.test.') || 
                  entryName.includes('.spec.') || 
                  entryName.includes('test.ts') ||
                  entryName.includes('test.js') ||
                  relativePath.includes('/tests/') ||
                  relativePath.includes('\\tests\\')) {
                continue;
              }
            }
            
            // Apply same file type filtering as before
            const shouldScan = shouldScanFile(entryName, relativePath);
            if (shouldScan) {
              const fileResults = await scanFile(fullPath, cwd);
              batchResults.push(...fileResults);
            }
          }
          return batchResults;
        }
      );
      results.push(...batchResults);
    } else {
      // For small repos, process sequentially (faster for small datasets)
      for (const fullPath of filesToScan) {
        const relativePath = relative(cwd, fullPath);
        
        // Skip excluded files
        if (shouldExclude(relativePath, excludes)) {
          continue;
        }
        
        const entryName = fullPath.split(/[/\\]/).pop() || '';
        
        // Skip test files entirely UNLESS they're in test-pattern-detection/
        if (!relativePath.includes('test-pattern-detection/')) {
          if (entryName.includes('.test.') || 
              entryName.includes('.spec.') || 
              entryName.includes('test.ts') ||
              entryName.includes('test.js') ||
              relativePath.includes('/tests/') ||
              relativePath.includes('\\tests\\')) {
            continue;
          }
        }
        
        // Apply same file type filtering as before
        const shouldScan = shouldScanFile(entryName, relativePath);
        if (shouldScan) {
          const fileResults = await scanFile(fullPath, cwd);
          results.push(...fileResults);
        }
      }
    }
    
    return results;
  } catch (error: any) {
    // Skip directories that can't be read
    return results;
  }
}

/**
 * Week 10: Helper function to determine if a file should be scanned
 * Extracted from the main loop for reuse
 */
function shouldScanFile(entryName: string, relativePath: string): boolean {
  const fileName = entryName.toLowerCase();
  
  // Week 5: Scan markdown files that might contain API keys
  if (entryName.endsWith('.md')) {
    if (relativePath.includes('.github/') ||
        relativePath.includes('docs/') ||
        fileName.startsWith('readme') ||
        fileName.startsWith('changelog') ||
        relativePath.split('/').length <= 2) {
      return true;
    }
    if (relativePath.includes('validated_data/') ||
        relativePath.includes('concepts/')) {
      return false;
    }
    return relativePath.split('/').length <= 2;
  }
  
  const ext = entryName.split('.').pop()?.toLowerCase();
  
  // Always scan .env files
  if (fileName.startsWith('.env') || 
      fileName.endsWith('.env') ||
      (fileName.includes('secret') && ext === 'env')) {
    return true;
  }
  
  // Scan config files (JSON, YAML)
  if (ext === 'json' || ext === 'yaml' || ext === 'yml') {
    return relativePath.includes('config/') ||
           relativePath.includes('settings/') ||
           relativePath.includes('secrets/') ||
           relativePath.includes('test-pattern-detection/') ||
           fileName.includes('config') ||
           fileName.includes('secret') ||
           fileName.includes('personal') ||
           relativePath.split('/').length <= 2;
  }
  
  // Scan shell scripts
  if (ext === 'sh' && 
      (fileName.includes('env') || 
       fileName.includes('secret') || 
       fileName.includes('config') ||
       fileName.includes('auth') ||
       fileName.includes('claude') ||
       fileName.includes('api') ||
       fileName.includes('setup') ||
       relativePath.split('/').length <= 2)) {
    return true;
  }
  
  // Scan Python files
  if (ext === 'py' && 
      (fileName.includes('config') ||
       fileName.includes('secret') ||
       fileName.includes('env') ||
       relativePath.split('/').length <= 2)) {
    return true;
  }
  
  // Scan TypeScript/JavaScript files
  if ((ext === 'ts' || ext === 'js' || ext === 'tsx' || ext === 'jsx')) {
    if (relativePath.includes('test-pattern-detection/')) {
      return true;
    }
    if (relativePath.startsWith('src/')) {
      return !fileName.includes('pattern') && 
             !fileName.includes('test') &&
             !fileName.includes('spec');
    }
  }
  
  return false;
}

/**
 * Scan project for secrets and personal data
 */
export async function scanProject(
  cwd: string,
  options: ScanOptions = {}
): Promise<Result<ScanResult[], StorageError>> {
  try {
    // Resolve scan path to absolute path
    const scanPath = options.path ? resolve(cwd, options.path) : cwd;
    // Default ignores - these should NEVER be scanned (performance + noise)
    const excludes = [
      // Dependencies - ALWAYS skip (thousands of files, noisy)
      'node_modules',
      'vendor',
      'bower_components',
      '.pnpm',
      
      // Build outputs - skip (generated files)
      'dist',
      'build',
      'out',
      '.output',
      
      // Framework caches
      '.next',
      '.nuxt',
      '.cache',
      '.vite',
      '.turbo',
      
      // Coverage/test artifacts
      'coverage',
      '.nyc_output',
      
      // Git
      '.git',
      
      // MemoryLink's own data
      '.memorylink',
      
      // Test directories (BUT test-pattern-detection/ is special-cased)
      'tests',
      'test',
      '__tests__',
      'spec',
      
      // Documentation (usually has examples)
      'validated_data',
      'docs',
      
      // User-provided excludes
      ...(options.exclude || []),
    ];
    
    // Week 10: Performance monitoring
    const fileCount = { count: 0 };
    const { result: results, metrics } = await measurePerformance(
      'scanProject',
      async () => {
        return await scanDirectory(scanPath, cwd, excludes, fileCount);
      }
    );
    
    // Log performance metrics (only for large repos or if verbose)
    if (isLargeRepository(fileCount.count) || process.env.MEMORYLINK_VERBOSE) {
      metrics.fileCount = fileCount.count;
      logPerformance(metrics);
    }
    
    return Ok(results);
  } catch (error: any) {
    return Err(new StorageError(`Failed to scan project: ${error.message}`, 'scan'));
  }
}

/**
 * Format scan results for display
 * Human-readable format with clickable links and clear categorization
 */
export function formatScanResults(results: ScanResult[]): string {
  if (results.length === 0) {
    return '✅ No security issues found!';
  }
  
  const lines: string[] = [];
  lines.push('⚠️  SECURITY ISSUES DETECTED');
  lines.push('='.repeat(60));
  lines.push(`Found ${results.length} issue(s) that need your attention\n`);
  
  // Group by category for better organization
  const grouped = new Map<string, ScanResult[]>();
  for (const result of results) {
    const category = result.category || 'Other';
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(result);
  }
  
  // Category icons and descriptions
  const categoryInfo: Record<string, { icon: string; description: string }> = {
    'API Keys & Tokens': { 
      icon: '🔑', 
      description: 'API keys, tokens, and authentication credentials' 
    },
    'Cloud Credentials': { 
      icon: '☁️', 
      description: 'Cloud provider credentials (AWS, Azure, GCP)' 
    },
    'Database & Infrastructure': { 
      icon: '🗄️', 
      description: 'Database passwords, infrastructure secrets' 
    },
    'Payment Information': { 
      icon: '💳', 
      description: 'Credit cards, bank accounts, payment data' 
    },
    'Personal Data': { 
      icon: '👤', 
      description: 'SSN, PAN, Aadhaar, phone numbers, personal information' 
    },
    'Browser Data Leak': { 
      icon: '🌐', 
      description: 'Secrets stored in browser (localStorage, cookies, console.log)' 
    },
    'CI/CD Secrets': { 
      icon: '⚙️', 
      description: 'Secrets in CI/CD pipelines (GitHub Actions, GitLab CI, etc.)' 
    },
    'Log File Exposure': { 
      icon: '📋', 
      description: 'Secrets exposed in log files' 
    },
    'Cloud Storage Misconfiguration': { 
      icon: '📦', 
      description: 'Public cloud storage buckets (data leak risk)' 
    },
    'Credentials & Secrets': { 
      icon: '🔐', 
      description: 'Passwords, private keys, SMTP, VPN credentials' 
    },
    'Other Secrets': { 
      icon: '⚠️', 
      description: 'Other detected secrets' 
    },
  };
  
  // Sort categories by priority (most critical first)
  const categoryOrder = [
    'Payment Information',
    'Personal Data',
    'API Keys & Tokens',
    'Cloud Credentials',
    'Database & Infrastructure',
    'Browser Data Leak',
    'CI/CD Secrets',
    'Log File Exposure',
    'Cloud Storage Misconfiguration',
    'Credentials & Secrets',
    'Other Secrets',
  ];
  
  // Display each category
  for (const category of categoryOrder) {
    const categoryResults = grouped.get(category);
    if (!categoryResults || categoryResults.length === 0) {
      continue;
    }
    
    const info = categoryInfo[category] || { icon: '⚠️', description: category };
    lines.push(`${info.icon} ${category.toUpperCase()} - Found: ${categoryResults.length} issue(s)\n`);
    
    // Group by file for easier review
    const byFile = new Map<string, ScanResult[]>();
    for (const result of categoryResults) {
      if (!byFile.has(result.file)) {
        byFile.set(result.file, []);
      }
      byFile.get(result.file)!.push(result);
    }
    
    // Display each file
    for (const [file, fileResults] of byFile.entries()) {
      lines.push(`   📁 ${file}`);
      
      for (const result of fileResults) {
        // Get better preview - show the actual line content
        let preview = result.preview.trim();
        if (preview.length > 100) {
          preview = preview.substring(0, 100) + '...';
        }
        
        // Extract the secret value for display (truncate for safety)
        let secretPreview = preview;
        let secretType = result.pattern;
        
        // Make it more human-readable
        if (preview.includes('export ') || preview.includes('=')) {
          // For export statements or assignments
          if (preview.includes('export ')) {
            const match = preview.match(/export\s+([A-Z_]+)=['"]?([^'"]{0,30})/);
            if (match) {
              secretPreview = `export ${match[1]}=${match[2]}...`;
              secretType = `${result.pattern} (in ${match[1]})`;
            }
          } else if (preview.includes('=')) {
            const parts = preview.split('=');
            if (parts.length > 1) {
              const key = parts[0].trim();
              const value = parts.slice(1).join('=').trim();
              // Remove quotes if present
              const cleanValue = value.replace(/^['"]|['"]$/g, '');
              if (cleanValue.length > 25) {
                secretPreview = `${key}=${cleanValue.substring(0, 25)}...`;
              } else {
                secretPreview = `${key}=${cleanValue}`;
              }
            }
          }
        }
        
        // ANSI color codes for clickable link (cyan/bright cyan)
        // These work in most terminals (VS Code, Cursor, iTerm, etc.)
        const BRIGHT_CYAN = '\u001b[1;36m';
        const RESET = '\u001b[0m';
        const UNDERLINE = '\u001b[4m';
        
        // Create clickable link (file:line format for IDEs)
        // Most IDEs (VS Code, Cursor) recognize file:line as clickable links
        const clickableLink = `${file}:${result.line}`;
        
        // Compact format: SECRET FOUND + clickable link + type on one line
        lines.push(`      ⚠️  SECRET FOUND: ${BRIGHT_CYAN}${UNDERLINE}${clickableLink}${RESET} | 🔑 ${secretType}`);
        lines.push(`      📝 ${secretPreview}`);
        lines.push('');
      }
    }
    
    lines.push('');
  }
  
  // Summary and actions
  lines.push('='.repeat(60));
  lines.push('📊 SUMMARY');
  lines.push('='.repeat(60));
  
  for (const category of categoryOrder) {
    const count = grouped.get(category)?.length || 0;
    if (count > 0) {
      const info = categoryInfo[category] || { icon: '⚠️' };
      lines.push(`   ${info.icon} ${category}: ${count} issue(s)`);
    }
  }
  
  lines.push('');
  lines.push('💡 WHAT TO DO NEXT');
  lines.push('='.repeat(60));
  lines.push('1. Click the file:line links above to review each issue');
  lines.push('2. For API Keys: Rotate the key and use environment variables');
  lines.push('3. For Personal Data: Remove or anonymize the data');
  lines.push('4. For Payment Info: Remove immediately and check for fraud');
  lines.push('5. For Browser Leaks: Move secrets to secure server-side storage');
  lines.push('6. For Cloud Storage: Make buckets private or remove public access');
  lines.push('');
  lines.push('🔒 Remember: Exposed secrets can lead to:');
  lines.push('   • Unauthorized access to your systems');
  lines.push('   • Data breaches and financial loss');
  lines.push('   • Identity theft and fraud');
  lines.push('   • Compliance violations (GDPR, PCI-DSS)');
  lines.push('');
  
  // Add "False Positive?" escape hatch (AI suggestion from Gemini)
  const CYAN = '\x1b[0;36m';
  const DIM = '\x1b[2m';
  const RESET = '\x1b[0m';
  
  lines.push('━'.repeat(60));
  lines.push(`${DIM}💡 False positive? Use one of these options:${RESET}`);
  lines.push(`   ${CYAN}ml whitelist add <pattern>${RESET}    ${DIM}Whitelist a pattern${RESET}`);
  lines.push(`   ${CYAN}ml release -l${RESET}    ${DIM}List quarantined items for review${RESET}`);
  lines.push(`   ${CYAN}ml config --set whitelist.files="file.txt"${RESET}    ${DIM}Skip specific files${RESET}`);
  lines.push('━'.repeat(60));
  lines.push('');
  
  return lines.join('\n');
}

/**
 * v2.1: Format scan results as JSON for CI/automation
 */
export function formatScanResultsJSON(results: ScanResult[]): string {
  const jsonOutput = {
    version: '2.1.0',
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      byType: {
        secret: results.filter(r => r.type === 'secret').length,
        personal: results.filter(r => r.type === 'personal').length,
        payment: results.filter(r => r.type === 'payment').length,
        'browser-leak': results.filter(r => r.type === 'browser-leak').length,
      },
      byCategory: {} as Record<string, number>,
    },
    findings: results.map(r => ({
      file: r.file,
      line: r.line,
      type: r.type,
      pattern: r.pattern,
      patternId: r.patternId,
      category: r.category,
      // Don't include preview in JSON for security
    })),
  };

  // Count by category
  for (const result of results) {
    const category = result.category || 'Other';
    jsonOutput.summary.byCategory[category] = (jsonOutput.summary.byCategory[category] || 0) + 1;
  }

  return JSON.stringify(jsonOutput, null, 2);
}

/**
 * Execute scan command
 */
export async function executeScan(
  cwd: string,
  options: ScanOptions = {}
): Promise<void> {
  const result = await scanProject(cwd, options);
  
  if (result.ok) {
    // v2.1: JSON output for CI/automation
    if (options.json) {
      const jsonOutput = formatScanResultsJSON(result.value);
      console.log(jsonOutput);
    } else {
      const output = formatScanResults(result.value);
      console.log(output);
    }
    
    // Exit with error code if issues found
    if (result.value.length > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } else {
    if (options.json) {
      console.log(JSON.stringify({ error: result.error.message }, null, 2));
    } else {
      console.error(`❌ Error scanning project: ${result.error.message}`);
    }
    process.exit(2);
  }
}

