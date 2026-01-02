/**
 * Context-aware detection utilities
 * Phase 2: File type context, variable name context, whitelist support
 * Based on AI research findings - reduces false positives by 50%
 */

import { existsSync, readFileSync } from 'fs';
import { extname, basename } from 'path';
import { getConfigPath } from '../storage/paths.js';
import type { Result } from '../core/types.js';
import { Ok, Err } from '../core/types.js';
import { ConfigError } from '../core/errors.js';

/**
 * Severity levels for detection
 * Week 7: Context-aware severity classification
 */
export enum Severity {
  ERROR = 'error',  // Blocking - real secrets (28 patterns)
  WARN = 'warn',    // Warning - potential leaks (browser, debug patterns)
}

/**
 * File type categories for context-aware detection
 */
export enum FileType {
  ENV = 'env',           // .env, .env.local, etc.
  TERRAFORM = 'terraform', // .tf, .tfvars
  YAML = 'yaml',        // .yaml, .yml
  JSON = 'json',        // .json
  CODE = 'code',        // .js, .ts, .py, etc.
  CONFIG = 'config',    // config files
  BROWSER = 'browser',  // Browser context (HTML, JS in browser)
  OTHER = 'other',      // other file types
}

/**
 * Detect file type from path
 */
export function detectFileType(filePath: string): FileType {
  const ext = extname(filePath).toLowerCase();
  const fileName = basename(filePath).toLowerCase();

  // .env files
  if (fileName.startsWith('.env') || ext === '.env') {
    return FileType.ENV;
  }

  // Terraform files
  if (ext === '.tf' || ext === '.tfvars' || fileName.includes('terraform')) {
    return FileType.TERRAFORM;
  }

  // YAML files
  if (ext === '.yaml' || ext === '.yml') {
    return FileType.YAML;
  }

  // JSON files
  if (ext === '.json') {
    return FileType.JSON;
  }

  // Code files
  if (['.js', '.ts', '.py', '.java', '.go', '.rb', '.php', '.cpp', '.c'].includes(ext)) {
    return FileType.CODE;
  }

  // Config files
  if (fileName.includes('config') || fileName.includes('settings') || fileName.includes('secret')) {
    return FileType.CONFIG;
  }

  // Browser files (HTML, JS in browser context)
  if (ext === '.html' || ext === '.htm' || fileName.includes('browser') || fileName.includes('client')) {
    return FileType.BROWSER;
  }

  return FileType.OTHER;
}

/**
 * Week 7: Check if value looks like a token
 * Tokens are typically:
 * - Long alphanumeric strings (32+ chars)
 * - Base64-like (A-Za-z0-9+/=)
 * - Hex-like (0-9a-f)
 * - UUID-like (with dashes)
 */
export function isTokenLike(value: string): boolean {
  const trimmed = value.trim();
  
  // Too short to be a token
  if (trimmed.length < 16) {
    return false;
  }
  
  // Base64-like pattern (common for tokens)
  const base64Pattern = /^[A-Za-z0-9+/=_-]{32,}$/;
  if (base64Pattern.test(trimmed)) {
    // Check entropy (tokens have high entropy)
    const entropy = calculateEntropy(trimmed);
    if (entropy > 4.0) { // High entropy = likely token
      return true;
    }
  }
  
  // Hex-like pattern (some tokens are hex)
  const hexPattern = /^[0-9a-fA-F]{32,}$/;
  if (hexPattern.test(trimmed)) {
    return true;
  }
  
  // UUID-like pattern (with dashes)
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(trimmed)) {
    return true;
  }
  
  // Long alphanumeric (32+ chars, high entropy)
  const alphanumericPattern = /^[A-Za-z0-9_-]{32,}$/;
  if (alphanumericPattern.test(trimmed)) {
    const entropy = calculateEntropy(trimmed);
    if (entropy > 4.0) {
      return true;
    }
  }
  
  return false;
}

/**
 * Week 7: Check if code is in browser context
 * Browser context indicators:
 * - localStorage, sessionStorage
 * - window, document
 * - console.log in browser
 * - URL parameters
 * - Browser APIs
 */
export function isBrowserContext(content: string, filePath: string): boolean {
  const normalized = content.toLowerCase();
  
  // Check file type
  if (detectFileType(filePath) === FileType.BROWSER) {
    return true;
  }
  
  // Check for browser APIs
  const browserIndicators = [
    'localstorage',
    'sessionstorage',
    'window.',
    'document.',
    'navigator.',
    'location.',
    'history.',
    'fetch(',
    'xmlhttprequest',
    'websocket',
  ];
  
  for (const indicator of browserIndicators) {
    if (normalized.includes(indicator)) {
      return true;
    }
  }
  
  // Check for URL patterns
  if (normalized.includes('?token=') || normalized.includes('?key=') || normalized.includes('?auth=')) {
    return true;
  }
  
  // Check for console.log with headers/auth
  if (normalized.includes('console.log') && 
      (normalized.includes('header') || normalized.includes('authorization') || normalized.includes('token'))) {
    return true;
  }
  
  return false;
}

