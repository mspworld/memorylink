/**
 * MemoryLink Quarantine Encryption
 * AES-256-GCM encryption for quarantined secrets
 * Based on 8 AI expert consensus
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync, createHash } from 'crypto';
import { readFile, writeFile, chmod } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Encryption constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;

// File markers
const ENCRYPTED_MARKER = 'MEMORYLINK_ENCRYPTED_V1';

/**
 * Get project hash for unique key per project
 * This ensures different projects have different encryption keys
 */
function getProjectHash(): string {
  return createHash('sha256')
    .update(process.cwd())
    .digest('hex')
    .substring(0, 16);
}

/**
 * Get the key path for current project
 * Keys stored in ~/.memorylink/keys/[projectHash].key
 * NOT in project directory (would leak in Git/npm)
 */
export function getKeyPath(): string {
  const projectHash = getProjectHash();
  return join(homedir(), '.memorylink', 'keys', `${projectHash}.key`);
}

/**
 * Get or create the encryption key
 * Key is stored in user's home directory, NOT in project
 * Each project gets a unique key based on its path hash
 */
async function getOrCreateKey(): Promise<Buffer> {
  const keyPath = getKeyPath();
  const keyDir = join(homedir(), '.memorylink', 'keys');
  
  // Create directory with secure permissions
  if (!existsSync(keyDir)) {
    const { mkdir } = await import('fs/promises');
    await mkdir(keyDir, { recursive: true, mode: 0o700 });
  }
  
  if (existsSync(keyPath)) {
    // Read existing key
    const keyData = await readFile(keyPath, 'utf-8');
    return Buffer.from(keyData.trim(), 'hex');
  }
  
  // Generate new key
  const newKey = randomBytes(KEY_LENGTH);
  
  // Save with restricted permissions (600 = owner read/write only)
  await writeFile(keyPath, newKey.toString('hex'), { mode: 0o600 });
  
  // Ensure permissions are correct (belt and suspenders)
  try {
    await chmod(keyPath, 0o600);
  } catch {
    // Ignore chmod errors on Windows
  }
  
  return newKey;
}

/**
 * Derive encryption key from master key and salt
 */
function deriveKey(masterKey: Buffer, salt: Buffer): Buffer {
  return pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(plaintext: string): Promise<string> {
  const masterKey = await getOrCreateKey();
  
  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  
  // Derive key from master key
  const key = deriveKey(masterKey, salt);
  
  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  // Combine: marker + salt + iv + authTag + encrypted
  const combined = Buffer.concat([
    Buffer.from(ENCRYPTED_MARKER + '\n'),
    salt,
    iv,
    authTag,
    encrypted
  ]);
  
  return combined.toString('base64');
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(encryptedData: string): Promise<string> {
  const masterKey = await getOrCreateKey();
  
  // Decode from base64
  const combined = Buffer.from(encryptedData, 'base64');
  
  // Check marker
  const markerLength = ENCRYPTED_MARKER.length + 1; // +1 for newline
  const marker = combined.subarray(0, markerLength).toString('utf8');
  
  if (!marker.startsWith(ENCRYPTED_MARKER)) {
    throw new Error('Invalid encrypted data format');
  }
  
  // Extract components
  let offset = markerLength;
  
  const salt = combined.subarray(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;
  
  const iv = combined.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  
  const authTag = combined.subarray(offset, offset + AUTH_TAG_LENGTH);
  offset += AUTH_TAG_LENGTH;
  
  const encrypted = combined.subarray(offset);
  
  // Derive key
  const key = deriveKey(masterKey, salt);
  
  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Check if data is encrypted
 */
export function isEncrypted(data: string): boolean {
  try {
    const decoded = Buffer.from(data, 'base64').toString('utf8');
    return decoded.startsWith(ENCRYPTED_MARKER);
  } catch {
    return false;
  }
}

/**
 * Encrypt a file in place
 */
export async function encryptFile(filePath: string): Promise<void> {
  const content = await readFile(filePath, 'utf-8');
  
  // Skip if already encrypted
  if (isEncrypted(content)) {
    return;
  }
  
  const encrypted = await encrypt(content);
  await writeFile(filePath, encrypted, 'utf-8');
}

/**
 * Decrypt a file and return content (doesn't modify file)
 */
export async function decryptFile(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  
  // If not encrypted, return as-is
  if (!isEncrypted(content)) {
    return content;
  }
  
  return decrypt(content);
}

/**
 * Get encryption status
 */
export interface EncryptionStatus {
  keyExists: boolean;
  keyPath: string;
  algorithm: string;
  keyLength: number;
}

export function getEncryptionStatus(): EncryptionStatus {
  const keyPath = getKeyPath();
  
  return {
    keyExists: existsSync(keyPath),
    keyPath,
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH * 8 // bits
  };
}

/**
 * Hash data for audit logging (without revealing content)
 */
export function hashForAudit(data: string): string {
  return createHash('sha256').update(data).digest('hex').substring(0, 16);
}

