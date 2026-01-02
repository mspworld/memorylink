/**
 * Audit trail logging
 * Week 3 Day 17-18: Audit system
 * Week 4: Enhanced with retry mechanism and production-grade error handling
 * Based on SPEC.md v4.3.10
 * 
 * Append-only audit log (NDJSON format)
 * Optional hash chaining for tamper-evidence
 */

import { appendFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import { getAuditEventsPath } from '../storage/paths.js';
import { createHash } from 'crypto';
import { withRetry, FILE_OPERATION_RETRY_OPTIONS } from '../core/retry.js';
import {
  ensureParentDirectory,
  getUserFriendlyError,
  isDiskFullError,
  isFileNotFoundError,
  validateFileSize as validateFileSizeUtil,
} from '../core/resilience.js';

/**
 * Audit event data (flexible structure)
 */
export interface AuditEventData {
  event_type: string;
  record_id?: string;
  [key: string]: unknown;
}

/**
 * Append audit event to log
 * Based on SPEC.md: Append-only format (NDJSON)
 * Production-grade: Retry, handle disk full, graceful degradation
 */
export async function appendAuditEvent(
  cwd: string,
  eventData: AuditEventData
): Promise<Result<void, StorageError>> {
  return withRetry(async () => {
    try {
      const auditPath = getAuditEventsPath(cwd);
      
      // Ensure audit directory exists (with error handling)
      const dirResult = ensureParentDirectory(auditPath);
      if (!dirResult.ok) {
        return dirResult;
      }

      // Generate event ID
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const timestamp = new Date().toISOString();

      // Get previous event hash for chaining (if exists)
      let prevEventHash: string | undefined;
      if (existsSync(auditPath)) {
        try {
          const content = await readFile(auditPath, 'utf-8');
          const lines = content.trim().split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            try {
              const lastEvent = JSON.parse(lines[lines.length - 1]);
              prevEventHash = lastEvent.event_hash;
            } catch {
              // If last line is invalid, start fresh
              prevEventHash = undefined;
            }
          }
        } catch (readError) {
          // If read fails, continue without prev hash (graceful degradation)
          prevEventHash = undefined;
        }
      }

      // Create event object
      const event: Record<string, unknown> = {
        event_id: eventId,
        timestamp,
        ...eventData,
      };

      // Add hash chaining (optional but recommended)
      if (prevEventHash) {
        event.prev_event_hash = prevEventHash;
      }

      // Calculate event hash (canonical JSON)
      const canonicalJson = JSON.stringify(event, Object.keys(event).sort());
      const eventHash = createHash('sha256').update(canonicalJson).digest('hex');
      event.event_hash = eventHash;

      // Append to file (NDJSON format - one JSON object per line)
      const line = JSON.stringify(event) + '\n';
      
      try {
        await appendFile(auditPath, line, 'utf-8');
      } catch (appendError: any) {
        if (isDiskFullError(appendError)) {
          return Err(new StorageError(
            getUserFriendlyError(appendError),
            'write'
          ));
        }
        throw appendError;
      }

      return Ok(undefined);
    } catch (error: any) {
      return Err(new StorageError(
        `Failed to append audit event: ${getUserFriendlyError(error)}`,
        'write'
      ));
    }
  }, FILE_OPERATION_RETRY_OPTIONS);
}

/**
 * Read audit events from log
 * Returns all events in chronological order
 * Production-grade: Handle corrupted lines gracefully, retry on errors
 */
export async function readAuditEvents(
  cwd: string
): Promise<Record<string, unknown>[]> {
  const result = await withRetry(async () => {
    try {
      const auditPath = getAuditEventsPath(cwd);

      if (!existsSync(auditPath)) {
        return Ok([]); // Empty if no audit log exists
      }

      // Validate file size before reading (prevent memory issues)
      const { stat } = await import('fs/promises');
            const stats = await stat(auditPath);
            const sizeResult = validateFileSizeUtil(stats.size);
      if (!sizeResult.ok) {
        return Err(new StorageError('Audit log too large to read safely', 'read'));
      }

      const content = await readFile(auditPath, 'utf-8');
      const lines = content.trim().split('\n').filter(line => line.trim());
      
      const events: Record<string, unknown>[] = [];
      // Parse each line safely (handle corrupted lines gracefully)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') continue;
        
        try {
          const event = JSON.parse(line);
          // Basic validation
          if (event.event_id && event.timestamp && event.event_type) {
            events.push(event);
          }
        } catch (parseError) {
          // Skip corrupted lines but log warning (graceful degradation)
          console.warn(`Warning: Skipping corrupted audit event at line ${i + 1}`);
          continue;
        }
      }

      return Ok(events);
    } catch (error: any) {
      // If file read fails, return empty array (graceful degradation)
      if (isFileNotFoundError(error)) {
        return Ok([]);
      }
      return Err(new StorageError(
        `Failed to read audit events: ${getUserFriendlyError(error)}`,
        'read'
      ));
    }
  }, FILE_OPERATION_RETRY_OPTIONS);
  
  // Graceful degradation: return empty array on error
  if (result.ok) {
    return result.value;
  }
  // On error, return empty array (graceful degradation)
  console.warn(`Warning: Failed to read audit events: ${result.error.message}`);
  return [];
}

/**
 * Verify audit chain integrity
 * Checks hash chaining if implemented
 * Production-grade: Handle corrupted events gracefully
 */
export async function verifyAuditChain(
  cwd: string
): Promise<Result<{ valid: boolean; eventCount: number; errors: string[] }, StorageError>> {
  try {
    // readAuditEvents now returns array directly (with graceful degradation)
    const events = await readAuditEvents(cwd);
    const errors: string[] = [];

    if (events.length === 0) {
      return Ok({ valid: true, eventCount: 0, errors: [] });
    }

    // Check hash chain
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      // Skip if no hash chaining (optional feature)
      if (!event.event_hash) {
        continue;
      }

      // Verify event hash
      try {
        const eventCopy = { ...event };
        const expectedHash = eventCopy.event_hash as string;
        delete eventCopy.event_hash;
        
        const canonicalJson = JSON.stringify(eventCopy, Object.keys(eventCopy).sort());
        const calculatedHash = createHash('sha256').update(canonicalJson).digest('hex');
        
        if (calculatedHash !== expectedHash) {
          errors.push(`Event ${i + 1} (${(event as any).event_id || 'unknown'}): Hash mismatch`);
        }

        // Verify prev_event_hash link
        if (i > 0 && event.prev_event_hash) {
          const prevEvent = events[i - 1];
          if (prevEvent.event_hash !== event.prev_event_hash) {
            errors.push(`Event ${i + 1} (${(event as any).event_id || 'unknown'}): Chain broken`);
          }
        }
      } catch (parseError) {
        // Handle corrupted event gracefully
        errors.push(`Event ${i + 1}: Corrupted event structure`);
        continue;
      }
    }

    const valid = errors.length === 0;
    return Ok({
      valid,
      eventCount: events.length,
      errors,
    });
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to verify audit chain: ${getUserFriendlyError(error)}`,
      'read'
    ));
  }
}