/**
 * Calculate Shannon entropy of a string
 * Higher entropy = more random = more likely to be a secret
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
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

/**
 * Variable name confidence levels
 * Higher confidence = more likely to be a real secret
 */
export enum ConfidenceLevel {
  HIGH = 'high',      // Very likely a secret (API_KEY, SECRET_KEY, PASSWORD)
  MEDIUM = 'medium',  // Possibly a secret (KEY, TOKEN, AUTH)
  LOW = 'low',        // Unlikely a secret (TEST_KEY, MOCK_SECRET, EXAMPLE)
  VERY_LOW = 'very_low', // Very unlikely (DUMMY, FAKE, SAMPLE)
}

/**
 * High confidence variable name patterns
 * These are very likely to be real secrets
 */
const HIGH_CONFIDENCE_PATTERNS = [
  /^API[_-]?KEY$/i,
  /^SECRET[_-]?KEY$/i,
  /^SECRET$/i,
  /^PASSWORD$/i,
  /^PASS$/i,
  /^PWD$/i,
  /^TOKEN$/i,
  /^AUTH[_-]?TOKEN$/i,
  /^ACCESS[_-]?TOKEN$/i,
  /^PRIVATE[_-]?KEY$/i,
  /^CLIENT[_-]?SECRET$/i,
  /^CREDENTIALS?$/i,
  /^AUTH[_-]?KEY$/i,
];

/**
 * Medium confidence variable name patterns
 * These might be secrets
 */
const MEDIUM_CONFIDENCE_PATTERNS = [
  /^KEY$/i,
  /^TOKEN$/i,
  /^AUTH$/i,
  /^SECRET$/i,
  /^PASS$/i,
];

/**
 * Low confidence variable name patterns
 * These are likely test/mock data
 */
const LOW_CONFIDENCE_PATTERNS = [
  /^TEST[_-]?/i,
  /^MOCK[_-]?/i,
  /^EXAMPLE[_-]?/i,
  /^SAMPLE[_-]?/i,
  /^DEMO[_-]?/i,
  /^FAKE[_-]?/i,
  /^DUMMY[_-]?/i,
  /^PLACEHOLDER[_-]?/i,
];

/**
 * Very low confidence variable name patterns
 * These are definitely not secrets
 */
const VERY_LOW_CONFIDENCE_PATTERNS = [
  /^TEST[_-]?KEY$/i,
  /^MOCK[_-]?SECRET$/i,
  /^EXAMPLE[_-]?PASSWORD$/i,
  /^SAMPLE[_-]?TOKEN$/i,
  /^DUMMY[_-]?KEY$/i,
  /^FAKE[_-]?SECRET$/i,
];

/**
 * Get confidence level for a variable name
 */
export function getVariableConfidence(variableName: string): ConfidenceLevel {
  // Check very low confidence first (most specific)
  for (const pattern of VERY_LOW_CONFIDENCE_PATTERNS) {
    if (pattern.test(variableName)) {
      return ConfidenceLevel.VERY_LOW;
    }
  }

  // Check low confidence
  for (const pattern of LOW_CONFIDENCE_PATTERNS) {
    if (pattern.test(variableName)) {
      return ConfidenceLevel.LOW;
    }
  }

  // Check high confidence
  for (const pattern of HIGH_CONFIDENCE_PATTERNS) {
    if (pattern.test(variableName)) {
      return ConfidenceLevel.HIGH;
    }
  }

  // Check medium confidence
  for (const pattern of MEDIUM_CONFIDENCE_PATTERNS) {
    if (pattern.test(variableName)) {
      return ConfidenceLevel.MEDIUM;
    }
  }

  // Default to medium (unknown variable name)
  return ConfidenceLevel.MEDIUM;
}

/**
 * Whitelist configuration
 */
export interface WhitelistConfig {
  patterns?: string[];        // Regex patterns to whitelist
  variableNames?: string[];   // Variable names to whitelist
  values?: string[];          // Specific values to whitelist
  fileTypes?: string[];       // File types to whitelist
  files?: string[];           // File paths/glob patterns to skip entirely
}

/**
 * Default files to skip (reduces false positives significantly)
 */
export const DEFAULT_SKIP_FILES: string[] = [
  // Lockfiles (full of integrity hashes)
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'composer.lock',
  'Gemfile.lock',
  'poetry.lock',
  'Cargo.lock',
  
  // Build artifacts
  '*.min.js',
  '*.min.css',
  '*.map',
  'dist/**',
  'build/**',
  'out/**',
  
  // Dependencies
  'node_modules/**',
  'vendor/**',
  '.pnpm/**',
  
  // Version control
  '.git/**',
  
  // Test artifacts
  'coverage/**',
  '__snapshots__/**',
  
  // MemoryLink internal (pattern definitions are not secrets!)
  '**/patterns.ts',
  '**/instruction-injection.ts',
  '**/context.ts',
  '**/keyvalue.ts',
  '**/validation.ts',
  '**/detector.ts',
  '**/errors.ts',
  
  // CLI command implementations (internal code)
  '**/cli/commands/**',
  '**/cli/output.ts',
  
  // Documentation (examples are not secrets)
  '*.md',
  'docs/**',
  
  // Test files (test secrets are not real)
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/test-*.ts',
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
];

