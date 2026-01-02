/**
 * MemoryLink Core Types
 * Based on SPEC.md v4.3.10
 * All interfaces and types for MemoryLink
 */

/**
 * Evidence levels for memory grading
 * E0: Raw (just captured, unverified)
 * E1: Curated (reviewed, seems valid)
 * E2: Verified (proven true, policy-gated) - ONLY via promote
 */
export type EvidenceLevel = 'E0' | 'E1' | 'E2';

/**
 * Memory record status
 * ACTIVE: Currently in use, eligible for queries
 * DEPRECATED: Superseded, excluded from truth queries
 * QUARANTINED: Unsafe content detected, never returned in queries
 */
export type MemoryStatus = 'ACTIVE' | 'DEPRECATED' | 'QUARANTINED';

/**
 * Scope types for memory organization
 */
export type ScopeType = 'project' | 'user' | 'org';

/**
 * Scope definition
 */
export interface Scope {
  type: ScopeType;
  id: string; // sha256(normalized_repo_url) for project scope
}

/**
 * Source reference for memory origin
 */
export interface Source {
  type: string;
  ref: string;
  captured_at: string; // ISO-8601
}

/**
 * Redaction information
 */
export interface Redaction {
  rule_id: string;
  span: [number, number]; // [start, end] character positions
  replacement: string;
}

/**
 * MemoryRecord - Core data structure
 * Based on SPEC.md v4.3.10 MemoryRecord schema
 */
export interface MemoryRecord {
  // Required fields
  id: string; // "mem_" + timestamp + random
  content: string; // The actual memory
  evidence_level: EvidenceLevel;
  status: MemoryStatus;
  scope: Scope;
  conflict_key: string; // Normalized topic
  purpose_tags: string[]; // ['work', 'security', 'other']
  created_at: string; // ISO-8601

  // Optional fields
  sources?: Source[];
  redactions?: Redaction[];

  // Conditional field - MUST exist if QUARANTINED
  quarantine_ref?: string; // Path to .memorylink/quarantined/<id>.original

  // Week 5: Team isolation (optional)
  ownership?: {
    owner?: string; // Team name (e.g., "frontend", "backend")
    editors?: string[]; // Users who can edit
    readonly?: string[]; // Teams/users who can only read
  };

  // Week 6: Memory poisoning protection (optional)
  memory_type?: 'fact' | 'preference' | 'instruction'; // Content type classification
  provenance?: {
    author?: string; // Who created/modified
    approved_by?: string; // Who approved (if applicable)
    approved_at?: string; // ISO-8601 timestamp
    reason?: string; // Why this change was made
  };
}

/**
 * Audit event types
 */
export type AuditEventType =
  | 'CAPTURE'
  | 'PROMOTE'
  | 'QUARANTINE'
  | 'GATE'
  | 'QUERY'
  | 'DEPRECATE'
  | 'MANUAL_EDIT';

/**
 * Audit event - Append-only log entry
 */
export interface AuditEvent {
  event_id: string;
  timestamp: string; // ISO-8601
  event_type: AuditEventType;
  event_data: Record<string, unknown>;
  prev_event_hash?: string; // Optional hash chaining
  event_hash?: string; // Optional hash chaining
}

/**
 * Gate rule types
 */
export type GateRule = 'block-quarantined' | 'require-e2-for-topics';

/**
 * Gate result
 */
export interface GateResult {
  passed: boolean;
  rule: GateRule;
  violations: GateViolation[];
  exitCode: 0 | 1 | 2; // 0=pass, 1=fail, 2=error
  warnOnly?: boolean; // If true, we're in warn mode (not blocking)
}

/**
 * Gate violation details
 * NEVER includes quarantined content or secrets
 */
export interface GateViolation {
  record_id: string;
  conflict_key: string;
  created_at: string;
  quarantine_ref?: string; // Path only, never content
  validity?: {
    is_valid: boolean;
    status: 'active' | 'inactive' | 'unknown';
    confidence: number;
    reason?: string;
    provider?: string;
  };
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  winner: MemoryRecord;
  reason: string; // Why this record won
  candidates: MemoryRecord[]; // All ACTIVE candidates
}

/**
 * Result type for error handling
 * Pattern from Implementation Guide
 */
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Helper functions for Result type
 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function Err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

