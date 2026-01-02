/**
 * Path utilities for cross-platform compatibility
 * Windows uses backslashes, normalize to forward slashes
 */

/**
 * Normalize file path for cross-platform compatibility
 * Converts Windows backslashes to forward slashes
 */
export function normalizePath(filepath: string): string {
  return filepath.replace(/\\/g, '/');
}

/**
 * Normalize line endings for cross-platform compatibility
 * Windows uses CRLF (\r\n), normalize to LF (\n)
 */
export function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Get relative path from base, normalized
 */
export function getRelativePath(from: string, to: string): string {
  const { relative } = require('path');
  return normalizePath(relative(from, to));
}

/**
 * Check if path is absolute
 */
export function isAbsolutePath(filepath: string): boolean {
  // Windows: C:\path or \\server\share
  // Unix: /path
  return /^([a-zA-Z]:[\\/]|[\\/]{2}|\/)/i.test(filepath);
}

/**
 * Join paths with normalization
 */
export function joinPaths(...paths: string[]): string {
  const { join } = require('path');
  return normalizePath(join(...paths));
}

