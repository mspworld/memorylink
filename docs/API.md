# MemoryLink API Documentation

Complete API reference for MemoryLink CLI and core modules.

---

## 📋 Table of Contents

- [CLI Commands](#cli-commands)
- [Core Types](#core-types)
- [Storage API](#storage-api)
- [Quarantine API](#quarantine-api)
- [Gate API](#gate-api)
- [Audit API](#audit-api)
- [Conflict Resolution](#conflict-resolution)

---

## 🔧 CLI Commands

### `ml capture`

Capture a new memory.

**Signature:**
```typescript
ml capture --topic <topic> [options]
```

**Options:**
- `--topic <topic>` (required) - Memory topic
- `--evidence <E0|E1>` (optional, default: E0) - Evidence level
- `--scope-type <project|user|org>` (optional, default: project) - Scope type
- `--repo-url <url>` (optional) - Repository URL for project scope
- `--purpose-tags <tags>` (optional) - Comma-separated tags

**Returns:**
- Exit code: 0 on success, 1 on error
- Output: Record ID and status

**Example:**
```bash
ml capture --topic "deployment" "Use Docker" --evidence E1
# ✅ Captured: mem_1234567890 (E1, ACTIVE)
```

---

### `ml query`

Query for memories by topic.

**Signature:**
```typescript
ml query --topic <topic> [options]
```

**Options:**
- `--topic <topic>` (required) - Topic to query
- `--scope-type <project|user|org>` (optional, default: project) - Scope type
- `--repo-url <url>` (optional) - Repository URL for project scope

**Returns:**
- Exit code: 0 on success, 1 on error
- Output: Record details or "No active memory found"

**Example:**
```bash
ml query --topic "deployment"
# ✅ Found memory: mem_1234567890
#    Content: "Use Docker for deployments"
#    Evidence: E1
#    Status: ACTIVE
```

---

### `ml promote`

Promote a memory to a higher evidence level.

**Signature:**
```typescript
ml promote <record-id> --to <E1|E2> --reason <reason> [options]
```

**Options:**
- `<record-id>` (required) - Record ID to promote
- `--to <E1|E2>` (required) - Target evidence level
- `--reason <reason>` (required) - Reason for promotion
- `--scope-type <project|user|org>` (optional, default: project) - Scope type
- `--repo-url <url>` (optional) - Repository URL for project scope

**Returns:**
- Exit code: 0 on success, 1 on error
- Output: Promoted record details

**Example:**
```bash
ml promote mem_1234567890 --to E2 --reason "Team verified in 5 PRs"
# ✅ Promoted: mem_1234567890 (E2, ACTIVE)
```

---

### `ml audit`

View audit trail.

**Signature:**
```typescript
ml audit [options]
```

**Options:**
- `--timeline` - Show chronological timeline
- `--security` - Show security-focused events
- `--verify` - Verify hash chain integrity
- `--record <id>` - Filter by record ID
- `--from <date>` - Start date (ISO-8601)
- `--to <date>` - End date (ISO-8601)

**Returns:**
- Exit code: 0 on success, 1 on error
- Output: Audit events

**Example:**
```bash
ml audit --timeline
# 2025-12-30T10:00:00Z [CAPTURE] mem_1234567890
# 2025-12-30T10:05:00Z [PROMOTE] mem_1234567890 E1→E2
```

---

### `ml gate`

Run policy gate check.

**Signature:**
```typescript
ml gate --rule <rule> [options]
```

**Options:**
- `--rule <rule>` (required) - Gate rule (currently: `block-quarantined`)
- `--scope-type <project|user|org>` (optional, default: project) - Scope type
- `--repo-url <url>` (optional) - Repository URL for project scope

**Returns:**
- Exit code: 0 (PASS), 1 (FAIL), 2 (ERROR)
- Output: Gate result with violations (if any)

**Example:**
```bash
ml gate --rule block-quarantined
# ✅ Gate PASSED
# or
# ❌ Gate FAILED
#    Violations: 1
```

---

## 📦 Core Types

### `MemoryRecord`

```typescript
interface MemoryRecord {
  id: string;                    // "mem_" + timestamp + random
  content: string;                // The actual memory
  evidence_level: 'E0' | 'E1' | 'E2';
  status: 'ACTIVE' | 'DEPRECATED' | 'QUARANTINED';
  scope: {
    type: 'project' | 'user' | 'org';
    id: string;                  // sha256(normalized_repo_url)
  };
  conflict_key: string;          // Normalized topic
  purpose_tags: string[];        // ['work', 'security', etc.]
  created_at: string;            // ISO-8601
  sources?: Array<{
    type: string;
    ref: string;
    captured_at: string;
  }>;
  redactions?: Array<{
    rule_id: string;
    span: [number, number];
    replacement: string;
  }>;
  quarantine_ref?: string;        // Path if QUARANTINED
}
```

### `Result<T, E>`

Type-safe error handling:

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Helper functions
function Ok<T>(value: T): Result<T, never>;
function Err<E>(error: E): Result<never, E>;
```

### `EvidenceLevel`

```typescript
type EvidenceLevel = 'E0' | 'E1' | 'E2';
```

- `E0`: Raw (just captured, unverified)
- `E1`: Curated (reviewed, seems valid)
- `E2`: Verified (proven true, policy-gated)

### `MemoryStatus`

```typescript
type MemoryStatus = 'ACTIVE' | 'DEPRECATED' | 'QUARANTINED';
```

---

## 💾 Storage API

### `saveRecord`

Save a memory record to storage.

```typescript
function saveRecord(
  cwd: string,
  scope: Scope,
  record: MemoryRecord
): Promise<Result<void, StorageError>>;
```

### `loadRecord`

Load a memory record from storage.

```typescript
function loadRecord(
  cwd: string,
  scope: Scope,
  recordId: string
): Promise<Result<MemoryRecord, StorageError>>;
```

### `listRecordIds`

List all record IDs in a scope.

```typescript
function listRecordIds(
  cwd: string,
  scope: Scope
): Promise<Result<string[], StorageError>>;
```

### `deleteRecord`

Delete a memory record.

```typescript
function deleteRecord(
  cwd: string,
  scope: Scope,
  recordId: string
): Promise<Result<void, StorageError>>;
```

---

## 🔒 Quarantine API

### `detectSecrets`

Detect secrets in content.

```typescript
function detectSecrets(content: string): DetectionResult;

interface DetectionResult {
  found: boolean;
  pattern?: SecretPattern;
  match?: string;
  position?: number;
}
```

### `checkAndQuarantine`

Check content and quarantine if secrets detected.

```typescript
function checkAndQuarantine(
  cwd: string,
  content: string,
  recordId: string
): Promise<Result<QuarantineResult, StorageError>>;

interface QuarantineResult {
  quarantined: boolean;
  recordId?: string;
  quarantineRef?: string;
  pattern?: string;
}
```

### `SECRET_PATTERNS`

Array of 20+ secret detection patterns.

```typescript
const SECRET_PATTERNS: SecretPattern[];

interface SecretPattern {
  id: string;
  name: string;
  pattern: RegExp;
  description: string;
}
```

---

## 🚪 Gate API

### `checkBlockQuarantined`

Check for quarantined records (block-quarantined rule).

```typescript
function checkBlockQuarantined(
  cwd: string,
  scope?: Scope
): Promise<GateResult>;

interface GateResult {
  passed: boolean;
  rule: string;
  violations: GateViolation[];
  exitCode: ExitCode;
}

interface GateViolation {
  record_id: string;
  conflict_key: string;
  created_at: string;
  quarantine_ref?: string;
}
```

### `formatGateResult`

Format gate result for output (safe, no secrets).

```typescript
function formatGateResult(result: GateResult): string;
```

---

## 📝 Audit API

### `appendAuditEvent`

Append event to audit trail.

```typescript
function appendAuditEvent(
  cwd: string,
  event: Omit<AuditEvent, 'event_id' | 'timestamp' | 'event_hash' | 'prev_event_hash'>
): Promise<void>;

interface AuditEvent {
  event_id: string;
  timestamp: string;              // ISO-8601
  event_type: AuditEventType;
  event_data: Record<string, unknown>;
  prev_event_hash?: string;      // Hash chaining
  event_hash?: string;           // Hash chaining
}
```

### `readAuditEvents`

Read all audit events.

```typescript
function readAuditEvents(cwd: string): Promise<AuditEvent[]>;
```

### `verifyAuditChain`

Verify hash chain integrity.

```typescript
function verifyAuditChain(events: AuditEvent[]): boolean;
```

---

## ⚖️ Conflict Resolution

### `resolveConflict`

Resolve conflicts using 3-level hierarchy.

```typescript
function resolveConflict(
  records: MemoryRecord[]
): Result<ConflictResolution, ConflictResolutionError>;

interface ConflictResolution {
  winner: MemoryRecord;
  reason: string;
  candidates: MemoryRecord[];
}
```

**Resolution Hierarchy:**
1. Evidence level (E2 > E1 > E0)
2. Recency (newest `created_at`)
3. Lexicographic ID (tiebreaker)

---

## 🔑 Exit Codes

```typescript
const EXIT_CODES = {
  SUCCESS: 0,    // PASS
  FAILURE: 1,   // FAIL
  ERROR: 2,      // ERROR
} as const;
```

---

## 📚 Error Types

### `MemoryLinkError`

Base error class.

```typescript
class MemoryLinkError extends Error {
  code: string;
  exitCode: ExitCode;
}
```

### `ValidationError`

Input validation error.

```typescript
class ValidationError extends MemoryLinkError {
  field: string;
}
```

### `StorageError`

Storage operation error.

```typescript
class StorageError extends MemoryLinkError {
  operation: string;
}
```

### `QuarantineError`

Quarantine operation error.

```typescript
class QuarantineError extends MemoryLinkError {
  pattern: string;
  recordId?: string;
}
```

### `EvidenceLevelError`

Evidence level validation error.

```typescript
class EvidenceLevelError extends MemoryLinkError {
  currentLevel: string;
  targetLevel: string;
}
```

---

## 🔍 Path Utilities

### `getMemoryLinkRoot`

Get `.memorylink/` root directory.

```typescript
function getMemoryLinkRoot(cwd?: string): string;
```

### `getRecordsPath`

Get records directory path.

```typescript
function getRecordsPath(cwd: string, scope: Scope): string;
```

### `getQuarantinedPath`

Get quarantined directory path.

```typescript
function getQuarantinedPath(cwd: string): string;
```

### `getAuditEventsPath`

Get audit events file path.

```typescript
function getAuditEventsPath(cwd: string): string;
```

---

## 📖 More Information

- [SPEC.md](../SPEC.md) - Complete specification
- [README.md](../README.md) - User guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines

---

**API Version:** 1.0.0
**Last Updated:** December 30, 2025

