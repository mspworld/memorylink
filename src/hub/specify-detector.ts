/**
 * .specify/ layout detection
 * Week 6 Day 36-38: Universal hub support
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Detects and validates .specify/ directory structure
 * Spec-Driven Development (SDD) pattern
 */

import { existsSync } from 'fs';
import { resolve, join } from 'path';

/**
 * .specify/ directory structure
 */
export interface SpecifyLayout {
  root: string; // Path to .specify/
  hasMemory: boolean; // .specify/memory/ exists
  hasSpecs: boolean; // .specify/specs/ exists
  hasWorkflows: boolean; // .specify/workflows/ exists
  constitutionPath?: string; // .specify/memory/constitution.md
  planPath?: string; // .specify/memory/plan.md
}

/**
 * Detect .specify/ layout in project
 */
export async function detectSpecifyLayout(
  cwd: string = process.cwd()
): Promise<SpecifyLayout | null> {
  const specifyRoot = resolve(cwd, '.specify');
  
  if (!existsSync(specifyRoot)) {
    return null;
  }
  
  const memoryPath = join(specifyRoot, 'memory');
  const specsPath = join(specifyRoot, 'specs');
  const workflowsPath = join(specifyRoot, 'workflows');
  
  const layout: SpecifyLayout = {
    root: specifyRoot,
    hasMemory: existsSync(memoryPath),
    hasSpecs: existsSync(specsPath),
    hasWorkflows: existsSync(workflowsPath),
  };
  
  // Check for specific files
  if (layout.hasMemory) {
    const constitutionPath = join(memoryPath, 'constitution.md');
    const planPath = join(memoryPath, 'plan.md');
    
    if (existsSync(constitutionPath)) {
      layout.constitutionPath = constitutionPath;
    }
    if (existsSync(planPath)) {
      layout.planPath = planPath;
    }
  }
  
  return layout;
}

/**
 * Check if project uses .specify/ layout
 */
export async function usesSpecifyLayout(cwd: string = process.cwd()): Promise<boolean> {
  const layout = await detectSpecifyLayout(cwd);
  return layout !== null;
}

/**
 * Get file tier based on .specify/ layout
 * Tier 1: constitution.md, .specify/memory/constitution.md
 * Tier 3: .specify/memory/plan.md, .specify/specs/*
 */
export function getSpecifyFileTier(filePath: string, cwd: string = process.cwd()): number | null {
  const normalized = filePath.replace(/\\/g, '/');
  const relative = normalized.startsWith(cwd) 
    ? normalized.substring(cwd.length + 1)
    : normalized;
  
  // Tier 1: Constitution
  if (relative === '.specify/memory/constitution.md' || relative === 'constitution.md') {
    return 1;
  }
  
  // Tier 3: Plans and specs
  if (relative.startsWith('.specify/memory/plan.md') || 
      relative.startsWith('.specify/specs/')) {
    return 3;
  }
  
  // Tier 5: Workflows
  if (relative.startsWith('.specify/workflows/')) {
    return 5;
  }
  
  return null;
}

