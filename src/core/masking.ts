/**
 * Secret Masking Module
 * Prevents secrets from being displayed in terminal output
 * Critical for security: secrets should never be visible in logs/screens
 * 
 * Based on Perplexity AI hardening recommendations
 */

/**
 * Mask a secret value for safe display
 * Shows first 4 and last 3 characters only
 * 
 * @example
 * maskSecret("AKIAIOSFODNN7EXAMPLE") => "AKIA***********PLE"
 * maskSecret("sk-abc123") => "****"
 */
export function maskSecret(secret: string): string {
  // Short secrets are completely masked
  if (secret.length <= 10) {
    return '****';
  }

  const start = secret.substring(0, 4);
  const end = secret.substring(secret.length - 3);
  const middleLength = Math.min(secret.length - 7, 20);
  const middle = '*'.repeat(middleLength);

  return `${start}${middle}${end}`;
}

/**
 * Secret match info
 */
export interface SecretMatch {
  pattern: string;
  match: string;
  position: number;
  line?: number;
}

/**
 * Mask all secrets in content
 * Replaces each secret with its masked version
 * 
 * @param content - Original content
 * @param matches - Array of secret matches with positions
 * @returns Content with all secrets masked
 */
export function maskSecrets(content: string, matches: SecretMatch[]): string {
  if (matches.length === 0) {
    return content;
  }

  let masked = content;

  // Sort by position (reverse) to avoid offset issues when replacing
  const sortedMatches = [...matches].sort((a, b) => b.position - a.position);

  for (const match of sortedMatches) {
    const before = masked.substring(0, match.position);
    const after = masked.substring(match.position + match.match.length);
    const maskedMatch = maskSecret(match.match);

    masked = before + maskedMatch + after;
  }

  return masked;
}

/**
 * Mask a line containing a secret
 * Useful for displaying context around a secret
 * 
 * @param line - Full line of code/text
 * @param secretValue - The secret value to mask
 * @returns Line with secret masked
 */
export function maskLineSecret(line: string, secretValue: string): string {
  if (!secretValue || secretValue.length === 0) {
    return line;
  }

  const masked = maskSecret(secretValue);
  return line.replace(secretValue, masked);
}

/**
 * Create a safe preview of content with secrets masked
 * Truncates long content and masks all detected secrets
 * 
 * @param content - Original content
 * @param matches - Secret matches
 * @param maxLength - Maximum preview length (default 200)
 * @returns Safe preview string
 */
export function createSafePreview(
  content: string,
  matches: SecretMatch[],
  maxLength: number = 200
): string {
  // First mask the secrets
  let safe = maskSecrets(content, matches);
  
  // Truncate if needed
  if (safe.length > maxLength) {
    safe = safe.substring(0, maxLength) + '...';
  }
  
  // Replace newlines for single-line preview
  safe = safe.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  
  return safe;
}

/**
 * Format a masked secret for display with pattern info
 * 
 * @param pattern - Pattern name that matched
 * @param secret - The secret value
 * @returns Formatted string like "AWS_KEY: AKIA***PLE"
 */
export function formatMaskedSecret(pattern: string, secret: string): string {
  return `${pattern}: ${maskSecret(secret)}`;
}

/**
 * Check if a string looks like it might be a masked secret
 * Useful for validation
 */
export function isMasked(value: string): boolean {
  return value.includes('****') || /^.{4}\*{5,}.{3}$/.test(value);
}

