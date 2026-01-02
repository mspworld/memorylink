/**
 * MemoryLink Self-Check Command
 * Verifies installation and configuration is correct
 * 
 * Based on Perplexity AI hardening recommendations
 */

import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { out } from '../output.js';

/**
 * Result of a single check
 */
interface CheckResult {
  name: string;
  success: boolean;
  message: string;
  fix?: string;
}

/**
 * Run all self-checks
 */
export async function runSelfCheck(cwd: string): Promise<void> {
  out.brand();
  out.header('MEMORYLINK SELF-CHECK');
  out.print(`  ${out.dim('Verifying installation and configuration...')}`);
  out.newline();

  const checks: CheckResult[] = [];

  // Run all checks
  checks.push(await checkMLDirectory(cwd));
  checks.push(await checkGitignore(cwd));
  checks.push(await checkGitHooks(cwd));
  checks.push(await checkEncryptionKey(cwd));
  checks.push(await checkConfig(cwd));
  checks.push(await checkPermissions(cwd));
  checks.push(await checkPatterns(cwd));

  // Display results
  let passed = 0;
  let failed = 0;

  out.print(`  ${out.highlight('Results:')}`);
  out.newline();

  for (const check of checks) {
    if (check.success) {
      out.print(`    ${out.green('✓')} ${check.message}`);
      passed++;
    } else {
      out.print(`    ${out.red('✗')} ${check.message}`);
      if (check.fix) {
        out.print(`      ${out.dim('Fix:')} ${out.cmd(check.fix)}`);
      }
      failed++;
    }
  }

  out.newline();
  out.divider();
  out.newline();

  // Summary
  if (failed === 0) {
    out.success(`All ${passed} checks passed!`);
    out.print(`    ${out.dim('MemoryLink is properly configured.')}`);
  } else {
    out.error(`${failed} check(s) failed, ${passed} passed`);
    out.print(`    ${out.dim('Run the suggested fixes above.')}`);
  }
  out.newline();

  // Exit with appropriate code
  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * Check .memorylink directory structure
 */
async function checkMLDirectory(cwd: string): Promise<CheckResult> {
  const mlDir = join(cwd, '.memorylink');

  if (!existsSync(mlDir)) {
    return {
      name: 'ml_directory',
      success: false,
      message: '.memorylink/ directory not found',
      fix: 'ml init',
    };
  }

  const requiredDirs = ['records', 'quarantined', 'audit'];
  const missing: string[] = [];

  for (const dir of requiredDirs) {
    if (!existsSync(join(mlDir, dir))) {
      missing.push(dir);
    }
  }

  if (missing.length > 0) {
    return {
      name: 'ml_directory',
      success: false,
      message: `Missing directories: ${missing.join(', ')}`,
      fix: 'ml init',
    };
  }

  return {
    name: 'ml_directory',
    success: true,
    message: '.memorylink/ directory structure valid',
  };
}

/**
 * Check .gitignore configuration
 */
async function checkGitignore(cwd: string): Promise<CheckResult> {
  const gitignorePath = join(cwd, '.gitignore');

  if (!existsSync(gitignorePath)) {
    return {
      name: 'gitignore',
      success: false,
      message: '.gitignore not found',
      fix: 'ml init',
    };
  }

  try {
    const gitignore = await readFile(gitignorePath, 'utf-8');

    // Check for critical entries
    const requiredEntries = [
      '.memorylink/',
    ];

    const missing: string[] = [];
    for (const entry of requiredEntries) {
      if (!gitignore.includes(entry)) {
        missing.push(entry);
      }
    }

    if (missing.length > 0) {
      return {
        name: 'gitignore',
        success: false,
        message: `.gitignore missing: ${missing.join(', ')}`,
        fix: 'ml init',
      };
    }

    return {
      name: 'gitignore',
      success: true,
      message: '.gitignore properly configured',
    };
  } catch (error: any) {
    return {
      name: 'gitignore',
      success: false,
      message: `Failed to read .gitignore: ${error.message}`,
    };
  }
}

/**
 * Check Git hooks installation
 */
async function checkGitHooks(cwd: string): Promise<CheckResult> {
  const gitDir = join(cwd, '.git');
  
  if (!existsSync(gitDir)) {
    return {
      name: 'git_hooks',
      success: false,
      message: 'Not a Git repository',
      fix: 'git init',
    };
  }

  const preCommitPath = join(gitDir, 'hooks', 'pre-commit');

  if (!existsSync(preCommitPath)) {
    return {
      name: 'git_hooks',
      success: false,
      message: 'Git pre-commit hook not installed',
      fix: 'ml hooks install',
    };
  }

  try {
    const hookContent = await readFile(preCommitPath, 'utf-8');

    if (!hookContent.includes('ml gate') && !hookContent.includes('memorylink')) {
      return {
        name: 'git_hooks',
        success: false,
        message: 'Git hook exists but missing MemoryLink gate',
        fix: 'ml hooks install --force',
      };
    }

    return {
      name: 'git_hooks',
      success: true,
      message: 'Git hooks installed and configured',
    };
  } catch (error: any) {
    return {
      name: 'git_hooks',
      success: false,
      message: `Failed to read hook: ${error.message}`,
    };
  }
}

/**
 * Check encryption key
 */
async function checkEncryptionKey(cwd: string): Promise<CheckResult> {
  const mlDir = join(cwd, '.memorylink');
  const keyPath = join(mlDir, '.memorylink-key');

  // Key is created on first quarantine, so not existing is OK
  if (!existsSync(keyPath)) {
    return {
      name: 'encryption_key',
      success: true,
      message: 'Encryption key will be created on first quarantine',
    };
  }

  try {
    const stats = await stat(keyPath);
    const mode = (stats.mode & 0o777).toString(8);

    // Should be 600 (rw-------)
    if (mode !== '600') {
      return {
        name: 'encryption_key',
        success: false,
        message: `Encryption key has wrong permissions: ${mode} (should be 600)`,
        fix: `chmod 600 ${keyPath}`,
      };
    }

    return {
      name: 'encryption_key',
      success: true,
      message: 'Encryption key configured (600 permissions)',
    };
  } catch (error: any) {
    return {
      name: 'encryption_key',
      success: false,
      message: `Failed to check encryption key: ${error.message}`,
    };
  }
}

/**
 * Check config file
 */
async function checkConfig(cwd: string): Promise<CheckResult> {
  const configPath = join(cwd, '.memorylink', 'config.json');

  if (!existsSync(configPath)) {
    return {
      name: 'config',
      success: false,
      message: 'Config file not found',
      fix: 'ml init',
    };
  }

  try {
    const configContent = await readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Check for required fields
    const requiredFields = ['version'];
    const missing: string[] = [];

    for (const field of requiredFields) {
      if (!(field in config)) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return {
        name: 'config',
        success: false,
        message: `Config missing fields: ${missing.join(', ')}`,
        fix: 'ml init',
      };
    }

    return {
      name: 'config',
      success: true,
      message: `Config valid (v${config.version || '1.0'})`,
    };
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      return {
        name: 'config',
        success: false,
        message: 'Config file is corrupted (invalid JSON)',
        fix: 'rm .memorylink/config.json && ml init',
      };
    }
    return {
      name: 'config',
      success: false,
      message: `Failed to read config: ${error.message}`,
    };
  }
}

