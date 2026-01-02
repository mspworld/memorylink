/**
 * ml promote-plan command
 * Week 6 Day 42: Tool integration
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Promotes Cursor plan files from .cursor/plans/ to docs/plans/
 * Scans for secrets before allowing promotion
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join, basename } from 'path';
import type { Result } from '../../core/types.js';
import { Ok, Err } from '../../core/types.js';
import { ValidationError, StorageError } from '../../core/errors.js';
import { getTrustedFileName } from '../../validation/draft-tier.js';

/**
 * Promote plan options
 */
export interface PromotePlanOptions {
  planFile: string; // Path to plan file (e.g., "feature-x.md" or ".cursor/plans/feature-x.md")
}

/**
 * Promote a Cursor plan file
 * 
 * Workflow:
 * 1. Check if file is in .cursor/plans/ (auto-ignored)
 * 2. Scan for secrets
 * 3. If clean, copy to docs/plans/
 * 4. Now safe to commit
 */
export async function promotePlan(
  cwd: string,
  options: PromotePlanOptions
): Promise<Result<void, ValidationError | StorageError>> {
  // Resolve plan file path
  let planPath: string;
  if (options.planFile.startsWith('.cursor/plans/')) {
    planPath = resolve(cwd, options.planFile);
  } else if (options.planFile.includes('/')) {
    planPath = resolve(cwd, options.planFile);
  } else {
    // Assume it's in .cursor/plans/
    planPath = resolve(cwd, '.cursor/plans', options.planFile);
  }

  // Check if file exists
  if (!existsSync(planPath)) {
    return Err(new ValidationError(
      `Plan file not found: ${planPath}`,
      'file_not_found'
    ));
  }

  // Read plan content
  let planContent: string;
  try {
    planContent = await readFile(planPath, 'utf-8');
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to read plan file: ${error.message}`,
      'file_read'
    ));
  }

  // Week 6: Scan for secrets before promotion
  console.log('🔍 Scanning plan file for secrets...');
  
  // Check by scanning the file content directly
  const { detectSecrets } = await import('../../quarantine/detector.js');
  const detection = detectSecrets(planContent, cwd, planPath);
  
  if (detection.found) {
    console.log('');
    console.log('❌ Plan file contains secrets!');
    console.log(`   Pattern: ${detection.pattern?.name || 'Unknown'}`);
    console.log('   Fix issues before promoting.');
    console.log('');
    return Err(new ValidationError(
      `Plan file contains secrets. Fix issues before promoting.`,
      'secrets_detected'
    ));
  }
  
  console.log('✅ No secrets detected');
  console.log('');

  // Create docs/plans/ directory if needed
  const docsPlansDir = resolve(cwd, 'docs', 'plans');
  const { mkdir } = await import('fs/promises');
  try {
    await mkdir(docsPlansDir, { recursive: true });
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to create docs/plans/ directory: ${error.message}`,
      'directory_creation'
    ));
  }

  // Copy plan to docs/plans/
  const planFileName = basename(planPath);
  const trustedFileName = getTrustedFileName(planFileName);
  const targetPath = join(docsPlansDir, trustedFileName);

  try {
    await writeFile(targetPath, planContent, 'utf-8');
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to write plan file: ${error.message}`,
      'file_write'
    ));
  }

  console.log(`✅ Plan promoted: ${planPath} → ${targetPath}`);
  console.log(`   Now safe to commit!`);

  return Ok(undefined);
}

/**
 * Execute promote-plan command
 */
export async function executePromotePlan(
  cwd: string,
  options: PromotePlanOptions
): Promise<void> {
  const result = await promotePlan(cwd, options);
  
  if (result.ok) {
    process.exit(0);
  } else {
    console.error(`❌ Error: ${result.error.message}`);
    process.exit(result.error.exitCode || 1);
  }
}

