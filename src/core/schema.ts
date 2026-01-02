/**
 * JSON Schemas for validation
 * Week 1 Day 7: Validation
 * Using Ajv for JSON Schema validation
 */

import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true, strict: true });
// Note: ajv-formats removed - date-time format validation handled manually if needed

/**
 * MemoryRecord JSON Schema
 * Based on SPEC.md v4.3.10
 */
export const memoryRecordSchema = {
  type: 'object',
  required: [
    'id',
    'content',
    'evidence_level',
    'status',
    'scope',
    'conflict_key',
    'purpose_tags',
    'created_at',
  ],
  properties: {
    id: {
      type: 'string',
      pattern: '^mem_.+',
    },
    content: {
      type: 'string',
      minLength: 1,
      maxLength: 1048576, // 1MB
    },
    evidence_level: {
      type: 'string',
      enum: ['E0', 'E1', 'E2'],
    },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'DEPRECATED', 'QUARANTINED'],
    },
    scope: {
      type: 'object',
      required: ['type', 'id'],
      properties: {
        type: {
          type: 'string',
          enum: ['project', 'user', 'org'],
        },
        id: {
          type: 'string',
          minLength: 1,
        },
      },
      additionalProperties: false,
    },
    conflict_key: {
      type: 'string',
      minLength: 1,
      maxLength: 200,
    },
    purpose_tags: {
      type: 'array',
      items: {
        type: 'string',
      },
    },
    created_at: {
      type: 'string',
      format: 'date-time',
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        required: ['type', 'ref', 'captured_at'],
        properties: {
          type: { type: 'string' },
          ref: { type: 'string' },
          captured_at: { type: 'string', format: 'date-time' },
        },
      },
    },
    redactions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['rule_id', 'span', 'replacement'],
        properties: {
          rule_id: { type: 'string' },
          span: {
            type: 'array',
            items: { type: 'number' },
            minItems: 2,
            maxItems: 2,
          },
          replacement: { type: 'string' },
        },
      },
    },
    quarantine_ref: {
      type: 'string',
    },
    // Week 5: Team isolation (optional)
    ownership: {
      type: 'object',
      properties: {
        owner: { type: 'string' },
        editors: {
          type: 'array',
          items: { type: 'string' },
        },
        readonly: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      additionalProperties: false,
    },
    // Week 6: Memory poisoning protection (optional)
    memory_type: {
      type: 'string',
      enum: ['fact', 'preference', 'instruction'],
    },
    provenance: {
      type: 'object',
      properties: {
        author: { type: 'string' },
        approved_by: { type: 'string' },
        approved_at: { type: 'string', format: 'date-time' },
        reason: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

/**
 * Validate MemoryRecord against schema
 */
export const validateMemoryRecord = ajv.compile(memoryRecordSchema);

/**
 * Conditional validation: quarantine_ref required if QUARANTINED
 */
export function validateMemoryRecordConditional(record: any): boolean {
  // First validate against base schema
  if (!validateMemoryRecord(record)) {
    return false;
  }

  // Conditional: quarantine_ref MUST exist if QUARANTINED
      if (record.status === 'QUARANTINED' && !(record as any).quarantine_ref) {
    return false;
  }

  // Conditional: quarantine_ref MUST NOT exist if not QUARANTINED
      if (record.status !== 'QUARANTINED' && (record as any).quarantine_ref) {
    return false;
  }

  return true;
}