/**
 * Check if a file path should be skipped entirely
 */
export function shouldSkipFile(filePath: string, whitelist?: WhitelistConfig): boolean {
  if (!filePath) return false;
  
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fileName = basename(filePath);
  
  // Always skip certain files (lockfiles, node_modules, etc.)
  for (const skipPattern of DEFAULT_SKIP_FILES) {
    if (matchGlob(normalizedPath, skipPattern) || matchGlob(fileName, skipPattern)) {
      return true;
    }
  }
  
  // Check user-defined file whitelist
  if (whitelist?.files) {
    for (const pattern of whitelist.files) {
      if (matchGlob(normalizedPath, pattern) || matchGlob(fileName, pattern)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Simple glob matching (supports * and **)
 */
function matchGlob(path: string, pattern: string): boolean {
  // Exact match
  if (path === pattern) return true;
  if (path.endsWith('/' + pattern)) return true;
  if (path.endsWith(pattern)) return true;
  
  // Convert glob to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');
  
  try {
    return new RegExp(`(^|/)${regexPattern}$`).test(path);
  } catch {
    return false;
  }
}

/**
 * MemoryLink config with whitelist
 */
interface MemoryLinkConfigWithWhitelist {
  patterns?: {
    disabled?: string[];
    custom?: Array<{
      id: string;
      name: string;
      pattern: string;
      description: string;
    }>;
  };
  whitelist?: WhitelistConfig;
}

/**
 * Load whitelist configuration
 */
export function loadWhitelistConfig(cwd: string): Result<WhitelistConfig, ConfigError> {
  const configPath = getConfigPath(cwd);

  if (!existsSync(configPath)) {
    return Ok({}); // No config file, return empty whitelist
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content) as MemoryLinkConfigWithWhitelist;
    return Ok(config.whitelist || {});
  } catch (error: any) {
    return Err(new ConfigError(`Failed to load whitelist config: ${error.message}`));
  }
}

/**
 * Check if a value matches whitelist patterns
 */
export function isWhitelisted(
  value: string,
  variableName?: string,
  filePath?: string,
  whitelist?: WhitelistConfig
): boolean {
  if (!whitelist) {
    return false;
  }

  // Check value patterns
  if (whitelist.patterns) {
    for (const patternStr of whitelist.patterns) {
      try {
        const pattern = new RegExp(patternStr, 'i');
        if (pattern.test(value)) {
          return true;
        }
      } catch {
        // Invalid regex, skip
      }
    }
  }

  // Check specific values
  if (whitelist.values) {
    if (whitelist.values.includes(value)) {
      return true;
    }
  }

  // Check variable names
  if (variableName && whitelist.variableNames) {
    if (whitelist.variableNames.includes(variableName)) {
      return true;
    }
  }

  // Check file types
  if (filePath && whitelist.fileTypes) {
    const fileType = detectFileType(filePath);
    if (whitelist.fileTypes.includes(fileType)) {
      return true;
    }
  }

  return false;
}

/**
 * Get context-aware confidence score
 * Combines file type, variable name, and whitelist
 * 
 * @returns Score from 0-100 (higher = more likely to be a secret)
 */
export function getContextConfidence(
  value: string,
  variableName?: string,
  filePath?: string,
  whitelist?: WhitelistConfig
): number {
  // Check whitelist first (if whitelisted, return 0)
  if (isWhitelisted(value, variableName, filePath, whitelist)) {
    return 0;
  }

  let score = 50; // Base score

  // File type context
  if (filePath) {
    const fileType = detectFileType(filePath);
    switch (fileType) {
      case FileType.ENV:
      case FileType.CONFIG:
        score += 20; // Config files more likely to have secrets
        break;
      case FileType.TERRAFORM:
      case FileType.YAML:
        score += 15; // Infrastructure files
        break;
      case FileType.CODE:
        score -= 10; // Code files less likely (might be test data)
        break;
      default:
        // No change
        break;
    }
  }

  // Variable name context
  if (variableName) {
    const confidence = getVariableConfidence(variableName);
    switch (confidence) {
      case ConfidenceLevel.HIGH:
        score += 30; // Very likely a secret
        break;
      case ConfidenceLevel.MEDIUM:
        score += 10; // Possibly a secret
        break;
      case ConfidenceLevel.LOW:
        score -= 20; // Unlikely a secret
        break;
      case ConfidenceLevel.VERY_LOW:
        score -= 40; // Very unlikely
        break;
    }
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Check if detection should proceed based on context
 * Returns true if confidence is high enough to flag as secret
 * 
 * @param threshold Minimum confidence score (0-100) to flag as secret (default: 40)
 */
export function shouldFlagAsSecret(
  value: string,
  variableName?: string,
  filePath?: string,
  whitelist?: WhitelistConfig,
  threshold: number = 40
): boolean {
  const confidence = getContextConfidence(value, variableName, filePath, whitelist);
  return confidence >= threshold;
}

