/**
 * Quarantine handling
 * Week 2 Day 8-9: Quarantine system
 * Week 4: Enhanced with dynamic pattern loading
 * Handles quarantining unsafe content
 */

import type { MemoryRecord, Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import { detectSecretsSafe } from './detector.js';
import { saveQuarantinedContent } from '../storage/local.js';
import { getQuarantinedFilePath } from '../storage/paths.js';
import { appendAuditEvent } from '../audit/logger.js';
import { validateFileSize, getUserFriendlyError } from '../core/resilience.js';

/**
 * Quarantine result
 */
export interface QuarantineResult {
  quarantined: boolean;
  recordId?: string;
  quarantineRef?: string;
  pattern?: string;
}

/**
 * Check and quarantine if needed
 * Based on SPEC.md: Auto-detects and quarantines unsafe content
 * Production-grade: Validate content size, handle errors gracefully
 * DYNAMIC: Loads patterns from .memorylink/config.json if exists
 */
export async function checkAndQuarantine(
  cwd: string,
  content: string,
  recordId: string,
  filePath?: string
): Promise<Result<QuarantineResult, StorageError>> {
  // Validate content size before processing (prevent memory issues)
  const sizeResult = validateFileSize(Buffer.byteLength(content, 'utf-8'));
  if (!sizeResult.ok) {
    return Err(new StorageError(
      'Content too large to process safely',
      'validate'
    ));
  }

  // Detect secrets (with dynamic pattern loading from config.json + context-aware detection)
  const detection = detectSecretsSafe(content, cwd, filePath);

  if (!detection.ok) {
    // Check if it's a ConfigError (config file issues)
    if (detection.error.code === 'CONFIG_ERROR') {
      // Config error: fall back to built-in patterns (graceful degradation)
      console.warn(`Warning: Config error in secret detection: ${detection.error.message}. Using built-in patterns.`);
      const fallbackDetection = detectSecretsSafe(content, undefined, filePath); // No cwd = built-in patterns only
      
      if (!fallbackDetection.ok && fallbackDetection.error.code !== 'CONFIG_ERROR') {
        // Secret detected with fallback patterns - quarantine it
        // Type guard: we know it's QuarantineError (not ConfigError)
        const patternId = 'pattern' in fallbackDetection.error ? fallbackDetection.error.pattern : 'unknown';
        return await quarantineContent(cwd, content, recordId, patternId);
      }
      // No secret detected with fallback - return not quarantined
      return Ok({ quarantined: false });
    }
    
    // QuarantineError - secret detected, quarantine it
    // Type guard: we know it's QuarantineError (not ConfigError)
    const patternId = 'pattern' in detection.error ? detection.error.pattern : 'unknown';
    return await quarantineContent(cwd, content, recordId, patternId);
  }

  // No secret detected
  return Ok({
    quarantined: false,
  });
}

/**
 * Helper function to quarantine content
 */
async function quarantineContent(
  cwd: string,
  content: string,
  recordId: string,
  patternId: string
): Promise<Result<QuarantineResult, StorageError>> {
  const quarantinePath = getQuarantinedFilePath(cwd, recordId);
  
  // Save original content to quarantine (with retry mechanism)
  const saveResult = await saveQuarantinedContent(cwd, recordId, content);
  
  if (!saveResult.ok) {
    // Provide user-friendly error message
    return Err(new StorageError(
      `Failed to quarantine content: ${getUserFriendlyError(saveResult.error)}`,
      'write'
    ));
  }

  // Create metadata file for validity checking
  try {
    const { writeFile } = await import('fs/promises');
    const { resolve, dirname } = await import('path');
    const { mkdirSync, existsSync } = await import('fs');
    
    const metadataPath = resolve(cwd, '.memorylink', 'quarantined', `${recordId}.metadata.json`);
    const metadataDir = dirname(metadataPath);
    
    if (!existsSync(metadataDir)) {
      mkdirSync(metadataDir, { recursive: true });
    }
    
    const metadata = {
      record_id: recordId,
      pattern_id: patternId,
      quarantined_at: new Date().toISOString(),
      validity: null, // Will be populated by --check-validity
    };
    
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
  } catch (e) {
    // Non-fatal - metadata file is optional
    console.warn(`Warning: Failed to create metadata file: ${e}`);
  }

  // Log quarantine event to audit trail
  const auditResult = await appendAuditEvent(cwd, {
    event_type: 'QUARANTINE',
    record_id: recordId,
    pattern: patternId,
    reason: `Secret detected: ${patternId}`,
  });

  if (!auditResult.ok) {
    // Audit failure doesn't fail quarantine, but log it
    console.warn(`Warning: Failed to log audit event: ${auditResult.error.message}`);
  }

  return Ok({
    quarantined: true,
    recordId,
    quarantineRef: quarantinePath,
    pattern: patternId,
  });
}

/**
 * Update record with quarantine status
 * Sets status to QUARANTINED and adds quarantine_ref
 */
export function markAsQuarantined(
  record: MemoryRecord,
  quarantineRef: string
): MemoryRecord {
  return {
    ...record,
    status: 'QUARANTINED',
    quarantine_ref: quarantineRef,
  };
}
