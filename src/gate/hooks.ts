/**
 * Git hooks installation and management
 * Week 8 Day 50-52: Git hooks integration
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Installs pre-commit and pre-push hooks
 * Provides override mechanism
 */

import { readFile, writeFile, chmod, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';

/**
 * Install git hooks
 */
export async function installHooks(
  cwd: string = process.cwd(),
  force: boolean = false
): Promise<Result<void, StorageError>> {
  const gitDir = resolve(cwd, '.git');
  const hooksDir = join(gitDir, 'hooks');
  
  // Check if .git directory exists
  if (!existsSync(gitDir)) {
    return Err(new StorageError(
      'Not a Git repository. Run: git init',
      'not_git_repo'
    ));
  }
  
  // Create hooks directory if it doesn't exist
  try {
    await mkdir(hooksDir, { recursive: true });
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to create hooks directory: ${error.message}`,
      'hook_installation'
    ));
  }
  
  // Install pre-commit hook
  const preCommitResult = await installHook(
    hooksDir,
    'pre-commit',
    'pre-commit.template',
    force
  );
  if (!preCommitResult.ok) {
    return preCommitResult;
  }
  
  // Install pre-push hook
  const prePushResult = await installHook(
    hooksDir,
    'pre-push',
    'pre-push.template',
    force
  );
  if (!prePushResult.ok) {
    return prePushResult;
  }
  
  return Ok(undefined);
}

/**
 * Install a single hook
 */
async function installHook(
  hooksDir: string,
  hookName: string,
  templateName: string,
  force: boolean = false
): Promise<Result<void, StorageError>> {
  const hookPath = join(hooksDir, hookName);
  
  // Check if hook already exists
  if (existsSync(hookPath) && !force) {
    // Check if it's already a MemoryLink hook
    try {
      const existingContent = await readFile(hookPath, 'utf-8');
      if (existingContent.includes('MemoryLink')) {
        // Already installed - skip
        return Ok(undefined);
      } else {
        // Different hook exists - don't overwrite unless forced
        return Err(new StorageError(
          `Hook ${hookName} already exists. Use --force to overwrite.`,
          'hook_exists'
        ));
      }
    } catch (error: any) {
      return Err(new StorageError(
        `Failed to read existing hook: ${error.message}`,
        'hook_read'
      ));
    }
  }
  
  // Read template
  const templatePath = resolve(__dirname, '../../templates', templateName);
  let templateContent: string;
  
  try {
    templateContent = await readFile(templatePath, 'utf-8');
  } catch (error: any) {
    // Template not found - create basic version
    templateContent = getBasicHookTemplate(hookName);
  }
  
  // Write hook file
  try {
    await writeFile(hookPath, templateContent, 'utf-8');
    // Make executable
    await chmod(hookPath, 0o755);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to write hook ${hookName}: ${error.message}`,
      'hook_write'
    ));
  }
  
  return Ok(undefined);
}

/**
 * Get basic hook template (fallback if template file not found)
 * IDEMPOTENT: Contains marker comment for detection
 * 
 * Smart mode switching:
 * - Reads ML_MODE env var for one-time overrides
 * - Uses config for persistent mode
 * - Priority: flag > ML_MODE env > config > default (inactive)
 */
function getBasicHookTemplate(hookName: string): string {
  const marker = '# MemoryLink Gate - Auto-installed';
  
  if (hookName === 'pre-commit') {
    return `#!/bin/sh
${marker}
# Checks staged files for secrets before commit
# Smart mode: reads ML_MODE env var for one-time override
# Usage: ML_MODE=active git commit -m "msg"  (force block)
#        ML_MODE=inactive git commit -m "msg"  (force warn-only)

# Check if ml is installed
if ! command -v ml &> /dev/null; then
  echo "⚠️  MemoryLink not found. Install: npm install -g memorylink"
  exit 0
fi

# Build mode flag if ML_MODE is set
MODE_FLAG=""
if [ -n "$ML_MODE" ]; then
  MODE_FLAG="--mode $ML_MODE"
fi

# Run MemoryLink gate check on changed files (fast)
exec ml gate --diff --rule block-quarantined $MODE_FLAG
`;
  } else if (hookName === 'pre-push') {
    return `#!/bin/sh
${marker}
# Full project scan before push
# Smart mode: reads ML_MODE env var for one-time override
# Usage: ML_MODE=active git push  (force block)
#        ML_MODE=inactive git push  (force warn-only)
# Bypass: git push --no-verify  (skip all hooks)

# Check if ml is installed
if ! command -v ml &> /dev/null; then
  echo "⚠️  MemoryLink not found. Install: npm install -g memorylink"
  exit 0
fi

# Build mode flag if ML_MODE is set
MODE_FLAG=""
if [ -n "$ML_MODE" ]; then
  MODE_FLAG="--mode $ML_MODE"
fi

# Run MemoryLink gate check (full scan)
exec ml gate --rule block-quarantined $MODE_FLAG
`;
  }
  return `#!/bin/sh
${marker}
# Smart mode: reads ML_MODE env var
MODE_FLAG=""
if [ -n "$ML_MODE" ]; then
  MODE_FLAG="--mode $ML_MODE"
fi
exec ml gate --rule block-quarantined $MODE_FLAG
`;
}

/**
 * Uninstall git hooks
 */
export async function uninstallHooks(
  cwd: string = process.cwd()
): Promise<Result<void, StorageError>> {
  const gitDir = resolve(cwd, '.git');
  const hooksDir = join(gitDir, 'hooks');
  
  if (!existsSync(hooksDir)) {
    return Ok(undefined); // No hooks directory - nothing to uninstall
  }
  
  const hooks = ['pre-commit', 'pre-push'];
  
  for (const hookName of hooks) {
    const hookPath = join(hooksDir, hookName);
    
    if (existsSync(hookPath)) {
      // Check if it's a MemoryLink hook
      try {
        const content = await readFile(hookPath, 'utf-8');
        if (content.includes('MemoryLink')) {
          // Remove MemoryLink hook
          const { unlink } = await import('fs/promises');
          await unlink(hookPath);
        }
      } catch (error: any) {
        // Ignore errors - hook might not be readable
      }
    }
  }
  
  return Ok(undefined);
}

