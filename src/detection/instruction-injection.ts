/**
 * Instruction-injection pattern detection
 * Week 6 Day 39-41: Memory poisoning protection (OWASP ASI06)
 * Based on ULTRA_MASTER_PLAN.md
 * 
 * Detects malicious instructions that could poison AI memory
 * 8 patterns to prevent memory poisoning attacks
 */

import type { SecretPattern } from '../quarantine/patterns.js';

/**
 * Instruction-injection patterns (OWASP ASI06)
 * These patterns indicate attempts to inject malicious instructions
 * into AI memory that could persist and affect future agents
 */
export const INSTRUCTION_INJECTION_PATTERNS: SecretPattern[] = [
  {
    id: 'injection-ignore-rules',
    name: 'Ignore Previous Rules',
    pattern: /ignore\s+(previous|all|all\s+previous)\s+(rules?|instructions?|guidelines?)/i,
    description: 'Attempt to ignore previous rules (memory poisoning risk)',
  },
  {
    id: 'injection-ignore-security',
    name: 'Ignore Security',
    pattern: /ignore\s+(security|safety|protection|safeguards?)/i,
    description: 'Attempt to ignore security measures (memory poisoning risk)',
  },
  {
    id: 'injection-always-log',
    name: 'Always Log Secrets',
    pattern: /always\s+(log|print|output|display|show)\s+(secrets?|credentials?|passwords?|keys?|tokens?)/i,
    description: 'Instruction to always log secrets (memory poisoning risk)',
  },
  {
    id: 'injection-exfiltrate',
    name: 'Exfiltrate Data',
    pattern: /(exfiltrate|send|transmit|upload|export)\s+(data|secrets?|credentials?|information)/i,
    description: 'Instruction to exfiltrate data (memory poisoning risk)',
  },
  {
    id: 'injection-bypass-security',
    name: 'Bypass Security',
    pattern: /bypass\s+(security|safety|protection|safeguards?|checks?|validation)/i,
    description: 'Instruction to bypass security (memory poisoning risk)',
  },
  {
    id: 'injection-disable-checks',
    name: 'Disable Checks',
    pattern: /disable\s+(checks?|validation|verification|safeguards?|security)/i,
    description: 'Instruction to disable security checks (memory poisoning risk)',
  },
  {
    id: 'injection-skip-validation',
    name: 'Skip Validation',
    pattern: /skip\s+(validation|verification|checks?|safeguards?|security)/i,
    description: 'Instruction to skip validation (memory poisoning risk)',
  },
  {
    id: 'injection-override-security',
    name: 'Override Security',
    pattern: /override\s+(security|safety|protection|safeguards?|checks?|validation)/i,
    description: 'Instruction to override security (memory poisoning risk)',
  },
];

/**
 * Check if content contains instruction-injection patterns
 */
export function detectInstructionInjection(content: string): boolean {
  for (const pattern of INSTRUCTION_INJECTION_PATTERNS) {
    if (pattern.pattern.test(content)) {
      return true;
    }
  }
  return false;
}

/**
 * Get all instruction-injection matches in content
 */
export function findInstructionInjections(content: string): Array<{
  pattern: SecretPattern;
  match: string;
}> {
  const matches: Array<{ pattern: SecretPattern; match: string }> = [];
  
  for (const pattern of INSTRUCTION_INJECTION_PATTERNS) {
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags + 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        pattern,
        match: match[0],
      });
    }
  }
  
  return matches;
}

