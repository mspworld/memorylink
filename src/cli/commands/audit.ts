/**
 * ml audit command
 * Week 3 Day 17-18: Advanced commands
 * Week 4: Enhanced with production-grade error handling
 * Based on SPEC.md v4.3.10
 */

import type { Result } from '../../core/types.js';
import { Ok, Err } from '../../core/types.js';
import { StorageError } from '../../core/errors.js';
import { readAuditEvents, verifyAuditChain } from '../../audit/logger.js';
import { getUserFriendlyError } from '../../core/resilience.js';
import { out } from '../output.js';

export interface AuditOptions {
  view?: 'timeline' | 'security' | 'verify';
  from?: string; // ISO-8601 date
  to?: string; // ISO-8601 date
  recordId?: string; // Filter by record ID
  // Week 9 Day 63: Drift detection
  drift?: boolean; // Detect memory conflicts
  specDrift?: boolean; // Detect code vs spec drift
  consistency?: boolean; // Check tool pointer consistency
}

/**
 * Drift view - Memory conflicts
 * Week 9 Day 63: All drift detection
 */
async function runDriftView(cwd: string): Promise<Result<void, StorageError>> {
  const { detectDrift } = await import('../../audit/drift.js');
  const driftResult = await detectDrift(cwd);
  
  if (!driftResult.ok) {
    return driftResult;
  }
  
  const { conflicts, total_conflicts } = driftResult.value;
  
  out.auditHeader(`MEMORY DRIFT DETECTION (${total_conflicts} conflicts)`);
  
  if (conflicts.length === 0) {
    out.success('No memory conflicts detected');
    return Ok(undefined);
  }
  
  for (const conflict of conflicts) {
    out.auditDrift({
      conflictKey: conflict.conflict_key,
      recordCount: conflict.records.length,
      canonical: conflict.canonical,
      reason: conflict.reason,
    });
  }
  
  return Ok(undefined);
}

/**
 * Spec drift view - Code vs spec inconsistencies
 * Week 9 Day 63: All drift detection
 */
