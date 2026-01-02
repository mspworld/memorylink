/**
 * Path utilities for MemoryLink storage
 * Week 1 Day 5-6: Storage layer
 * Based on SPEC.md v4.3.10 storage structure
 */

import { join } from 'path';
import { createHash } from 'crypto';
import type { Scope } from '../core/types.js';

/**
 * Get the .memorylink root directory
 */
export function getMemoryLinkRoot(cwd: string = process.cwd()): string {
  return join(cwd, '.memorylink');
}

/**
 * Normalize repository URL for scope ID generation
 * Based on SPEC.md: sha256(normalized_repo_url)
 */
export function normalizeRepoUrl(url: string): string {
  // Remove protocol
  let normalized = url.replace(/^https?:\/\//, '');
  
  // Remove .git suffix
  normalized = normalized.replace(/\.git$/, '');
  
  // Normalize to lowercase
  normalized = normalized.toLowerCase();
  
  // Remove trailing slashes
  normalized = normalized.replace(/\/$/, '');
  
  return normalized;
}

/**
 * Generate scope ID from repository URL
 * Uses sha256(normalized_repo_url) as per SPEC.md
 */
export function generateScopeId(repoUrl: string): string {
  const normalized = normalizeRepoUrl(repoUrl);
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Get records directory path for a scope
 */
export function getRecordsPath(cwd: string, scope: Scope): string {
  const root = getMemoryLinkRoot(cwd);
  return join(root, 'records', scope.type, scope.id);
}

/**
 * Get record file path
 */
export function getRecordPath(cwd: string, scope: Scope, recordId: string): string {
  const recordsPath = getRecordsPath(cwd, scope);
  return join(recordsPath, `${recordId}.json`);
}

/**
 * Get quarantined directory path (global, not per-scope)
 */
export function getQuarantinedPath(cwd: string): string {
  const root = getMemoryLinkRoot(cwd);
  return join(root, 'quarantined');
}

/**
 * Get quarantined file path
 */
export function getQuarantinedFilePath(cwd: string, recordId: string): string {
  const quarantinedPath = getQuarantinedPath(cwd);
  return join(quarantinedPath, `${recordId}.original`);
}

/**
 * Get audit directory path
 */
export function getAuditPath(cwd: string): string {
  const root = getMemoryLinkRoot(cwd);
  return join(root, 'audit');
}

/**
 * Get audit events file path
 */
export function getAuditEventsPath(cwd: string): string {
  const auditPath = getAuditPath(cwd);
  return join(auditPath, 'events.ndjson');
}

/**
 * Get config file path
 */
export function getConfigPath(cwd: string): string {
  const root = getMemoryLinkRoot(cwd);
  return join(root, 'config.json');
}

