/**
 * MemoryLink CLI Output Formatter
 * 
 * PURPOSE: Provide beautiful, consistent, human-readable output for all CLI commands
 * 
 * USAGE:
 *   import { out } from './output.js';
 *   out.header('SCAN RESULTS');
 *   out.success('No secrets found');
 *   out.error('Secret detected', { file: 'config.env', line: 5 });
 * 
 * SECURITY: All secret values are MASKED before display
 */

import { maskSecret as mask } from '../core/masking.js';

// ANSI Color Codes
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  blue: '\x1b[0;34m',
  purple: '\x1b[0;35m',
  cyan: '\x1b[0;36m',
  white: '\x1b[1;37m',
  gray: '\x1b[0;90m',
};

const c = COLORS;

/**
 * Output utilities for consistent CLI formatting
 */
export const out = {
  // ============================================================================
  // BASIC OUTPUT
  // ============================================================================
  
  /** Print a line */
  print(text: string = '') {
    console.log(text);
  },

  /** Print empty line */
  newline() {
    console.log('');
  },

  // ============================================================================
  // HEADERS & SECTIONS
  // ============================================================================

  /** Main header with branding */
  brand() {
    console.log('');
    console.log(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    console.log(`  ${c.bold}🧠 MEMORYLINK${c.reset} ${c.dim}AI Memory Security${c.reset}`);
    console.log(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    console.log('');
  },

  /** Section header */
  header(title: string) {
    console.log('');
    console.log(`${c.white}┌──────────────────────────────────────────────────────────────────────────────┐${c.reset}`);
    console.log(`${c.white}│${c.reset} ${c.bold}${title}${c.reset}${' '.repeat(Math.max(0, 76 - title.length))}${c.white}│${c.reset}`);
    console.log(`${c.white}└──────────────────────────────────────────────────────────────────────────────┘${c.reset}`);
    console.log('');
  },

  /** Divider line */
  divider() {
    console.log(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
  },

  // ============================================================================
  // STATUS MESSAGES
  // ============================================================================

  /** Success message */
  success(message: string, detail?: string) {
    console.log(`  ${c.green}✓${c.reset} ${message}`);
    if (detail) {
      console.log(`    ${c.dim}${detail}${c.reset}`);
    }
  },

  /** Error message */
  error(message: string, detail?: string) {
    console.log(`  ${c.red}✗${c.reset} ${message}`);
    if (detail) {
      console.log(`    ${c.dim}${detail}${c.reset}`);
    }
  },

  /** Warning message */
  warn(message: string, detail?: string) {
    console.log(`  ${c.yellow}⚠${c.reset} ${message}`);
    if (detail) {
      console.log(`    ${c.dim}${detail}${c.reset}`);
    }
  },

  /** Info message */
  info(message: string, detail?: string) {
    console.log(`  ${c.blue}ℹ${c.reset} ${message}`);
    if (detail) {
      console.log(`    ${c.dim}${detail}${c.reset}`);
    }
  },

  // ============================================================================
  // SPECIAL FORMATS
  // ============================================================================

  /** Clickable file link (cyan + underline) */
  link(file: string, line?: number): string {
    if (line) {
      return `${c.cyan}${c.underline}${file}:${line}${c.reset}`;
    }
    return `${c.cyan}${c.underline}${file}${c.reset}`;
  },

  /** Record ID format */
  recordId(id: string): string {
    return `${c.cyan}${c.underline}${id}${c.reset}`;
  },

  /** Command format */
  cmd(command: string): string {
    return `${c.cyan}${command}${c.reset}`;
  },

  /** Highlight text */
  highlight(text: string): string {
    return `${c.white}${c.bold}${text}${c.reset}`;
  },

  /** Dim text */
  dim(text: string): string {
    return `${c.dim}${text}${c.reset}`;
  },

  /** Red text */
  red(text: string): string {
    return `${c.red}${text}${c.reset}`;
  },

  /** Green text */
  green(text: string): string {
    return `${c.green}${text}${c.reset}`;
  },

  /** Yellow text */
  yellow(text: string): string {
    return `${c.yellow}${text}${c.reset}`;
  },

  // ============================================================================
  // SECRET DETECTION OUTPUT
  // ============================================================================

  /** Show detected secret with details - SECRETS ARE MASKED FOR SAFETY */
  secretFound(options: {
    pattern: string;
    secret: string;
    file: string;
    line: number;
    recordId?: string;
    quarantinePath?: string;
  }) {
    const { pattern, secret, file, line, recordId } = options;
    
    // SECURITY: Mask the secret to prevent exposure in logs/terminals
    const masked = mask(secret);

    console.log(`  ${c.red}┃${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.red}${c.bold}🔴 SECRET DETECTED${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.white}Pattern:${c.reset}  ${c.yellow}${pattern}${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.white}Secret:${c.reset}   ${c.red}${c.bold}${masked}${c.reset} ${c.dim}(masked)${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.white}Location:${c.reset} ${c.cyan}${c.underline}${file}:${line}${c.reset}`);
    
    if (recordId) {
      console.log(`  ${c.red}┃${c.reset}  ${c.white}Record:${c.reset}   ${c.cyan}${c.underline}${recordId}${c.reset}`);
    }
    
    console.log(`  ${c.red}┃${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.white}Action Required:${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}    ${c.dim}1.${c.reset} Review the file and remove/rotate the secret`);
    console.log(`  ${c.red}┃${c.reset}    ${c.dim}2.${c.reset} If committed: ${c.cyan}git filter-branch${c.reset} to remove from history`);
    console.log(`  ${c.red}┃${c.reset}    ${c.dim}3.${c.reset} Re-run: ${c.cyan}ml scan${c.reset} to verify`);
    console.log(`  ${c.red}┃${c.reset}`);
  },

  /** Show blocked/protected record - human-friendly version of "quarantined" */
  quarantined(options: {
    recordId: string;
    reason: string;
    quarantinePath: string;
  }) {
    const { recordId, reason, quarantinePath } = options;
    
    console.log(`  ${c.yellow}┃${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.yellow}${c.bold}⚠ BLOCKED FOR REVIEW${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.white}Memory ID:${c.reset} ${c.cyan}${c.underline}${recordId}${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.white}Why:${c.reset}      ${c.yellow}${reason}${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.white}Saved to:${c.reset} ${c.cyan}${c.underline}${quarantinePath}${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.white}To see it:${c.reset} ${c.cyan}cat ${quarantinePath}${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}`);
  },

  // ============================================================================
  // GATE OUTPUT
  // ============================================================================

  /** Security check passed */
  gatePassed(rule: string) {
    console.log(`  ${c.green}┃${c.reset}`);
    console.log(`  ${c.green}┃${c.reset}  ${c.green}${c.bold}✓ SECURITY CHECK PASSED${c.reset}`);
    console.log(`  ${c.green}┃${c.reset}`);
    console.log(`  ${c.green}┃${c.reset}  ${c.white}Check:${c.reset}  ${rule.replace('block-quarantined', 'blocked secrets')}`);
    console.log(`  ${c.green}┃${c.reset}  ${c.white}Result:${c.reset} ${c.green}All clear - no issues found${c.reset}`);
    console.log(`  ${c.green}┃${c.reset}  ${c.white}Action:${c.reset} You can safely commit/deploy`);
    console.log(`  ${c.green}┃${c.reset}`);
  },

  /** Security check - WARNING only mode (not blocking) */
  gateWarning(options: {
    rule: string;
    violations: number;
  }) {
    const { rule, violations } = options;
    
    console.log(`  ${c.yellow}┃${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.yellow}${c.bold}⚠ ISSUES FOUND - PLEASE REVIEW${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.white}Check:${c.reset}    ${rule.replace('block-quarantined', 'blocked secrets')}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.white}Issues:${c.reset}   ${c.yellow}${violations} item${violations !== 1 ? 's' : ''} need attention${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.white}Mode:${c.reset}     ${c.green}Warn only${c.reset} ${c.dim}(not blocking you)${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.dim}💡 Tip: Review the issues above and fix when you can.${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}  ${c.dim}   To enable blocking: ${c.cyan}ml config --set block_mode=on${c.reset}`);
    console.log(`  ${c.yellow}┃${c.reset}`);
  },

  /** Security check blocked (only when block_mode=on) */
  gateBlocked(options: {
    rule: string;
    violations: number;
    tier: 'red' | 'yellow' | 'green';
  }) {
    const { rule, violations, tier } = options;
    
    const tierColor = tier === 'red' ? c.red : tier === 'yellow' ? c.yellow : c.green;
    const tierLabel = tier === 'red' ? 'CRITICAL' : tier === 'yellow' ? 'WARNING' : 'OK';
    
    console.log(`  ${c.red}┃${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.red}${c.bold}🚫 BLOCKED - FIX REQUIRED${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.white}Check:${c.reset}    ${rule.replace('block-quarantined', 'blocked secrets')}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.white}Issues:${c.reset}   ${c.red}${violations} problem${violations !== 1 ? 's' : ''} found${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.white}Severity:${c.reset} ${tierColor}${tierLabel}${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.white}Mode:${c.reset}     ${c.red}Block mode ON${c.reset} ${c.dim}(must fix to continue)${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}  ${c.white}To continue:${c.reset} Fix the issues above, then try again`);
    console.log(`  ${c.red}┃${c.reset}  ${c.dim}   To disable blocking: ${c.cyan}ml config --set block_mode=off${c.reset}`);
    console.log(`  ${c.red}┃${c.reset}`);
  },

  // ============================================================================
  // AUDIT OUTPUT
  // ============================================================================

  /** Audit timeline entry */
  timelineEntry(options: {
    timestamp: string;
    action: string;
    recordId?: string;
    detail?: string;
    status: 'success' | 'warning' | 'error';
  }) {
    const { timestamp, action, recordId, detail, status } = options;
    
    const color = status === 'success' ? c.green : status === 'warning' ? c.yellow : c.red;
    const icon = status === 'success' ? '●' : status === 'warning' ? '●' : '●';
    
    // Format timestamp to be shorter
    const shortTime = timestamp.replace('T', ' ').substring(0, 19);
    
    let line = `  ${color}${icon}${c.reset} ${c.dim}${shortTime}${c.reset}  ${color}${action}${c.reset}`;
    
    if (recordId) {
      line += `  ${c.cyan}${c.underline}${recordId}${c.reset}`;
    }
    
    console.log(line);
    
    if (detail) {
      console.log(`    ${c.dim}${detail}${c.reset}`);
    }
  },

  // ============================================================================
  // SUMMARY BOX
  // ============================================================================

  /** Success box */
  successBox(title: string, message: string) {
    console.log('');
    console.log(`  ${c.green}┌────────────────────────────────────────────────────────────────────────────┐${c.reset}`);
    console.log(`  ${c.green}│${c.reset}                                                                           ${c.green}│${c.reset}`);
    console.log(`  ${c.green}│${c.reset}   ${c.green}${c.bold}✓ ${title}${c.reset}${' '.repeat(Math.max(0, 68 - title.length))}${c.green}│${c.reset}`);
    console.log(`  ${c.green}│${c.reset}                                                                           ${c.green}│${c.reset}`);
    console.log(`  ${c.green}│${c.reset}   ${message}${' '.repeat(Math.max(0, 72 - message.length))}${c.green}│${c.reset}`);
    console.log(`  ${c.green}│${c.reset}                                                                           ${c.green}│${c.reset}`);
    console.log(`  ${c.green}└────────────────────────────────────────────────────────────────────────────┘${c.reset}`);
    console.log('');
  },

  /** Error box */
  errorBox(title: string, message: string) {
    console.log('');
    console.log(`  ${c.red}┌────────────────────────────────────────────────────────────────────────────┐${c.reset}`);
    console.log(`  ${c.red}│${c.reset}                                                                           ${c.red}│${c.reset}`);
    console.log(`  ${c.red}│${c.reset}   ${c.red}${c.bold}✗ ${title}${c.reset}${' '.repeat(Math.max(0, 68 - title.length))}${c.red}│${c.reset}`);
    console.log(`  ${c.red}│${c.reset}                                                                           ${c.red}│${c.reset}`);
    console.log(`  ${c.red}│${c.reset}   ${message}${' '.repeat(Math.max(0, 72 - message.length))}${c.red}│${c.reset}`);
    console.log(`  ${c.red}│${c.reset}                                                                           ${c.red}│${c.reset}`);
    console.log(`  ${c.red}└────────────────────────────────────────────────────────────────────────────┘${c.reset}`);
    console.log('');
  },

  // ============================================================================
  // SCAN RESULTS
  // ============================================================================

  /** Scan summary header */
  scanSummary(options: {
    total: number;
    critical: number;
    warnings: number;
    safe: number;
  }) {
    const { total, critical, warnings } = options;
    
    console.log('');
    console.log(`  ${c.white}Summary:${c.reset}`);
    console.log('');
    
    if (critical > 0) {
      console.log(`    ${c.red}●${c.reset} ${c.red}${critical} Critical${c.reset} ${c.dim}(secrets that block pipeline)${c.reset}`);
    }
    if (warnings > 0) {
      console.log(`    ${c.yellow}●${c.reset} ${c.yellow}${warnings} Warnings${c.reset} ${c.dim}(review recommended)${c.reset}`);
    }
    if (total === 0) {
      console.log(`    ${c.green}●${c.reset} ${c.green}No issues found${c.reset}`);
    }
    
    console.log('');
  },

  /** Scan result item */
  scanResult(options: {
    file: string;
    line: number;
    pattern: string;
    preview: string;
    severity: 'critical' | 'warning';
  }) {
    const { file, line, pattern, preview, severity } = options;
    
    const color = severity === 'critical' ? c.red : c.yellow;
    const icon = severity === 'critical' ? '🔴' : '🟡';
    
    // Truncate preview
    const truncatedPreview = preview.length > 60 
      ? preview.substring(0, 60) + '...' 
      : preview;
    
    console.log(`  ${color}${icon}${c.reset} ${c.cyan}${c.underline}${file}:${line}${c.reset}`);
    console.log(`     ${c.white}Pattern:${c.reset} ${c.yellow}${pattern}${c.reset}`);
    console.log(`     ${c.white}Preview:${c.reset} ${c.dim}${truncatedPreview}${c.reset}`);
    console.log('');
  },

  // ============================================================================
  // HELP & TIPS
  // ============================================================================

  /** Quick commands help */
  quickCommands() {
    console.log(`  ${c.white}Quick Commands:${c.reset}`);
    console.log('');
    console.log(`    ${c.cyan}ml init${c.reset}                    First-time setup`);
    console.log(`    ${c.cyan}ml scan${c.reset}                    Scan project for secrets`);
    console.log(`    ${c.cyan}ml capture --topic <t>${c.reset}     Store a memory`);
    console.log(`    ${c.cyan}ml query --topic <t>${c.reset}       Retrieve memories`);
    console.log(`    ${c.cyan}ml gate${c.reset}                    Security check before commit`);
    console.log(`    ${c.cyan}ml audit --view timeline${c.reset}   View activity history`);
    console.log('');
  },

  /** Severity legend - human-friendly */
  severityLegend() {
    console.log(`  ${c.white}What the colors mean:${c.reset}`);
    console.log('');
    console.log(`    ${c.red}●${c.reset} ${c.red}RED${c.reset}      ${c.dim}Critical - Must fix now (blocks your work)${c.reset}`);
    console.log(`    ${c.yellow}●${c.reset} ${c.yellow}YELLOW${c.reset}   ${c.dim}Warning - Should review when you can${c.reset}`);
    console.log(`    ${c.green}●${c.reset} ${c.green}GREEN${c.reset}    ${c.dim}Safe - All good, nothing to worry about${c.reset}`);
    console.log('');
  },

  // ============================================================================
  // SCAN RESULTS (for ml scan)
  // ============================================================================

  /** Scan header */
  scanHeader(title: string, count: number) {
    const icon = count > 0 ? '⚠️' : '✅';
    console.log('');
    console.log(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    console.log(`  ${icon} ${c.bold}${title}${c.reset} ${c.dim}(${count} issue${count !== 1 ? 's' : ''})${c.reset}`);
    console.log(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    console.log('');
  },

  /** Scan no issues */
  scanClean() {
    console.log('');
    console.log(`  ${c.green}✓${c.reset} ${c.green}${c.bold}No security issues found${c.reset}`);
    console.log(`    ${c.dim}Your project is clean!${c.reset}`);
    console.log('');
  },

  /** Scan file with issues */
  scanFile(file: string, issueCount: number) {
    console.log(`  ${c.white}📁 ${file}${c.reset} ${c.dim}(${issueCount} issue${issueCount !== 1 ? 's' : ''})${c.reset}`);
  },

  /** Scan issue found */
  scanIssue(options: {
    file: string;
    line: number;
    pattern: string;
    preview: string;
    severity: 'critical' | 'warning';
  }) {
    const { file, line, pattern, preview, severity } = options;
    
    const icon = severity === 'critical' ? '🔴' : '🟡';
    const patternColor = severity === 'critical' ? c.red : c.yellow;
    
    // Truncate preview
    const truncated = preview.length > 50 ? preview.substring(0, 50) + '...' : preview;
    
    console.log(`     ${icon} ${c.cyan}${c.underline}${file}:${line}${c.reset}`);
    console.log(`        ${c.white}Pattern:${c.reset} ${patternColor}${pattern}${c.reset}`);
    console.log(`        ${c.white}Content:${c.reset} ${c.dim}${truncated}${c.reset}`);
    console.log('');
  },

  /** Scan action required */
  scanActions() {
    console.log(`  ${c.white}What to do:${c.reset}`);
    console.log('');
    console.log(`    ${c.dim}1.${c.reset} Click the ${c.cyan}file:line${c.reset} links to review`);
    console.log(`    ${c.dim}2.${c.reset} For API keys: Rotate and use env variables`);
    console.log(`    ${c.dim}3.${c.reset} For personal data: Remove or anonymize`);
    console.log(`    ${c.dim}4.${c.reset} Run ${c.cyan}ml scan${c.reset} again to verify fixes`);
    console.log('');
  },

  // ============================================================================
  // AUDIT OUTPUT (for ml audit)
  // ============================================================================

  /** Audit header */
  auditHeader(title: string) {
    console.log('');
    console.log(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    console.log(`  ${c.bold}📋 ${title}${c.reset}`);
    console.log(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    console.log('');
  },

  /** Duplicate memories detected */
  auditDrift(options: {
    conflictKey: string;
    recordCount: number;
    canonical: string;
    reason: string;
  }) {
    const { conflictKey, recordCount, canonical, reason } = options;
    
    console.log(`  ${c.yellow}●${c.reset} ${c.white}${conflictKey}${c.reset} ${c.dim}(${recordCount} duplicate memories)${c.reset}`);
    console.log(`     ${c.white}Selected:${c.reset} ${c.cyan}${c.underline}${canonical}${c.reset}`);
    console.log(`     ${c.white}Why:${c.reset}      ${c.dim}${reason}${c.reset}`);
    console.log('');
  },

  /** Audit consistency issue */
  auditConsistency(options: {
    file: string;
    issue: string;
    severity: 'error' | 'warning';
  }) {
    const { file, issue, severity } = options;
    
    const color = severity === 'error' ? c.red : c.yellow;
    const icon = severity === 'error' ? '✗' : '⚠';
    
    console.log(`  ${color}${icon}${c.reset} ${c.cyan}${c.underline}${file}${c.reset}`);
    console.log(`     ${c.dim}${issue}${c.reset}`);
    console.log('');
  },

  // ============================================================================
  // GATE OUTPUT (for ml gate)
  // ============================================================================

  /** Security issue found */
  gateViolation(options: {
    recordId: string;
    conflictKey: string;
    createdAt: string;
    quarantineRef?: string;
  }) {
    const { recordId, conflictKey, createdAt, quarantineRef } = options;
    
    console.log(`  ${c.red}●${c.reset} ${c.cyan}${c.underline}${recordId}${c.reset}`);
    console.log(`     ${c.white}Topic:${c.reset}   ${conflictKey}`);
    console.log(`     ${c.white}When:${c.reset}    ${c.dim}${createdAt}${c.reset}`);
    if (quarantineRef) {
      console.log(`     ${c.white}File:${c.reset}    ${c.cyan}${c.underline}${quarantineRef}${c.reset}`);
    }
    console.log('');
  },

  /** How to fix steps */
  gateRemediation(steps: string[]) {
    console.log(`  ${c.white}How to fix this:${c.reset}`);
    console.log('');
    steps.forEach((step, i) => {
      console.log(`    ${c.dim}${i + 1}.${c.reset} ${step}`);
    });
    console.log('');
  },
};

export default out;