/**
 * Check directory permissions
 */
async function checkPermissions(cwd: string): Promise<CheckResult> {
  const mlDir = join(cwd, '.memorylink');

  if (!existsSync(mlDir)) {
    return {
      name: 'permissions',
      success: false,
      message: '.memorylink/ not found',
      fix: 'ml init',
    };
  }

  const sensitiveDirs = ['quarantined', 'records', 'audit'];
  const issues: string[] = [];

  for (const dir of sensitiveDirs) {
    const dirPath = join(mlDir, dir);
    if (!existsSync(dirPath)) continue;

    try {
      const stats = await stat(dirPath);
      const mode = (stats.mode & 0o777).toString(8);

      // Should be 700 or 755
      if (mode !== '700' && mode !== '755') {
        issues.push(`${dir}: ${mode}`);
      }
    } catch {
      // Skip if can't stat
    }
  }

  if (issues.length > 0) {
    return {
      name: 'permissions',
      success: false,
      message: `Wrong permissions: ${issues.join(', ')}`,
      fix: `chmod 700 ${join(mlDir, 'quarantined')}`,
    };
  }

  return {
    name: 'permissions',
    success: true,
    message: 'Directory permissions correct',
  };
}

/**
 * Check secret patterns are loaded
 */
async function checkPatterns(_cwd: string): Promise<CheckResult> {
  try {
    // Dynamic import of patterns
    const { SECRET_PATTERNS } = await import('../../quarantine/patterns.js');

    if (!SECRET_PATTERNS || SECRET_PATTERNS.length === 0) {
      return {
        name: 'patterns',
        success: false,
        message: 'No secret patterns loaded',
      };
    }

    return {
      name: 'patterns',
      success: true,
      message: `${SECRET_PATTERNS.length} secret patterns loaded`,
    };
  } catch (error: any) {
    return {
      name: 'patterns',
      success: false,
      message: `Failed to load patterns: ${error.message}`,
    };
  }
}

