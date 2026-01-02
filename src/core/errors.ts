/**
 * MemoryLink Error Hierarchy
 * Based on Implementation Guide Pattern 1.2
 * Production-grade error handling with proper exit codes
 */

import { EXIT_CODES, type ExitCode } from './exit-codes.js';

/**
 * Base error class for all MemoryLink errors
 */
export class MemoryLinkError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode: ExitCode = EXIT_CODES.ERROR
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation errors - User input issues
 * Exit code: 1 (FAIL)
 */
export class ValidationError extends MemoryLinkError {
  constructor(message: string, public field: string) {
    super(message, 'VALIDATION_ERROR', EXIT_CODES.FAILURE);
  }
}

/**
 * Storage errors - File system issues
 * Exit code: 2 (ERROR)
 */
export class StorageError extends MemoryLinkError {
  constructor(message: string, public operation: string) {
    super(message, 'STORAGE_ERROR', EXIT_CODES.ERROR);
  }
}

/**
 * File not found error
 */
export class FileNotFoundError extends StorageError {
  constructor(public path: string) {
    super(`File not found: ${path}`, 'read');
  }
}

/**
 * File read error
 */
export class FileReadError extends StorageError {
  constructor(message: string) {
    super(`Failed to read file: ${message}`, 'read');
  }
}

/**
 * File write error
 */
export class FileWriteError extends StorageError {
  constructor(message: string) {
    super(`Failed to write file: ${message}`, 'write');
  }
}

/**
 * Quarantine errors - Secrets detected
 * Exit code: 1 (FAIL)
 */
export class QuarantineError extends MemoryLinkError {
  constructor(
    message: string,
    public pattern: string,
    public recordId?: string
  ) {
    super(message, 'QUARANTINE_ERROR', EXIT_CODES.FAILURE);
  }
}

/**
 * Gate errors - Policy violations
 * Exit code: 1 (FAIL)
 */
export class GateError extends MemoryLinkError {
  constructor(
    message: string,
    public violations: number,
    public rule: string
  ) {
    super(message, 'GATE_ERROR', EXIT_CODES.FAILURE);
  }
}

/**
 * Evidence level error - Invalid promotion
 * Exit code: 1 (FAIL)
 */
export class EvidenceLevelError extends MemoryLinkError {
  constructor(message: string, public currentLevel: string, public targetLevel: string) {
    super(message, 'EVIDENCE_LEVEL_ERROR', EXIT_CODES.FAILURE);
  }
}

/**
 * Conflict resolution error
 * Exit code: 2 (ERROR)
 */
export class ConflictResolutionError extends MemoryLinkError {
  constructor(message: string) {
    super(message, 'CONFLICT_RESOLUTION_ERROR', EXIT_CODES.ERROR);
  }
}

export class ConfigError extends MemoryLinkError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR', EXIT_CODES.ERROR);
  }
}

