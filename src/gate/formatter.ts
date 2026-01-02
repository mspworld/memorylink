/**
 * Safe gate output formatter
 * Week 2 Day 14: ml gate command
 * Based on SPEC.md: Gate output MUST NOT print secrets
 * 
 * Security rule: NEVER print:
 * - Quarantined content
 * - Raw secrets
 * - Secret values
 * 
 * ONLY print:
 * - Record IDs
 * - Conflict keys
 * - Timestamps
 * - Quarantine refs (paths only)
 */

import type { GateResult } from '../core/types.js';
import type { ValidityResult } from '../validation/validity.js';

// ANSI Color codes
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  red: '\x1b[0;31m',
  green: '\x1b[0;32m',
  yellow: '\x1b[1;33m',
  cyan: '\x1b[0;36m',
  white: '\x1b[1;37m',
};

/**
 * Format validity status for display - human-friendly
 */
function formatValidityStatus(validity?: ValidityResult): string {
  if (!validity) {
    return `${c.dim}Not checked${c.reset}`;
  }
  
  switch (validity.status) {
    case 'active':
      return `${c.red}●${c.reset} ${c.red}WORKING${c.reset} ${c.dim}(This secret still works! ${validity.confidence}% sure)${c.reset}`;
    case 'inactive':
      return `${c.yellow}●${c.reset} ${c.yellow}EXPIRED${c.reset} ${c.dim}(This secret no longer works)${c.reset}`;
    case 'unknown':
    default:
      return `${c.dim}●${c.reset} ${c.dim}Unknown${c.reset} ${c.dim}(${validity.reason || "Couldn't verify"})${c.reset}`;
  }
}

/**
 * Format gate result for output
 * NEVER includes quarantined content or secrets
 */
export function formatGateResult(result: GateResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);

  if (result.passed) {
    lines.push(`  ${c.green}${c.bold}✓ SECURITY CHECK PASSED${c.reset}`);
    lines.push('');
    lines.push(`  ${c.white}Check:${c.reset}  ${result.rule.replace('block-quarantined', 'blocked secrets')}`);
    lines.push(`  ${c.white}Result:${c.reset} ${c.green}All clear - no issues found${c.reset}`);
  } else {
    lines.push(`  ${c.red}${c.bold}✗ SECURITY CHECK FAILED${c.reset}`);
    lines.push('');
    lines.push(`  ${c.white}Check:${c.reset}   ${result.rule.replace('block-quarantined', 'blocked secrets')}`);
    lines.push(`  ${c.white}Issues:${c.reset}  ${c.red}${result.violations.length} problem${result.violations.length !== 1 ? 's' : ''} found${c.reset}`);
  }

  lines.push(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);

  if (result.violations.length > 0) {
    lines.push('');
    lines.push(`  ${c.white}Problems found:${c.reset}`);
    lines.push('');

    result.violations.forEach((violation) => {
      // Determine icon based on validity
      const validity = violation.validity;
      let icon = `${c.red}●${c.reset}`;
      if (validity?.status === 'inactive') {
        icon = `${c.yellow}●${c.reset}`;
      } else if (validity?.status === 'unknown') {
        icon = `${c.dim}●${c.reset}`;
      }
      
      lines.push(`  ${icon} ${c.cyan}${c.underline}${violation.record_id}${c.reset}`);
      lines.push(`     ${c.white}About:${c.reset}   ${violation.conflict_key}`);
      lines.push(`     ${c.white}When:${c.reset}    ${c.dim}${violation.created_at}${c.reset}`);
      if (violation.quarantine_ref) {
        lines.push(`     ${c.white}File:${c.reset}    ${c.cyan}${c.underline}${violation.quarantine_ref}${c.reset} ${c.dim}(click to open)${c.reset}`);
      }
      // Show validity status if available
      if (validity) {
        lines.push(`     ${c.white}Secret:${c.reset}  ${formatValidityStatus(validity)}`);
      }
      lines.push('');
    });

    lines.push(`${c.white}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.reset}`);
    lines.push('');
    lines.push(`  ${c.white}How to fix this:${c.reset}`);
    lines.push('');
    lines.push(`    ${c.dim}1.${c.reset} Open the file shown above and look at the secret`);
    lines.push(`    ${c.dim}2.${c.reset} If it's a real password/key: Change it immediately!`);
    lines.push(`    ${c.dim}3.${c.reset} Remove the secret from your code`);
    lines.push(`    ${c.dim}4.${c.reset} Run ${c.cyan}ml gate${c.reset} again to check`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Validate gate output doesn't contain secrets
 * Security check
 */
export function validateGateOutput(output: string): boolean {
  // Check for common secret patterns in output
  const secretPatterns = [
    /sk-[a-zA-Z0-9]{32,}/,
    /AKIA[0-9A-Z]{16}/,
    /password\s*[:=]\s*[^\s'"]{8,}/i,
  ];

  for (const pattern of secretPatterns) {
    if (pattern.test(output)) {
      return false; // Contains potential secret
    }
  }

  return true; // Safe
}

