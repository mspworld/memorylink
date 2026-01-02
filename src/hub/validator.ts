/**
 * Pointer file validation
 * Week 6 Day 36-38: Universal hub support
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Validates that tool pointer files point to hub
 * Example: .cursorrules should contain "Read AI.md"
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { findPrimaryHub } from './detector.js';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { ValidationError } from '../core/errors.js';

/**
 * Pointer file paths to validate
 */
export const POINTER_FILES = [
  '.cursorrules',
  '.windsurfrules',
  '.github/copilot-instructions.md',
  'CLAUDE.md',
  'GEMINI.md',
] as const;

/**
 * Pointer validation result
 */
export interface PointerValidation {
  file: string;
  exists: boolean;
  pointsToHub: boolean;
  hubName?: string;
  issue?: string; // Description of issue if not valid
}

/**
 * Check if pointer file points to hub
 * Looks for patterns like "Read AI.md", "Read AGENTS.md", etc.
 */
export async function validatePointerFile(
  pointerPath: string,
  cwd: string = process.cwd()
): Promise<Result<PointerValidation, ValidationError>> {
  const fullPath = resolve(cwd, pointerPath);
  const exists = existsSync(fullPath);
  
  if (!exists) {
    return Ok({
      file: pointerPath,
      exists: false,
      pointsToHub: false,
      issue: 'File does not exist',
    });
  }
  
  try {
    const content = await readFile(fullPath, 'utf-8');
    const primaryHub = await findPrimaryHub(cwd);
    
    if (!primaryHub) {
      return Ok({
        file: pointerPath,
        exists: true,
        pointsToHub: false,
        issue: 'No hub file found in project',
      });
    }
    
    // Check if content references the hub
    // Look for patterns: "Read AI.md", "Read AGENTS.md", "Read AGENT.md"
    // Case-insensitive, flexible patterns
    const hubName = primaryHub.name;
    const hubNameWithoutExt = hubName.replace(/\.md$/i, '');
    
    const patterns = [
      new RegExp(`read\\s+${hubName}`, 'i'),
      new RegExp(`read\\s+${hubNameWithoutExt}`, 'i'),
      new RegExp(`see\\s+${hubName}`, 'i'),
      new RegExp(`see\\s+${hubNameWithoutExt}`, 'i'),
      new RegExp(`reference\\s+${hubName}`, 'i'),
      new RegExp(`reference\\s+${hubNameWithoutExt}`, 'i'),
      new RegExp(hubName, 'i'), // Simple mention
    ];
    
    const pointsToHub = patterns.some(pattern => pattern.test(content));
    
    return Ok({
      file: pointerPath,
      exists: true,
      pointsToHub,
      hubName: primaryHub.name,
      issue: pointsToHub ? undefined : `Does not reference ${hubName}`,
    });
  } catch (error: any) {
    return Err(new ValidationError(
      `Failed to read pointer file: ${error.message}`,
      'pointer_validation'
    ));
  }
}

/**
 * Validate all pointer files
 */
export async function validateAllPointers(
  cwd: string = process.cwd()
): Promise<Result<PointerValidation[], ValidationError>> {
  const results: PointerValidation[] = [];
  
  for (const pointerFile of POINTER_FILES) {
    const result = await validatePointerFile(pointerFile, cwd);
    if (!result.ok) {
      return result;
    }
    results.push(result.value);
  }
  
  return Ok(results);
}

