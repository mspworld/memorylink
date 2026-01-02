/**
 * Spec-code drift detection
 * Week 9 Day 63: All drift detection
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Detects inconsistencies between code and SPEC.md
 */

import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { readFile } from 'fs/promises';

/**
 * Spec drift result
 */
export interface SpecDriftResult {
  issues: Array<{
    type: 'missing_command' | 'missing_feature' | 'extra_feature' | 'version_mismatch';
    description: string;
    severity: 'error' | 'warning';
  }>;
  total_issues: number;
}

/**
 * Detect spec-code drift
 * Compares implementation with SPEC.md requirements
 */
export async function detectSpecDrift(
  cwd: string
): Promise<Result<SpecDriftResult, StorageError>> {
  const issues: SpecDriftResult['issues'] = [];
  
  // Check if SPEC.md exists
  const specPath = resolve(cwd, 'SPEC.md');
  if (!existsSync(specPath)) {
    // No SPEC.md - can't check drift
    return Ok({
      issues: [{
        type: 'missing_feature',
        description: 'SPEC.md not found - cannot verify spec compliance',
        severity: 'warning',
      }],
      total_issues: 1,
    });
  }
  
  try {
    const specContent = await readFile(specPath, 'utf-8');
    
    // Check for required commands (from SPEC.md v4.3.10)
    const requiredCommands = [
      'ml capture',
      'ml query',
      'ml promote',
      'ml audit',
      'ml gate',
    ];
    
    // Check if commands exist in CLI
    const { readFile: readCLI } = await import('fs/promises');
    const cliPath = resolve(cwd, 'src', 'cli', 'index.ts');
    if (existsSync(cliPath)) {
      const cliContent = await readCLI(cliPath, 'utf-8');
      
      for (const cmd of requiredCommands) {
        const cmdName = cmd.replace('ml ', '');
        if (!cliContent.includes(`.command('${cmdName}')`)) {
          issues.push({
            type: 'missing_command',
            description: `Command '${cmd}' not found in CLI implementation`,
            severity: 'error',
          });
        }
      }
    }
    
    // Check for SPEC.md version
    const versionMatch = specContent.match(/v(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      const specVersion = versionMatch[1];
      // Check package.json version
      const packagePath = resolve(cwd, 'package.json');
      if (existsSync(packagePath)) {
        const packageContent = await readFile(packagePath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        const packageVersion = packageJson.version || '0.0.0';
        
        if (specVersion !== packageVersion) {
          issues.push({
            type: 'version_mismatch',
            description: `SPEC.md version (${specVersion}) does not match package.json version (${packageVersion})`,
            severity: 'warning',
          });
        }
      }
    }
    
    // Check for evidence levels (E0, E1, E2)
    const hasE0 = specContent.includes('E0') || specContent.includes('EvidenceLevel');
    const hasE1 = specContent.includes('E1') || specContent.includes('EvidenceLevel');
    const hasE2 = specContent.includes('E2') || specContent.includes('EvidenceLevel');
    
    // Check if types are implemented
    const typesPath = resolve(cwd, 'src', 'core', 'types.ts');
    if (existsSync(typesPath)) {
      const typesContent = await readFile(typesPath, 'utf-8');
      if (hasE0 && !typesContent.includes("'E0'")) {
        issues.push({
          type: 'missing_feature',
          description: 'E0 evidence level not found in types',
          severity: 'error',
        });
      }
      if (hasE1 && !typesContent.includes("'E1'")) {
        issues.push({
          type: 'missing_feature',
          description: 'E1 evidence level not found in types',
          severity: 'error',
        });
      }
      if (hasE2 && !typesContent.includes("'E2'")) {
        issues.push({
          type: 'missing_feature',
          description: 'E2 evidence level not found in types',
          severity: 'error',
        });
      }
    }
    
    // Check for quarantine system
    if (specContent.includes('QUARANTINED') || specContent.includes('quarantine')) {
      const quarantinePath = resolve(cwd, 'src', 'quarantine');
      if (!existsSync(quarantinePath)) {
        issues.push({
          type: 'missing_feature',
          description: 'Quarantine system required by SPEC.md but not found',
          severity: 'error',
        });
      }
    }
    
    // Check for gate system
    if (specContent.includes('ml gate') || specContent.includes('gate')) {
      const gatePath = resolve(cwd, 'src', 'gate');
      if (!existsSync(gatePath)) {
        issues.push({
          type: 'missing_feature',
          description: 'Gate system required by SPEC.md but not found',
          severity: 'error',
        });
      }
    }
    
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to detect spec drift: ${error.message}`,
      'spec_drift'
    ));
  }
  
  return Ok({
    issues,
    total_issues: issues.length,
  });
}

