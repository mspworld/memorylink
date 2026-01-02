/**
 * Tool pointer file generator
 * Week 6 Day 42: Tool integration
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Generates pointer files that point to universal hub (AGENTS.md)
 */

import { writeFile } from 'fs/promises';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import { findPrimaryHub } from '../hub/detector.js';

/**
 * Generate .cursorrules file
 */
export async function generateCursorRules(
  cwd: string = process.cwd(),
  hubName: string = 'AGENTS.md'
): Promise<Result<void, StorageError>> {
  try {
    const cursorRulesPath = resolve(cwd, '.cursorrules');
    const content = `# Cursor AI Rules

Read ${hubName} for complete project instructions.

This file points to the universal hub to ensure consistency across all AI tools.

---

**Primary Reference:** ${hubName}
`;
    
    await writeFile(cursorRulesPath, content, 'utf-8');
    return Ok(undefined);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to generate .cursorrules: ${error.message}`,
      'pointer_generation'
    ));
  }
}

/**
 * Generate CLAUDE.md file
 */
export async function generateClaudeMd(
  cwd: string = process.cwd(),
  hubName: string = 'AGENTS.md'
): Promise<Result<void, StorageError>> {
  try {
    const claudePath = resolve(cwd, 'CLAUDE.md');
    const content = `# Claude Code Configuration

Read ${hubName} for complete project instructions.

This file points to the universal hub to ensure consistency across all AI tools.

---

**Primary Reference:** ${hubName}
`;
    
    await writeFile(claudePath, content, 'utf-8');
    return Ok(undefined);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to generate CLAUDE.md: ${error.message}`,
      'pointer_generation'
    ));
  }
}

/**
 * Generate GitHub Copilot instructions
 */
export async function generateCopilotInstructions(
  cwd: string = process.cwd(),
  hubName: string = 'AGENTS.md'
): Promise<Result<void, StorageError>> {
  try {
    const copilotDir = resolve(cwd, '.github');
    if (!existsSync(copilotDir)) {
      // Create .github directory if it doesn't exist
      const { mkdir } = await import('fs/promises');
      await mkdir(copilotDir, { recursive: true });
    }
    
    const copilotPath = join(copilotDir, 'copilot-instructions.md');
    const content = `# GitHub Copilot Instructions

Read ${hubName} for complete project instructions.

This file points to the universal hub to ensure consistency across all AI tools.

---

**Primary Reference:** ${hubName}
`;
    
    await writeFile(copilotPath, content, 'utf-8');
    return Ok(undefined);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to generate copilot-instructions.md: ${error.message}`,
      'pointer_generation'
    ));
  }
}

/**
 * Generate all pointer files
 */
export async function generateAllPointers(
  cwd: string = process.cwd()
): Promise<Result<void, StorageError>> {
  // Find primary hub
  const primaryHub = await findPrimaryHub(cwd);
  const hubName = primaryHub?.name || 'AGENTS.md';
  
  // Generate all pointer files
  const results = await Promise.all([
    generateCursorRules(cwd, hubName),
    generateClaudeMd(cwd, hubName),
    generateCopilotInstructions(cwd, hubName),
  ]);
  
  // Check for errors
  for (const result of results) {
    if (!result.ok) {
      return result;
    }
  }
  
  return Ok(undefined);
}

