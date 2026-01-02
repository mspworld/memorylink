/**
 * Remediation guides for detected secrets
 * Week 9 Day 57-59: JSON output
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Provider-specific remediation steps
 */

import type { SecretPattern } from '../quarantine/patterns.js';

/**
 * Remediation guide for a detected secret
 */
export interface RemediationGuide {
  provider: string; // e.g., "GitHub", "AWS", "OpenAI"
  steps: string[]; // Step-by-step remediation instructions
  reference_url?: string; // Link to provider documentation
}

/**
 * Get remediation guide for a pattern
 */
export function getRemediationGuide(pattern: SecretPattern): RemediationGuide | null {
  const patternId = pattern.id.toLowerCase();
  
  // GitHub patterns
  if (patternId.includes('github') || patternId.includes('ghp_') || patternId.includes('gho_')) {
    return {
      provider: 'GitHub',
      steps: [
        '1. Go to GitHub Settings → Developer settings → Personal access tokens',
        '2. Find the exposed token and click "Revoke"',
        '3. Generate a new token if needed',
        '4. Update your code/config with the new token',
        '5. Remove the old token from Git history: git filter-branch or BFG Repo-Cleaner',
      ],
      reference_url: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
    };
  }
  
  // AWS patterns
  if (patternId.includes('aws') || patternId.includes('akia')) {
    return {
      provider: 'AWS',
      steps: [
        '1. Go to AWS IAM Console → Users → Security credentials',
        '2. Find the exposed access key and click "Delete"',
        '3. Create a new access key if needed',
        '4. Update your code/config with the new key',
        '5. Rotate the secret access key immediately',
        '6. Review CloudTrail logs for unauthorized access',
      ],
      reference_url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
    };
  }
  
  // OpenAI/Anthropic patterns
  if (patternId.includes('openai') || patternId.includes('anthropic') || patternId.includes('claude') || patternId.includes('sk-')) {
    return {
      provider: 'OpenAI/Anthropic',
      steps: [
        '1. Go to OpenAI Dashboard → API keys (or Anthropic Console)',
        '2. Find the exposed key and click "Revoke" or "Delete"',
        '3. Generate a new API key',
        '4. Update your code/config with the new key',
        '5. Monitor API usage for suspicious activity',
      ],
      reference_url: 'https://platform.openai.com/api-keys',
    };
  }
  
  // Generic API key
  if (patternId.includes('api') && patternId.includes('key')) {
    return {
      provider: 'Generic API',
      steps: [
        '1. Identify the API provider',
        '2. Log into the provider dashboard',
        '3. Revoke the exposed API key',
        '4. Generate a new API key',
        '5. Update your code/config with the new key',
        '6. Review API usage logs for unauthorized access',
      ],
    };
  }
  
  // Database credentials
  if (patternId.includes('database') || patternId.includes('db') || patternId.includes('postgres') || patternId.includes('mysql')) {
    return {
      provider: 'Database',
      steps: [
        '1. Change the database password immediately',
        '2. Update connection strings in your code/config',
        '3. Review database access logs for unauthorized connections',
        '4. Consider rotating all database credentials',
        '5. Use environment variables or secret managers going forward',
      ],
    };
  }
  
  // Generic secret
  return {
    provider: 'Generic',
    steps: [
      '1. Identify what type of secret this is',
      '2. Revoke or change the secret immediately',
      '3. Generate a new secret if needed',
      '4. Update your code/config with the new secret',
      '5. Remove the old secret from Git history',
      '6. Review access logs for unauthorized usage',
    ],
  };
}

