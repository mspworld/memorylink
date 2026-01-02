/**
 * Universal hub file detection
 * Week 6 Day 36-38: Universal hub support
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Detects AI.md, AGENTS.md, AGENT.md files (universal hubs)
 * Single source of truth for all AI tools
 */

import { existsSync } from 'fs';
import { resolve } from 'path';
import { isHubFile } from '../protection/hub-files.js';

/**
 * Hub file information
 */
export interface HubFile {
  path: string;
  name: string; // 'AI.md', 'AGENTS.md', or 'AGENT.md'
  tier: number; // Protection tier (2 for hubs)
}

/**
 * Find all hub files in project
 * Returns all hub files found (AI.md, AGENTS.md, AGENT.md)
 */
export async function findAllHubs(cwd: string = process.cwd()): Promise<HubFile[]> {
  const hubs: HubFile[] = [];
  const hubNames = ['AI.md', 'AGENTS.md', 'AGENT.md'];
  
  for (const hubName of hubNames) {
    const hubPath = resolve(cwd, hubName);
    if (existsSync(hubPath) && isHubFile(hubPath, cwd)) {
      hubs.push({
        path: hubPath,
        name: hubName,
        tier: 2, // Tier 2: Universal hubs (locked)
      });
    }
  }
  
  return hubs;
}

/**
 * Find primary hub (highest precedence)
 * Precedence: AI.md > AGENTS.md > AGENT.md
 */
export async function findPrimaryHub(cwd: string = process.cwd()): Promise<HubFile | null> {
  const hubs = await findAllHubs(cwd);
  
  // Precedence order: AI.md > AGENTS.md > AGENT.md
  const precedence = ['AI.md', 'AGENTS.md', 'AGENT.md'];
  
  for (const name of precedence) {
    const hub = hubs.find(h => h.name === name);
    if (hub) {
      return hub;
    }
  }
  
  return null;
}

/**
 * Check if project has any hub files
 */
export async function hasHub(cwd: string = process.cwd()): Promise<boolean> {
  const hubs = await findAllHubs(cwd);
  return hubs.length > 0;
}

