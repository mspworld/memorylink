/**
 * MemoryLink Exit Codes
 * Based on SPEC.md v4.3.10
 * 
 * Exit codes:
 * 0 = PASS (safe to proceed)
 * 1 = FAIL (block pipeline)
 * 2 = ERROR (invalid config)
 */

export const EXIT_CODES = {
  SUCCESS: 0,
  FAILURE: 1,
  ERROR: 2,
} as const;

export type ExitCode = typeof EXIT_CODES[keyof typeof EXIT_CODES];

/**
 * Exit code meanings
 */
export const EXIT_CODE_MEANINGS = {
  [EXIT_CODES.SUCCESS]: 'PASS - Safe to proceed',
  [EXIT_CODES.FAILURE]: 'FAIL - Block pipeline',
  [EXIT_CODES.ERROR]: 'ERROR - Invalid config',
} as const;