async function runSpecDriftView(cwd: string): Promise<Result<void, StorageError>> {
  const { detectSpecDrift } = await import('../../audit/spec-drift.js');
  const driftResult = await detectSpecDrift(cwd);
  
  if (!driftResult.ok) {
    return driftResult;
  }
  
  const { issues, total_issues } = driftResult.value;
  
  out.auditHeader(`SPEC-CODE DRIFT (${total_issues} issues)`);
  
  if (issues.length === 0) {
    console.log('✅ No spec drift detected.');
    return Ok(undefined);
  }
  
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  if (errors.length > 0) {
    console.log(`❌ Errors (${errors.length}):`);
    errors.forEach(issue => {
      console.log(`  - [${issue.type}] ${issue.description}`);
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(issue => {
      console.log(`  - [${issue.type}] ${issue.description}`);
    });
    console.log('');
  }
  
  return Ok(undefined);
}

/**
 * Consistency view - Tool pointer consistency
 * Week 9 Day 63: All drift detection
 */
async function runConsistencyView(cwd: string): Promise<Result<void, StorageError>> {
  const { checkConsistency } = await import('../../audit/consistency.js');
  const consistencyResult = await checkConsistency(cwd);
  
  if (!consistencyResult.ok) {
    return consistencyResult;
  }
  
  const { issues, total_issues } = consistencyResult.value;
  
  console.log(`🔗 Consistency Check`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total issues: ${total_issues}\n`);
  
  if (issues.length === 0) {
    console.log('✅ All consistency checks passed.');
    return Ok(undefined);
  }
  
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  
  if (errors.length > 0) {
    console.log(`❌ Errors (${errors.length}):`);
    errors.forEach(issue => {
      console.log(`  - [${issue.file}] ${issue.description}`);
    });
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log(`⚠️  Warnings (${warnings.length}):`);
    warnings.forEach(issue => {
      console.log(`  - [${issue.file}] ${issue.description}`);
    });
    console.log('');
  }
  
  return Ok(undefined);
}

/**
 * Run audit view
 * Based on SPEC.md: ml audit command
 * Production-grade: Handle errors gracefully, filter safely
 */
export async function runAudit(cwd: string, options: AuditOptions): Promise<Result<void, StorageError>> {
  try {
    // Week 9 Day 63: Drift detection modes
    if (options.drift) {
      return await runDriftView(cwd);
    }
    
    if (options.specDrift) {
      return await runSpecDriftView(cwd);
    }
    
    if (options.consistency) {
      return await runConsistencyView(cwd);
    }
    
    const view = options.view || 'timeline';

    if (view === 'verify') {
      return await runVerifyView(cwd);
    }

    // readAuditEvents now returns array directly (graceful degradation on error)
    const events = await readAuditEvents(cwd);
    
    // Convert to typed events (readAuditEvents returns Record<string, unknown>[])
    let auditEvents = events as Array<Record<string, unknown>>;

    // Filter events safely (handle missing fields gracefully)
    if (options.recordId) {
      auditEvents = auditEvents.filter((event: Record<string, unknown>) => 
        event.record_id === options.recordId
      );
    }

    if (options.from) {
      const fromDate = new Date(options.from);
      auditEvents = auditEvents.filter((event: Record<string, unknown>) => 
        event.timestamp && new Date(event.timestamp as string) >= fromDate
      );
    }

    if (options.to) {
      const toDate = new Date(options.to);
      auditEvents = auditEvents.filter((event: Record<string, unknown>) => 
        event.timestamp && new Date(event.timestamp as string) <= toDate
      );
    }

    // Sort by timestamp
    auditEvents.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const aTime = new Date((a.timestamp as string) || '0').getTime();
      const bTime = new Date((b.timestamp as string) || '0').getTime();
      return aTime - bTime;
    });

    if (view === 'timeline' || !view) {
      return await runTimelineView(auditEvents);
    } else if (view === 'security') {
      return await runSecurityView(auditEvents);
    }

    return Err(new StorageError(`Unknown view: ${view}`, 'read'));
  } catch (error: any) {
    return Err(new StorageError(
      `Error running audit: ${getUserFriendlyError(error)}`,
      'read'
    ));
  }
}

/**
 * Timeline view - Chronological event log
 */
async function runTimelineView(events: Record<string, unknown>[]): Promise<Result<void, StorageError>> {
  if (events.length === 0) {
    console.log('No audit events found.');
    return Ok(undefined);
  }

  console.log(`📋 Audit Timeline (${events.length} events)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const event of events) {
    const timestamp = (event.timestamp as string) || 'unknown';
    const eventType = (event.event_type as string) || 'UNKNOWN';
    const recordId = (event.record_id as string) || undefined;

    let line = `${timestamp} ${eventType}`;
    if (recordId) {
      line += ` ${recordId}`;
    }

    // Add context based on event type
    if (eventType === 'PROMOTE') {
      const from = (event.from_evidence as string) || '';
      const to = (event.to_evidence as string) || '';
      const reason = (event.reason as string) || '';
      line += ` ${from}→${to}`;
      if (reason) {
        line += ` "${reason}"`;
      }
    } else if (eventType === 'QUARANTINE') {
      const pattern = (event.pattern as string) || '';
      line += ` (${pattern})`;
    } else if (eventType === 'GATE') {
      const result = (event.result as string) || '';
      const violations = (event.violations as number) || 0;
      line += ` → ${result} (${violations} violations)`;
    } else if (eventType === 'CAPTURE') {
      const content = (event.content as string) || '';
      const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
      line += ` "${preview}"`;
    }

    console.log(line);
  }

  return Ok(undefined);
}

/**
 * Security view - Security-focused events
 */
async function runSecurityView(events: Record<string, unknown>[]): Promise<Result<void, StorageError>> {
  // Filter security-relevant events
  const securityEvents = events.filter((event: Record<string, unknown>) => {
    const eventType = (event.event_type as string) || '';
    return ['QUARANTINE', 'GATE'].includes(eventType);
  });

  if (securityEvents.length === 0) {
    console.log('No security events found.');
    return Ok(undefined);
  }

  console.log(`🔒 Security Audit (${securityEvents.length} events)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const event of securityEvents) {
    const timestamp = (event.timestamp as string) || 'unknown';
    const eventType = (event.event_type as string) || 'UNKNOWN';
    const recordId = (event.record_id as string) || undefined;

    if (eventType === 'QUARANTINE') {
      const pattern = (event.pattern as string) || '';
      console.log(`${timestamp} QUARANTINE ${recordId || 'unknown'}`);
      console.log(`   Pattern: ${pattern}`);
      console.log('');
    } else if (eventType === 'GATE') {
      const rule = (event.rule as string) || '';
      const result = (event.result as string) || '';
      const violations = (event.violations as number) || 0;
      console.log(`${timestamp} GATE ${rule} → ${result}`);
      console.log(`   Violations: ${violations}`);
      console.log('');
    }
  }

  return Ok(undefined);
}

/**
 * Verify view - Check audit chain integrity
 */
async function runVerifyView(cwd: string): Promise<Result<void, StorageError>> {
  const verifyResult = await verifyAuditChain(cwd);
  if (!verifyResult.ok) {
    return verifyResult;
  }

  const { valid, eventCount, errors } = verifyResult.value;

  if (eventCount === 0) {
    console.log('No audit events to verify.');
    return Ok(undefined);
  }

  console.log(`🔍 Audit Chain Verification`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Total events: ${eventCount}`);
  console.log(`Chain integrity: ${valid ? '✅ INTACT' : '❌ COMPROMISED'}`);

  if (errors.length > 0) {
    console.log(`\nErrors found:`);
    errors.forEach((error: string) => {
      console.log(`  - ${error}`);
    });
  } else if (valid) {
    console.log(`\n✅ All event hashes valid`);
    console.log(`✅ All chain links valid`);
    console.log(`✅ No tampering detected`);
  }

  return Ok(undefined);
}
