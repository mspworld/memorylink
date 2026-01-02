/**
 * MemoryLink Release Command
 * Undo accidental quarantines (Gemini's critical requirement)
 * Based on 8 AI expert consensus
 */

import { readdir, readFile, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { out } from '../output.js';
import { decrypt, isEncrypted } from '../../quarantine/encryption.js';
import { appendAuditEvent } from '../../audit/logger.js';

/**
 * Quarantined item info
 */
export interface QuarantinedItem {
  id: string;
  fileName: string;
  quarantinedAt: string;
  patternId?: string;
  size: number;
  encrypted: boolean;
}

/**
 * List all quarantined items
 */
export async function listQuarantined(cwd: string): Promise<QuarantinedItem[]> {
  const quarantineDir = join(cwd, '.memorylink', 'quarantined');
  
  if (!existsSync(quarantineDir)) {
    return [];
  }
  
  const items: QuarantinedItem[] = [];
  const files = await readdir(quarantineDir);
  
  for (const file of files) {
    // Skip metadata files
    if (file.endsWith('.metadata.json')) {
      continue;
    }
    
    // Only process .original files
    if (!file.endsWith('.original')) {
      continue;
    }
    
    const id = file.replace('.original', '');
    const filePath = join(quarantineDir, file);
    const metadataPath = join(quarantineDir, `${id}.metadata.json`);
    
    try {
      const stats = await stat(filePath);
      const content = await readFile(filePath, 'utf-8');
      
      // Try to read metadata
      let metadata: any = {};
      if (existsSync(metadataPath)) {
        try {
          const metaContent = await readFile(metadataPath, 'utf-8');
          metadata = JSON.parse(metaContent);
        } catch {
          // Ignore metadata errors
        }
      }
      
      items.push({
        id,
        fileName: file,
        quarantinedAt: metadata.quarantined_at || stats.mtime.toISOString(),
        patternId: metadata.pattern_id,
        size: stats.size,
        encrypted: isEncrypted(content),
      });
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }
  
  return items;
}

/**
 * Get details of a quarantined item
 */
export async function getQuarantineDetails(
  cwd: string,
  recordId: string
): Promise<{ found: boolean; content?: string; metadata?: any; error?: string }> {
  const quarantineDir = join(cwd, '.memorylink', 'quarantined');
  const filePath = join(quarantineDir, `${recordId}.original`);
  const metadataPath = join(quarantineDir, `${recordId}.metadata.json`);
  
  if (!existsSync(filePath)) {
    return { found: false, error: 'Quarantined item not found' };
  }
  
  try {
    let content = await readFile(filePath, 'utf-8');
    
    // Decrypt if encrypted
    if (isEncrypted(content)) {
      content = await decrypt(content);
    }
    
    // Read metadata if exists
    let metadata = null;
    if (existsSync(metadataPath)) {
      try {
        const metaContent = await readFile(metadataPath, 'utf-8');
        metadata = JSON.parse(metaContent);
      } catch {
        // Ignore metadata errors
      }
    }
    
    return { found: true, content, metadata };
  } catch (error: any) {
    return { found: false, error: error.message };
  }
}

/**
 * Release a quarantined item (delete from quarantine)
 */
export async function releaseFromQuarantine(
  cwd: string,
  recordId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const quarantineDir = join(cwd, '.memorylink', 'quarantined');
  const filePath = join(quarantineDir, `${recordId}.original`);
  const metadataPath = join(quarantineDir, `${recordId}.metadata.json`);
  
  if (!existsSync(filePath)) {
    return { success: false, error: 'Quarantined item not found' };
  }
  
  try {
    // Delete the quarantined file
    await unlink(filePath);
    
    // Delete metadata if exists
    if (existsSync(metadataPath)) {
      await unlink(metadataPath);
    }
    
    // Log release to audit trail
    await appendAuditEvent(cwd, {
      event_type: 'RELEASE',
      record_id: recordId,
      reason: reason || 'Manual release by user',
    });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute release command
 */
export async function executeRelease(
  cwd: string,
  options: { id?: string; list?: boolean; show?: string; force?: boolean }
): Promise<void> {
  out.brand();
  
  // List quarantined items
  if (options.list) {
    out.header('QUARANTINED ITEMS');
    
    const items = await listQuarantined(cwd);
    
    if (items.length === 0) {
      out.success('No quarantined items found');
      out.newline();
      out.print(`  ${out.dim('Items are quarantined when secrets are detected.')}`);
      out.print(`  ${out.dim('Use')} ${out.cmd('ml scan')} ${out.dim('to find secrets in your project.')}`);
      process.exit(0);
    }
    
    out.print(`  Found ${items.length} quarantined item(s):\n`);
    
    for (const item of items) {
      out.print(`  ${out.highlight(item.id)}`);
      out.print(`    ${out.dim('Pattern:')} ${item.patternId || 'Unknown'}`);
      out.print(`    ${out.dim('Quarantined:')} ${new Date(item.quarantinedAt).toLocaleString()}`);
      out.print(`    ${out.dim('Size:')} ${item.size} bytes`);
      out.print(`    ${out.dim('Encrypted:')} ${item.encrypted ? '✅ Yes' : '❌ No'}`);
      out.newline();
    }
    
    out.divider();
    out.print(`  ${out.dim('To view details:')} ${out.cmd('ml release --show <id>')}`);
    out.print(`  ${out.dim('To release:')} ${out.cmd('ml release --id <id>')}`);
    out.newline();
    
    process.exit(0);
  }
  
  // Show quarantine details
  if (options.show) {
    out.header('QUARANTINE DETAILS');
    
    const details = await getQuarantineDetails(cwd, options.show);
    
    if (!details.found) {
      out.errorBox('NOT FOUND', details.error || 'Quarantined item not found');
      process.exit(1);
    }
    
    out.print(`  ${out.highlight('Record ID:')} ${options.show}`);
    out.newline();
    
    if (details.metadata) {
      out.print(`  ${out.highlight('Metadata:')}`);
      out.print(`    ${out.dim('Pattern:')} ${details.metadata.pattern_id || 'Unknown'}`);
      out.print(`    ${out.dim('Quarantined:')} ${details.metadata.quarantined_at || 'Unknown'}`);
      out.newline();
    }
    
    out.print(`  ${out.highlight('Content (decrypted):')}`);
    out.newline();
    
    // Show content with line numbers
    const lines = (details.content || '').split('\n');
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      out.print(`    ${out.dim((i + 1).toString().padStart(3, ' '))} | ${lines[i]}`);
    }
    
    if (lines.length > 20) {
      out.print(`    ${out.dim('...')} (${lines.length - 20} more lines)`);
    }
    
    out.newline();
    out.divider();
    out.print(`  ${out.dim('To release:')} ${out.cmd(`ml release --id ${options.show}`)}`);
    out.newline();
    
    process.exit(0);
  }
  
  // Release a quarantined item
  if (options.id) {
    out.header('RELEASE FROM QUARANTINE');
    
    // Get details first
    const details = await getQuarantineDetails(cwd, options.id);
    
    if (!details.found) {
      out.errorBox('NOT FOUND', details.error || 'Quarantined item not found');
      process.exit(1);
    }
    
    out.print(`  ${out.highlight('Record ID:')} ${options.id}`);
    out.newline();
    
    // Show preview of content
    out.print(`  ${out.highlight('Content preview:')}`);
    const preview = (details.content || '').substring(0, 200);
    out.print(`    ${preview}${(details.content || '').length > 200 ? '...' : ''}`);
    out.newline();
    
    if (!options.force) {
      out.warn('This will permanently delete the quarantined item.');
      out.print(`  ${out.dim('Add')} ${out.cmd('--force')} ${out.dim('to confirm.')}`);
      out.newline();
      process.exit(1);
    }
    
    // Perform release
    const result = await releaseFromQuarantine(cwd, options.id, 'User confirmed release');
    
    if (result.success) {
      out.successBox('RELEASED', `Item ${options.id} has been released from quarantine.`);
      out.print(`  ${out.dim('This action has been logged to the audit trail.')}`);
    } else {
      out.errorBox('FAILED', result.error || 'Failed to release item');
      process.exit(1);
    }
    
    out.newline();
    process.exit(0);
  }
  
  // No options provided - show help
  out.header('QUARANTINE MANAGEMENT');
  out.newline();
  out.print(`  ${out.highlight('Commands:')}`);
  out.newline();
  out.print(`    ${out.cmd('ml release --list')}          ${out.dim('List all quarantined items')}`);
  out.print(`    ${out.cmd('ml release --show <id>')}     ${out.dim('View quarantine details')}`);
  out.print(`    ${out.cmd('ml release --id <id>')}       ${out.dim('Release from quarantine')}`);
  out.print(`    ${out.cmd('ml release --id <id> --force')} ${out.dim('Force release (skip confirmation)')}`);
  out.newline();
  
  process.exit(0);
}

