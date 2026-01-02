/**
 * Consistency checks for tool pointers
 * Week 9 Day 63: All drift detection
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Checks that AI tool pointer files point to universal hub
 */

import type { Result } from '../core/types.js';
import { Ok } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { validatePointerFile } from '../hub/validator.js';
import { findAllHubs } from '../hub/detector.js';

/**
 * Consistency check result
 */
export interface ConsistencyResult {
  issues: Array<{
    file: string;
    type: 'missing_pointer' | 'invalid_pointer' | 'missing_hub' | 'package_conflict';
    description: string;
    severity: 'error' | 'warning';
  }>;
  total_issues: number;
}

/**
 * Check consistency of tool pointers and hub files
 */
export async function checkConsistency(
  cwd: string
): Promise<Result<ConsistencyResult, StorageError>> {
  const issues: ConsistencyResult['issues'] = [];
  
  // Find universal hub files
  const hubFiles = await findAllHubs(cwd);
  const primaryHub = hubFiles.find((f) => 
    f.name.toLowerCase().includes('agents.md') || 
    f.name.toLowerCase().includes('ai.md')
  );
  
  if (!primaryHub) {
    issues.push({
      file: 'AGENTS.md or AI.md',
      type: 'missing_hub',
      description: 'No universal hub file (AGENTS.md or AI.md) found',
      severity: 'warning',
    });
  }
  
  // Check tool pointer files
  const pointerFiles = [
    { path: '.cursorrules', name: 'Cursor AI' },
    { path: 'CLAUDE.md', name: 'Claude Code' },
    { path: 'copilot-instructions.md', name: 'GitHub Copilot' },
  ];
  
  for (const pointer of pointerFiles) {
    const pointerPath = resolve(cwd, pointer.path);
    if (existsSync(pointerPath)) {
      // Validate pointer file
      const validation = await validatePointerFile(pointerPath, cwd);
      if (!validation.ok) {
        issues.push({
          file: pointer.path,
          type: 'invalid_pointer',
          description: `${pointer.name} pointer file does not point to universal hub: ${validation.error.message}`,
          severity: 'error',
        });
      }
    } else {
      // Pointer file missing - not required, but recommended
      issues.push({
        file: pointer.path,
        type: 'missing_pointer',
        description: `${pointer.name} pointer file not found (recommended for tool integration)`,
        severity: 'warning',
      });
    }
  }
  
  // Check for package manager conflicts
  const packageManagers = [
    { file: 'package.json', name: 'npm/yarn' },
    { file: 'requirements.txt', name: 'pip' },
    { file: 'Cargo.toml', name: 'cargo' },
    { file: 'go.mod', name: 'go' },
  ];
  
  const foundManagers = packageManagers.filter(pm => 
    existsSync(resolve(cwd, pm.file))
  );
  
  if (foundManagers.length > 1) {
    issues.push({
      file: foundManagers.map(pm => pm.file).join(', '),
      type: 'package_conflict',
      description: `Multiple package managers detected: ${foundManagers.map(pm => pm.name).join(', ')}. This may cause dependency conflicts.`,
      severity: 'warning',
    });
  }
  
  // Check for .specify/ layout
  const specifyPath = resolve(cwd, '.specify');
  if (existsSync(specifyPath)) {
    // Verify .specify/ structure is valid
    const { usesSpecifyLayout } = await import('../hub/specify-detector.js');
    if (!await usesSpecifyLayout(cwd)) {
      issues.push({
        file: '.specify/',
        type: 'invalid_pointer',
        description: '.specify/ directory exists but does not follow expected layout',
        severity: 'warning',
      });
    }
  }
  
  return Ok({
    issues,
    total_issues: issues.length,
  });
}

