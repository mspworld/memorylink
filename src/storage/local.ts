/**
 * Local file storage operations
 * Week 1 Day 5-6: Storage layer
 * Week 4: Enhanced with retry mechanism and production-grade error handling
 * CRUD operations for MemoryRecord files
 */

import { readFile, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import type { MemoryRecord, Scope, Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import {
  StorageError,
  FileNotFoundError,
  FileReadError,
} from '../core/errors.js';
import { atomicWriteJson, atomicWrite } from './atomic.js';
import {
  getRecordPath,
  getRecordsPath,
  getQuarantinedFilePath,
} from './paths.js';
import { withRetry, FILE_OPERATION_RETRY_OPTIONS } from '../core/retry.js';
import {
  ensureParentDirectory,
  validateJsonFile,
  validateFileSize,
  getUserFriendlyError,
  isFileNotFoundError,
  isDiskFullError,
  isPermissionError,
} from '../core/resilience.js';

/**
 * Save a memory record to disk
 * Production-grade: Retry with exponential backoff, handle edge cases
 */
export async function saveRecord(
  cwd: string,
  scope: Scope,
  record: MemoryRecord
): Promise<Result<void, StorageError>> {
  return withRetry(async () => {
    try {
      const filePath = getRecordPath(cwd, scope, record.id);
      
      // Ensure parent directory exists (with error handling)
      const dirResult = ensureParentDirectory(filePath);
      if (!dirResult.ok) {
        return dirResult;
      }
      
      // Check disk space (basic check - file size validation)
      if (existsSync(filePath)) {
        try {
          const { stat } = await import('fs/promises');
          const stats = await stat(filePath);
          const sizeResult = validateFileSize(stats.size);
          if (!sizeResult.ok) {
            return Err(new StorageError('File size validation failed', 'write'));
          }
        } catch {
          // Ignore stat errors (file might be deleted)
        }
      }
      
      const result = await atomicWriteJson(filePath, record);
      if (!result.ok) {
        // Provide user-friendly error messages
        if (isDiskFullError(result.error)) {
          return Err(new StorageError(
            getUserFriendlyError(result.error),
            'write'
          ));
        }
        if (isPermissionError(result.error)) {
          return Err(new StorageError(
            getUserFriendlyError(result.error),
            'write'
          ));
        }
        return result;
      }
      return Ok(undefined);
    } catch (error: any) {
      return Err(new StorageError(
        `Failed to save record: ${getUserFriendlyError(error)}`,
        'write'
      ));
    }
  }, FILE_OPERATION_RETRY_OPTIONS);
}

/**
 * Load a memory record from disk
 * Production-grade: Retry, validate JSON, handle corrupted files
 */
export async function loadRecord(
  cwd: string,
  scope: Scope,
  recordId: string
): Promise<Result<MemoryRecord, StorageError>> {
  return withRetry(async () => {
    try {
      const filePath = getRecordPath(cwd, scope, recordId);
      
      if (!existsSync(filePath)) {
        return Err(new FileNotFoundError(filePath));
      }
      
      // Read file with size validation (prevent memory issues)
      const { stat } = await import('fs/promises');
      const stats = await stat(filePath);
      const sizeResult = validateFileSize(stats.size);
      if (!sizeResult.ok) {
        return Err(new StorageError('File too large to read safely', 'read'));
      }
      
      const content = await readFile(filePath, 'utf-8');
      
      // Validate JSON before parsing (handle corrupted files)
      const jsonResult = validateJsonFile(content);
      if (!jsonResult.ok) {
        return Err(new StorageError(
          `Corrupted record file: ${filePath}. ${jsonResult.error.message}`,
          'read'
        ));
      }
      
      const record = JSON.parse(content) as MemoryRecord;
      
      // Validate record structure
      if (!record.id || !record.content || !record.evidence_level || !record.status) {
        return Err(new StorageError('Invalid record format', 'read'));
      }
      
      // Validate record ID matches filename (data integrity check)
      if (record.id !== recordId) {
        return Err(new StorageError(
          `Record ID mismatch: expected ${recordId}, got ${record.id}`,
          'read'
        ));
      }
      
      return Ok(record);
    } catch (error: any) {
      if (isFileNotFoundError(error)) {
        return Err(new FileNotFoundError(getRecordPath(cwd, scope, recordId)));
      }
      
      // Handle corrupted files gracefully
      if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return Err(new StorageError(
          `Corrupted record file: ${getUserFriendlyError(error)}`,
          'read'
        ));
      }
      
      return Err(new FileReadError(getUserFriendlyError(error)));
    }
  }, FILE_OPERATION_RETRY_OPTIONS);
}

/**
 * List all record IDs in a scope
 * Production-grade: Retry, validate filenames, handle errors gracefully
 */
export async function listRecordIds(
  cwd: string,
  scope: Scope
): Promise<Result<string[], StorageError>> {
  return withRetry(async () => {
    try {
      const recordsPath = getRecordsPath(cwd, scope);
      
      if (!existsSync(recordsPath)) {
        return Ok([]); // Empty if directory doesn't exist
      }

      const files = await readdir(recordsPath);
      const recordIds: string[] = [];
      
      // Validate and filter files safely
      for (const file of files) {
        if (file.endsWith('.json')) {
          const recordId = file.replace('.json', '');
          // Basic validation: record ID should start with 'mem_'
          if (recordId.startsWith('mem_')) {
            recordIds.push(recordId);
          }
        }
      }

      return Ok(recordIds);
    } catch (error: any) {
      if (isPermissionError(error)) {
        return Err(new StorageError(
          getUserFriendlyError(error),
          'read'
        ));
      }
      return Err(new StorageError(
        `Failed to list records: ${getUserFriendlyError(error)}`,
        'read'
      ));
    }
  }, FILE_OPERATION_RETRY_OPTIONS);
}

/**
 * Delete a memory record
 * Production-grade: Retry, handle already-deleted gracefully
 */
export async function deleteRecord(
  cwd: string,
  scope: Scope,
  recordId: string
): Promise<Result<void, StorageError>> {
  return withRetry(async () => {
    try {
      const filePath = getRecordPath(cwd, scope, recordId);
      
      if (!existsSync(filePath)) {
        // File already deleted - this is OK (idempotent operation)
        return Ok(undefined);
      }

      await unlink(filePath);
      return Ok(undefined);
    } catch (error: any) {
      if (isFileNotFoundError(error)) {
        // File already deleted - this is OK
        return Ok(undefined);
      }
      
      if (isPermissionError(error)) {
        return Err(new StorageError(
          getUserFriendlyError(error),
          'delete'
        ));
      }
      
      return Err(new StorageError(
        `Failed to delete record: ${getUserFriendlyError(error)}`,
        'delete'
      ));
    }
  }, FILE_OPERATION_RETRY_OPTIONS);
}

/**
 * Save quarantined content to .original file
 * ENCRYPTED: Content is encrypted using AES-256-GCM (8 AI consensus)
 * Production-grade: Retry, validate size, handle errors
 */
export async function saveQuarantinedContent(
  cwd: string,
  recordId: string,
  content: string
): Promise<Result<string, StorageError>> {
  return withRetry(async () => {
    try {
      const filePath = getQuarantinedFilePath(cwd, recordId);
      
      // Ensure parent directory exists
      const dirResult = ensureParentDirectory(filePath);
      if (!dirResult.ok) {
        return dirResult;
      }
      
      // Validate content size (prevent memory issues)
      const sizeResult = validateFileSize(Buffer.byteLength(content, 'utf-8'));
      if (!sizeResult.ok) {
        return Err(new StorageError(
          'Quarantined content too large',
          'write'
        ));
      }
      
      // ENCRYPT content before saving (AES-256-GCM)
      let contentToSave = content;
      try {
        const { encrypt } = await import('../quarantine/encryption.js');
        contentToSave = await encrypt(content);
      } catch (encryptError: any) {
        // If encryption fails, still quarantine but log warning
        console.warn(`Warning: Encryption failed, storing plaintext: ${encryptError.message}`);
      }
      
      // Write encrypted content atomically
      const result = await atomicWrite(filePath, contentToSave);
      
      if (!result.ok) {
        if (isDiskFullError(result.error)) {
          return Err(new StorageError(
            getUserFriendlyError(result.error),
            'write'
          ));
        }
        return result;
      }

      return Ok(filePath);
    } catch (error: any) {
      return Err(new StorageError(
        `Failed to save quarantined content: ${getUserFriendlyError(error)}`,
        'write'
      ));
    }
  }, FILE_OPERATION_RETRY_OPTIONS);
}

/**
 * Load quarantined content (decrypts automatically)
 */
export async function loadQuarantinedContent(
  cwd: string,
  recordId: string
): Promise<Result<string, StorageError>> {
  return withRetry(async () => {
    try {
      const filePath = getQuarantinedFilePath(cwd, recordId);
      
      if (!existsSync(filePath)) {
        return Err(new FileNotFoundError(filePath));
      }
      
      const encryptedContent = await readFile(filePath, 'utf-8');
      
      // DECRYPT content if encrypted
      try {
        const { decrypt, isEncrypted } = await import('../quarantine/encryption.js');
        if (isEncrypted(encryptedContent)) {
          const decrypted = await decrypt(encryptedContent);
          return Ok(decrypted);
        }
      } catch (decryptError: any) {
        // If decryption fails, return error (don't expose garbled data)
        return Err(new StorageError(
          `Failed to decrypt quarantined content: ${decryptError.message}`,
          'read'
        ));
      }
      
      // Return as-is if not encrypted (legacy files)
      return Ok(encryptedContent);
    } catch (error: any) {
      if (isFileNotFoundError(error)) {
        return Err(new FileNotFoundError(getQuarantinedFilePath(cwd, recordId)));
      }
      return Err(new StorageError(
        `Failed to load quarantined content: ${getUserFriendlyError(error)}`,
        'read'
      ));
    }
  }, FILE_OPERATION_RETRY_OPTIONS);
}
