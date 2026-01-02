/**
 * Validity checking for detected secrets
 * Week 9 Day 60-62: Validity checks
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * True/False classification
 * Active/Inactive/Unknown detection
 * Provider validation framework
 */

import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import type { SecretPattern } from '../quarantine/patterns.js';

/**
 * Validity status
 */
export type ValidityStatus = 'active' | 'inactive' | 'unknown';

/**
 * Validity check result
 */
export interface ValidityResult {
  is_valid: boolean; // True if secret is real, False if false positive
  status: ValidityStatus; // Active, Inactive, or Unknown
  confidence: number; // 0-100 confidence score
  reason?: string; // Explanation of the result
  provider?: string; // Provider name (e.g., "GitHub", "AWS")
}

/**
 * Provider validator interface
 */
export interface ProviderValidator {
  name: string;
  canValidate(pattern: SecretPattern, secret: string): boolean;
  validate(secret: string): Promise<Result<ValidityResult, StorageError>>;
}

/**
 * Check validity of a detected secret
 * 
 * @param pattern - The pattern that detected the secret
 * @param secret - The detected secret value
 * @param validators - List of provider validators
 */
export async function checkValidity(
  pattern: SecretPattern,
  secret: string,
  validators: ProviderValidator[] = []
): Promise<ValidityResult> {
  // Try provider-specific validation first
  for (const validator of validators) {
    if (validator.canValidate(pattern, secret)) {
      const result = await validator.validate(secret);
      if (result.ok) {
        return result.value;
      }
      // If validation fails, continue to next validator
    }
  }
  
  // Fallback: Heuristic-based classification
  return classifyByHeuristics(pattern, secret);
}

/**
 * Classify secret by heuristics
 * Used when provider validation is not available
 */
function classifyByHeuristics(
  pattern: SecretPattern,
  secret: string
): ValidityResult {
  const patternId = pattern.id.toLowerCase();
  
  // High confidence patterns (likely real secrets)
  if (
    patternId.includes('github') && secret.startsWith('ghp_') ||
    patternId.includes('github') && secret.startsWith('gho_') ||
    patternId.includes('aws') && secret.startsWith('AKIA') ||
    patternId.includes('openai') && secret.startsWith('sk-') ||
    patternId.includes('anthropic') && secret.startsWith('sk-ant-')
  ) {
    return {
      is_valid: true,
      status: 'active', // Assume active unless proven otherwise
      confidence: 85,
      reason: 'Matches known secret format',
      provider: extractProviderName(patternId),
    };
  }
  
  // Medium confidence (could be real, could be test)
  if (
    patternId.includes('key-value') ||
    patternId.includes('generic')
  ) {
    // Check if it looks like a real secret (high entropy, long length)
    const entropy = calculateEntropy(secret);
    const isLongEnough = secret.length >= 32;
    
    if (entropy > 3.5 && isLongEnough) {
      return {
        is_valid: true,
        status: 'unknown', // Can't determine if active without API check
        confidence: 60,
        reason: 'High entropy and length suggest real secret',
      };
    } else {
      return {
        is_valid: false,
        status: 'unknown',
        confidence: 40,
        reason: 'Low entropy or short length suggests test data',
      };
    }
  }
  
  // Default: Unknown
  return {
    is_valid: true, // Assume valid unless proven false
    status: 'unknown',
    confidence: 50,
    reason: 'Unable to determine validity without provider validation',
  };
}

/**
 * Extract provider name from pattern ID
 */
function extractProviderName(patternId: string): string {
  if (patternId.includes('github')) return 'GitHub';
  if (patternId.includes('aws')) return 'AWS';
  if (patternId.includes('openai')) return 'OpenAI';
  if (patternId.includes('anthropic') || patternId.includes('claude')) return 'Anthropic';
  if (patternId.includes('google') || patternId.includes('gcp')) return 'Google Cloud';
  if (patternId.includes('azure')) return 'Azure';
  if (patternId.includes('database') || patternId.includes('db')) return 'Database';
  return 'Generic';
}

/**
 * Calculate Shannon entropy of a string
 * Higher entropy = more random = more likely to be a real secret
 */
function calculateEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  let entropy = 0;
  const len = str.length;
  
  for (const count of Object.values(freq)) {
    const p = count / len;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  
  return entropy;
}

/**
 * Load false positives from storage
 */
export async function loadFalsePositives(
  cwd: string
): Promise<Result<Set<string>, StorageError>> {
  const { existsSync } = await import('fs');
  const { resolve } = await import('path');
  
  const falsePositivesPath = resolve(cwd, '.memorylink', 'false-positives.json');
  
  if (!existsSync(falsePositivesPath)) {
    return Ok(new Set<string>());
  }
  
  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(falsePositivesPath, 'utf-8');
    const data = JSON.parse(content);
    const falsePositives = Array.isArray(data.false_positives) 
      ? new Set<string>(data.false_positives)
      : new Set<string>();
    
    return Ok(falsePositives);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to load false positives: ${error.message}`,
      'false_positives_load'
    ));
  }
}

/**
 * Mark a secret as false positive
 */
export async function markFalsePositive(
  cwd: string,
  secret: string
): Promise<Result<void, StorageError>> {
  const { writeFile } = await import('fs/promises');
  const { existsSync, mkdirSync } = await import('fs');
  const { resolve, dirname } = await import('path');
  
  const falsePositivesPath = resolve(cwd, '.memorylink', 'false-positives.json');
  const falsePositivesDir = dirname(falsePositivesPath);
  
  // Ensure directory exists
  if (!existsSync(falsePositivesDir)) {
    mkdirSync(falsePositivesDir, { recursive: true });
  }
  
  // Load existing false positives
  const loadResult = await loadFalsePositives(cwd);
  if (!loadResult.ok) {
    return loadResult;
  }
  
  const falsePositives = loadResult.value;
  falsePositives.add(secret);
  
  // Save updated false positives
  try {
    const data = {
      false_positives: Array.from(falsePositives),
      updated_at: new Date().toISOString(),
    };
    
    await writeFile(
      falsePositivesPath,
      JSON.stringify(data, null, 2),
      'utf-8'
    );
    
    return Ok(undefined);
  } catch (error: any) {
    return Err(new StorageError(
      `Failed to save false positives: ${error.message}`,
      'false_positives_save'
    ));
  }
}

/**
 * Check if a secret is marked as false positive
 */
export async function isFalsePositive(
  cwd: string,
  secret: string
): Promise<Result<boolean, StorageError>> {
  const loadResult = await loadFalsePositives(cwd);
  if (!loadResult.ok) {
    return loadResult;
  }
  
  const falsePositives = loadResult.value;
  return Ok(falsePositives.has(secret));
}

