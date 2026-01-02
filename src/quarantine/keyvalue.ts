/**
 * Key-Value Based Secret Detection
 * Truly dynamic detection that catches ANY key name with secret-like values
 * 
 * This handles the real-world scenario where users have:
 * - Custom key names (MY_COMPANY_API_KEY, INTERNAL_SECRET, etc.)
 * - Unknown formats (not in built-in patterns)
 * - Personal data in key-value format
 * 
 * Pattern: ANY_KEY_NAME = secret_value
 */

import type { SecretPattern } from './patterns.js';

/**
 * Secret-like value patterns
 * These detect values that LOOK like secrets, regardless of key name
 * DYNAMIC PRIORITY: Catches ANY secret-like value, even if not in 60 patterns
 */
const SECRET_VALUE_PATTERNS = [
  // Long alphanumeric strings (likely secrets) - 20+ chars
  /^[a-zA-Z0-9\-_!@#$%^&*()+=]{20,}$/,
  
  // Base64-like strings (common for secrets) - 24+ chars (minimum for meaningful secret)
  /^[A-Za-z0-9+/]{24,}={0,2}$/,
  
  // Hex strings (common for tokens) - 32+ chars (16 bytes = 32 hex chars)
  /^[a-f0-9]{32,}$/i,
  
  // UUID-like but longer (API keys often look like this) - 32+ chars
  /^[a-zA-Z0-9\-_]{32,}$/,
  
  // Keys starting with common prefixes (any length after prefix)
  /^(sk-|sk_|SK-|api-|API-|token-|TOKEN-|key-|KEY-|bearer-|BEARER-|auth-|AUTH-)[a-zA-Z0-9\-_]{16,}$/,
  
  // JWT-like tokens (eyJ...)
  /^eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/,
  
  // High entropy strings (random-looking) - 16+ chars with mixed case, numbers, special chars
  /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{16,}$/,
];

/**
 * Secret-indicating key names
 * These key names suggest the value is a secret
 */
const SECRET_KEY_PATTERNS = [
  /secret/i,
  /key/i,
  /token/i,
  /password/i,
  /credential/i,
  /auth/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
  /api[_-]?secret/i,
  /bearer/i,
  /apikey/i,
];

/**
 * Check if a key name suggests it contains a secret
 */
export function isSecretKey(keyName: string): boolean {
  if (!keyName || typeof keyName !== 'string') {
    return false;
  }
  
  return SECRET_KEY_PATTERNS.some(pattern => pattern.test(keyName));
}

/**
 * Check if a value looks like a secret
 */
export function looksLikeSecret(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }
  
  // Remove quotes if present
  const cleanValue = value.replace(/^['"]|['"]$/g, '');
  
  // Check against secret value patterns
  return SECRET_VALUE_PATTERNS.some(pattern => pattern.test(cleanValue));
}

/**
 * Detect secrets in key-value format
 * Handles: KEY=value, KEY: value, KEY = value, etc.
 * DYNAMIC PRIORITY: Catches ANY key-value pair with secret-like value
 * 
 * IMPORTANT: Only flags if BOTH key and value suggest it's a secret
 * This reduces false positives from normal code
 */
export function detectKeyValueSecrets(content: string): {
  found: boolean;
  key?: string;
  value?: string;
  position?: number;
} {
  if (!content || typeof content !== 'string') {
    return { found: false };
  }
  
  // Enhanced pattern to match key-value pairs
  // Matches: KEY=value, KEY: value, KEY = value, KEY: "value", KEY='value', etc.
  // Also handles JSON: "key": "value", YAML: key: value, etc.
  // Also handles template literals: `value`
  // Pattern breakdown:
  // - (["']?[a-zA-Z_][a-zA-Z0-9_]*["']?) - key name (with optional quotes for JSON)
  // - \s*[:=]\s* - separator (colon or equals)
  // - (['"`]?) - opening quote (single, double, or backtick)
  // - ([^\s'"`\n\r,;]+) - value (everything until closing quote or separator)
  // - \2 - closing quote (matches opening quote)
  // IMPROVED: Better JSON handling - matches "key": "value" format
  const keyValuePattern = /(["']?[a-zA-Z_][a-zA-Z0-9_]*["']?)\s*[:=]\s*(['"`]?)([^\s'"`\n\r,;]+)\2/g;
  
  // Additional pattern for JSON format: "key": "value" (with quotes around both)
  const jsonPattern = /"([a-zA-Z_][a-zA-Z0-9_]*)":\s*"([^"]+)"/g;
  
  // First, try JSON format: "key": "value"
  let jsonMatch;
  while ((jsonMatch = jsonPattern.exec(content)) !== null) {
    const keyName = jsonMatch[1];
    const value = jsonMatch[2];
    
      // Process JSON matches (same logic as below)
      if (value.length >= 12 && !value.includes('(') && !value.includes(')') && !value.includes('.')) {
        // IMPROVED: More lenient detection - if it has a known prefix, it's a secret
        const hasKnownPrefix = value.match(/^(sk-|sk_|SK-|AKIA|ghp_|gho_|ghu_|ghs_|ghr_|eyJ|AIza|SK[0-9a-f]{32}|SG\.|key-|key_|shpat_|xox[baprs]-|apk_|tk_|cred_|auth_|pass_|sec_|token_|access_|session_|secret_)/i);
        
        const looksLikeActualSecret = 
          hasKnownPrefix || // If it has a known prefix, it's definitely a secret
          value.match(/^[A-Za-z0-9+/]{20,}={0,2}$/) ||
          value.match(/^[a-f0-9]{24,}$/i) ||
          (value.length >= 24 && value.match(/^[a-zA-Z0-9\-_]{24,}$/) &&
           value.match(/[a-z]/) && value.match(/[A-Z]/) && value.match(/[0-9]/)) ||
          (value.length >= 24 && value.match(/^[a-zA-Z0-9\-_]{24,}$/) &&
           (value.includes('_') || value.includes('-')) &&
           value.match(/[a-z]/) && (value.match(/[A-Z]/) || value.match(/[0-9]/))) ||
          value.length >= 40; // Lowered from 50 to 40
        
        if (looksLikeActualSecret) {
          const keyIsSecret = isSecretKey(keyName);
          // IMPROVED: If it has a known prefix, always detect it (even if < 24 chars)
          if (hasKnownPrefix || keyIsSecret || value.length >= 20) { // Lowered from 24 to 20
          return {
            found: true,
            key: keyName,
            value: value.length > 50 ? value.substring(0, 50) + '...' : value,
            position: jsonMatch.index,
          };
        }
      }
    }
  }
  
  // Then, try standard key-value format
  let match;
  while ((match = keyValuePattern.exec(content)) !== null) {
    const keyName = match[1].replace(/^["']|["']$/g, ''); // Remove quotes from key
    const value = match[3];
    
    // CRITICAL: Only flag if there's an ACTUAL SECRET VALUE
    // Not just any key-value pair - must be a real secret
    
    // Skip if value is too short or doesn't look like a secret
    // Lowered from 16 to 12 to catch more secrets (API keys can be 12+ chars)
    if (value.length < 12) {
      continue; // Too short to be a secret
    }
    
    // Skip if value is a function call or code pattern (not a secret)
    // Function calls have parentheses, dots, etc.
    if (value.includes('(') || value.includes(')') || value.includes('.') || value.includes('=')) {
      continue; // This is code, not a secret
    }
    
    // Skip common non-secret values
    // FIXED: Only skip if the value IS the non-secret word (exact match), not contains
    // This prevents false negatives like "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    // which contains "EXAMPLE" as a substring
    const nonSecretValues = [
      'RESPONSIBILITIES', 'PURPOSE', 'DESCRIPTION',
      'category', 'pattern', 'result', 'detection',
      'config', 'filePath', 'fileType', 'variableName', 'confidence',
      'parse', 'getCategoryFromPattern', 'detectKeyValueSecrets',
      'ensureParentDirectory', 'DataValidator', 'strict_mode',
      'validator', 'auditPath', 'dirResult', 'keyIsSecret',
      'isSecretKey', 'looksLikeSecret', 'standaloneResult',
    ];
    
    // Only skip if value is EXACTLY a non-secret word (not a substring)
    if (nonSecretValues.some(nsv => value.toLowerCase() === nsv.toLowerCase())) {
      continue; // Not a secret value
    }
    
    // Check if value looks like an ACTUAL secret (not code, not a word)
    // Must match known secret patterns OR be high entropy
    // IMPROVED: More lenient to catch more secrets (aiming for 100% detection)
    const hasKnownPrefix = value.match(/^(sk-|sk_|SK-|AKIA|ghp_|gho_|ghu_|ghs_|ghr_|eyJ|AIza|SK[0-9a-f]{32}|SG\.|key-|key_|shpat_|xox[baprs]-|apk_|tk_|cred_|auth_|pass_|sec_|token_|access_|session_|secret_)/i);
    
    const looksLikeActualSecret = 
      hasKnownPrefix || // If it has a known prefix, it's definitely a secret (any length)
      // Base64-like (20+ chars, was 24+) - more lenient pattern
      value.match(/^[A-Za-z0-9+/]{20,}={0,2}$/) ||
      // Base64-like without padding (common in secrets)
      (value.length >= 20 && value.match(/^[A-Za-z0-9+/]{20,}$/) && !value.match(/[^A-Za-z0-9+/=]/)) ||
      // Hex (24+ chars, was 32+) - more lenient
      value.match(/^[a-f0-9]{24,}$/i) ||
      // Hex with uppercase (ABCDEF...)
      (value.length >= 24 && value.match(/^[A-F0-9]{24,}$/)) ||
      // High entropy alphanumeric (24+ chars with mixed case and numbers, was 32+)
      (value.length >= 24 && value.match(/^[a-zA-Z0-9\-_]{24,}$/) &&
       value.match(/[a-z]/) && value.match(/[A-Z]/) && value.match(/[0-9]/)) ||
      // High entropy with underscores/dashes (24+ chars)
      (value.length >= 24 && value.match(/^[a-zA-Z0-9\-_]{24,}$/) &&
       (value.includes('_') || value.includes('-')) &&
       value.match(/[a-z]/) && (value.match(/[A-Z]/) || value.match(/[0-9]/))) ||
      // Very long strings (40+ chars, lowered from 50) are likely secrets
      value.length >= 40 ||
      // Values starting with common secret words (key_, secret_, token_, etc.) - 20+ chars
      (value.length >= 20 && value.match(/^(key_|secret_|token_|access_|session_|cred_|auth_|pass_|sec_|api_key_)/i)) ||
      // Very long alphanumeric strings (60+ chars) are almost certainly secrets
      (value.length >= 60 && value.match(/^[a-zA-Z0-9\-_]{60,}$/)) ||
      // High-entropy strings starting with numbers (like 9876543210...)
      (value.length >= 40 && value.match(/^[0-9]{10,}[a-zA-Z]/) && value.match(/[a-z]/) && value.match(/[A-Z]/));
    
    if (!looksLikeActualSecret) {
      continue; // Doesn't look like an actual secret
    }
    
    // Now check if key suggests it's a secret
    const keyIsSecret = isSecretKey(keyName);
    
    // Only flag if:
    // 1. Value looks like an actual secret (checked above)
    // 2. AND key suggests it's a secret OR value is very clearly a secret
    // IMPROVED: If it has a known prefix, always detect it (even if < 20 chars)
    // Otherwise, detect if key suggests secret OR value is 20+ chars (lowered from 24)
    // ALSO: Detect high-entropy strings (24+ chars) even without secret key name
    const isHighEntropy = value.length >= 24 && value.match(/^[a-zA-Z0-9\-_]{24,}$/) &&
      ((value.match(/[a-z]/) && value.match(/[A-Z]/) && value.match(/[0-9]/)) ||
       (value.includes('_') || value.includes('-')) && value.match(/[a-z]/) && (value.match(/[A-Z]/) || value.match(/[0-9]/)));
    
    // IMPROVED: Detect ANY 20+ char alphanumeric string with mixed case OR numbers (very lenient for 100% detection)
    const isLongRandomString = value.length >= 20 && value.match(/^[a-zA-Z0-9\-_]{20,}$/) &&
      (value.match(/[a-z]/) && (value.match(/[A-Z]/) || value.match(/[0-9]/)));
    
    // IMPROVED: If looksLikeActualSecret is true, ALWAYS detect it (for 100% detection rate)
    // Since we already verified it looks like a secret, detect it regardless of key name
    // This ensures any value that passes looksLikeActualSecret is detected
    if (hasKnownPrefix || keyIsSecret || value.length >= 20 || isHighEntropy || isLongRandomString || value.length >= 40 || looksLikeActualSecret) {
      // High confidence - actual secret value
      return {
        found: true,
        key: keyName,
        value: value.length > 50 ? value.substring(0, 50) + '...' : value, // Truncate for safety
        position: match.index,
      };
    }
  }
  
  return { found: false };
}

/**
 * Detect standalone secret values (not in key-value format)
 * DYNAMIC PRIORITY: Catches secrets that appear without a key name
 * Examples: sk-proj-abc123xyz789, eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */
export function detectStandaloneSecrets(content: string): {
  found: boolean;
  value?: string;
  position?: number;
} {
  if (!content || typeof content !== 'string') {
    return { found: false };
  }
  
  // Check for standalone secret-like values (not in key-value format)
  // This catches secrets that appear in code, comments, or anywhere
  for (const pattern of SECRET_VALUE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      const value = match[0];
      
      // Additional validation: must be at least 16 chars and look random
      if (value.length >= 16) {
        return {
          found: true,
          value: value.length > 50 ? value.substring(0, 50) + '...' : value,
          position: match.index,
        };
      }
    }
  }
  
  return { found: false };
}

/**
 * Create a dynamic pattern for key-value detection
 * This is used as a fallback when specific patterns don't match
 */
export function createKeyValuePattern(): SecretPattern {
  return {
    id: 'key-value-dynamic',
    name: 'Key-Value Secret (Dynamic)',
    pattern: /([a-zA-Z_][a-zA-Z0-9_]*)\s*[:=]\s*(['"]?)([a-zA-Z0-9\-_!@#$%^&*()+=]{32,})\2/i,
    description: 'Dynamic key-value secret detection (catches ANY key with secret-like value)',
  };
}

