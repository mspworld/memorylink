/**
 * ID generation utilities
 * Generate MemoryRecord IDs
 * Format: "mem_" + timestamp + random
 */

import { randomBytes } from 'crypto';

/**
 * Generate MemoryRecord ID
 * Format: "mem_" + timestamp + random hex
 * Based on SPEC.md: "mem_" + timestamp + random
 */
export function generateRecordId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString('hex');
  return `mem_${timestamp}_${random}`;
}

/**
 * Validate record ID format
 */
export function isValidRecordId(id: string): boolean {
  return /^mem_[a-z0-9]+_[a-f0-9]{8}$/.test(id);
}

