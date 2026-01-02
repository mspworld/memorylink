/**
 * GitHub token validation
 * Week 9 Day 60-62: Validity checks
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Validates GitHub tokens via GitHub API
 */

import type { Result } from '../core/types.js';
import { Ok } from '../core/types.js';
import { StorageError } from '../core/errors.js';
import type { SecretPattern } from '../quarantine/patterns.js';
import type { ProviderValidator, ValidityResult } from './validity.js';

/**
 * GitHub token validator
 * Validates GitHub Personal Access Tokens (PAT) and OAuth tokens
 */
export class GitHubValidator implements ProviderValidator {
  name = 'GitHub';
  
  /**
   * Check if this validator can validate the given pattern/secret
   */
  canValidate(pattern: SecretPattern, secret: string): boolean {
    const patternId = pattern.id.toLowerCase();
    return (
      patternId.includes('github') ||
      secret.startsWith('ghp_') ||
      secret.startsWith('gho_') ||
      secret.startsWith('ghu_') ||
      secret.startsWith('ghs_') ||
      secret.startsWith('ghr_')
    );
  }
  
  /**
   * Validate GitHub token via API
   */
  async validate(secret: string): Promise<Result<ValidityResult, StorageError>> {
    // Check token format first
    if (!this.isValidFormat(secret)) {
      return Ok({
        is_valid: false,
        status: 'unknown',
        confidence: 90,
        reason: 'Invalid GitHub token format',
        provider: 'GitHub',
      });
    }
    
    // Try to validate via GitHub API
    try {
      const response = await fetch('https://api.github.com/user', {
        method: 'GET',
        headers: {
          'Authorization': `token ${secret}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'MemoryLink/1.0.0',
        },
      });
      
      if (response.status === 200) {
        // Token is valid and active
        const userData = await response.json() as { login?: string };
        return Ok({
          is_valid: true,
          status: 'active',
          confidence: 100,
          reason: `Token is active and belongs to user: ${userData.login || 'unknown'}`,
          provider: 'GitHub',
        });
      } else if (response.status === 401) {
        // Token is invalid or expired
        return Ok({
          is_valid: true, // It's a real token format, just invalid/expired
          status: 'inactive',
          confidence: 95,
          reason: 'Token format is valid but token is invalid or expired',
          provider: 'GitHub',
        });
      } else if (response.status === 403) {
        // Token exists but lacks permissions
        return Ok({
          is_valid: true,
          status: 'active',
          confidence: 90,
          reason: 'Token exists but lacks required permissions',
          provider: 'GitHub',
        });
      } else {
        // API error - can't determine
        return Ok({
          is_valid: true,
          status: 'unknown',
          confidence: 70,
          reason: `GitHub API returned status ${response.status}`,
          provider: 'GitHub',
        });
      }
    } catch (error: any) {
      // Network error or other issue
      // Don't fail - just return unknown status
      return Ok({
        is_valid: true,
        status: 'unknown',
        confidence: 60,
        reason: `Failed to validate via API: ${error.message}`,
        provider: 'GitHub',
      });
    }
  }
  
  /**
   * Check if token has valid GitHub format
   */
  private isValidFormat(token: string): boolean {
    // GitHub token formats:
    // - ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (Personal Access Token)
    // - gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (OAuth token)
    // - ghu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (User-to-server token)
    // - ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (Server-to-server token)
    // - ghr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (Refresh token)
    const githubTokenPattern = /^gh[opurs]_[A-Za-z0-9_]{36,}$/;
    return githubTokenPattern.test(token);
  }
}

/**
 * Create GitHub validator instance
 */
export function createGitHubValidator(): ProviderValidator {
  return new GitHubValidator();
}

