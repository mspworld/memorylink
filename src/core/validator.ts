/**
 * Input validation
 * Week 1 Day 7: Validation
 * Based on Implementation Guide Pattern 1.3
 */

import { ValidationError } from './errors.js';
import type { Result, EvidenceLevel } from './types.js';
import { Ok, Err } from './types.js';

/**
 * Validate topic (conflict_key)
 * Based on SPEC.md requirements
 */
export function validateTopic(topic: string): Result<string, ValidationError> {
  if (typeof topic !== 'string') {
    return Err(new ValidationError('Topic must be a string', 'topic'));
  }

  if (topic.trim().length === 0) {
    return Err(new ValidationError('Topic cannot be empty', 'topic'));
  }

  if (topic.length > 200) {
    return Err(new ValidationError('Topic exceeds 200 characters', 'topic'));
  }

  // Normalize: lowercase, trim, replace spaces with dots
  const normalized = topic
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.');

  return Ok(normalized);
}

/**
 * Validate content
 */
export function validateContent(content: string): Result<string, ValidationError> {
  if (typeof content !== 'string') {
    return Err(new ValidationError('Content must be a string', 'content'));
  }

  if (content.trim().length === 0) {
    return Err(new ValidationError('Content cannot be empty', 'content'));
  }

  // Max content size: 1MB (prevent abuse)
  const maxSize = 1024 * 1024; // 1MB
  if (content.length > maxSize) {
    return Err(new ValidationError('Content exceeds maximum size (1MB)', 'content'));
  }

  return Ok(content);
}

/**
 * Validate evidence level
 * E2 can ONLY be created via promote, not capture
 */
export function validateEvidenceLevel(
  level: string,
  allowE2: boolean = false
): Result<EvidenceLevel, ValidationError> {
  if (level !== 'E0' && level !== 'E1' && level !== 'E2') {
    return Err(new ValidationError(
      `Invalid evidence level: ${level}. Must be E0, E1, or E2`,
      'evidence_level'
    ));
  }

  if (level === 'E2' && !allowE2) {
    return Err(new ValidationError(
      'Cannot create E2 via capture. Use ml promote to create E2.',
      'evidence_level'
    ));
  }

  return Ok(level as EvidenceLevel);
}

/**
 * Validate record ID format
 * Format: "mem_" + timestamp + random
 */
export function validateRecordId(id: string): Result<string, ValidationError> {
  if (typeof id !== 'string') {
    return Err(new ValidationError('Record ID must be a string', 'id'));
  }

  if (!id.startsWith('mem_')) {
    return Err(new ValidationError('Record ID must start with "mem_"', 'id'));
  }

  if (id.length < 10) {
    return Err(new ValidationError('Record ID too short', 'id'));
  }

  return Ok(id);
}

