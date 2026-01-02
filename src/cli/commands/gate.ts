/**
 * ml gate command
 * Week 2 Day 14: Core commands
 * Based on SPEC.md v4.3.10
 * 
 * Exit codes:
 * 0 = PASS (safe to proceed)
 * 1 = FAIL (block pipeline)
 * 2 = ERROR (invalid config)
 * 
 * Gate output MUST NOT print secrets
 */

import type { GateResult, GateViolation } from '../../core/types.js';
import { checkBlockQuarantined } from '../../gate/rules/block-quarantined.js';
import { formatGateResult, validateGateOutput } from '../../gate/formatter.js';
import { appendAuditEvent } from '../../audit/logger.js';
import { EXIT_CODES } from '../../core/exit-codes.js';
// Week 8: Tiered gate system
import { SeverityTier, getTierExitCode } from '../../gate/severity.js';
import { isBypassed, createBypass } from '../../gate/bypass.js';
// Week 8 Day 56: Gate modes
import { scanChangedFiles } from '../../gate/diff.js';
import { scanCommitHistory } from '../../gate/history.js';

/**
 * Mode info from smart resolution
 */
export interface ModeInfo {
  effective: 'active' | 'inactive';
  source: 'flag' | 'env' | 'ci' | 'config' | 'default';
  configValue: 'active' | 'inactive';
  envValue: 'active' | 'inactive' | null;
  flagValue: 'active' | 'inactive' | null;
  isCI: boolean;
}

/**
 * Gate options
 */
export interface GateOptions {
  rule: 'block-quarantined';
  scopeType?: 'project' | 'user' | 'org';
  repoUrl?: string;
  // Week 8: Tiered gate options
  bypass?: boolean; // Use bypass if violations found
  bypassReason?: string; // Reason for bypass
  bypassHours?: number; // Bypass expiry (hours, default: 24)
  severity?: SeverityTier; // Filter by severity tier
  // Week 8 Day 56: Gate modes
  diff?: boolean; // Check only changed files (pre-commit)
  history?: boolean; // Scan commit history
  historyLimit?: number; // Number of commits to scan (default: 10)
  validity?: 'active' | 'inactive' | 'unknown'; // Filter by validity status
  // Week 9: JSON output
  json?: boolean; // Output in JSON format
  // Week 9 Day 60-62: Validity checks
  checkValidity?: boolean; // Check if secrets are active/inactive
  // Smart mode switching
  blockMode?: boolean; // If true = block (exit 1), if false = warn only (exit 0)
  modeInfo?: ModeInfo; // Mode resolution info for output
  // Output control
  quiet?: boolean; // Print nothing unless blocked or issues found
  verbose?: boolean; // Print detailed scanning info
}

/**
 * Run gate check
 * Based on SPEC.md: ml gate command
 * Week 8: Enhanced with tiered severity and bypass
 */
export async function runGate(
  cwd: string,
  options: GateOptions
): Promise<GateResult> {
  // Week 8 Day 56: Diff mode - check only changed files
  if (options.diff) {
    const diffResult = await scanChangedFiles(cwd);
    if (!diffResult.ok) {
      return {
        passed: false,
        rule: options.rule,
        violations: [],
        exitCode: 2, // ERROR
      };
    }
    
    const detections = diffResult.value;
    const violations: GateViolation[] = [];
    
    for (const detection of detections) {
      for (const det of detection.detections) {
        if (det.severity === 'error') {
          // Only ERROR severity creates violations (RED tier)
          violations.push({
            record_id: `diff:${detection.file}:${det.line || 0}`,
            conflict_key: detection.file,
            created_at: new Date().toISOString(),
          });
        }
      }
    }
    
    const tier = violations.length > 0 ? SeverityTier.RED : SeverityTier.GREEN;
    
    // User-friendly: warn vs block
    let exitCode: 0 | 1 | 2;
    if (options.blockMode === true) {
      exitCode = getTierExitCode(tier) as 0 | 1 | 2;
    } else {
      exitCode = 0; // Warn only - don't block
    }
    
    return {
      passed: violations.length === 0 || options.blockMode !== true,
      rule: options.rule,
      violations,
      exitCode,
      warnOnly: options.blockMode !== true,
    };
  }
  
  // Week 8 Day 56: History mode - scan commit history
  if (options.history) {
    const historyResult = await scanCommitHistory(cwd, options.historyLimit || 10);
    if (!historyResult.ok) {
      return {
        passed: false,
        rule: options.rule,
        violations: [],
        exitCode: 2, // ERROR
      };
    }
    
    const detections = historyResult.value;
    const violations: GateViolation[] = [];
    
    for (const detection of detections) {
      if (detection.severity === 'error') {
        // Only ERROR severity creates violations (RED tier)
        violations.push({
          record_id: `history:${detection.commit}:${detection.file}`,
          conflict_key: detection.file,
          created_at: detection.date,
        });
      }
    }
    
    const tier = violations.length > 0 ? SeverityTier.RED : SeverityTier.GREEN;
    
    // User-friendly: warn vs block
    let exitCode: 0 | 1 | 2;
    if (options.blockMode === true) {
      exitCode = getTierExitCode(tier) as 0 | 1 | 2;
    } else {
      exitCode = 0; // Warn only - don't block
    }
    
    return {
      passed: violations.length === 0 || options.blockMode !== true,
      rule: options.rule,
      violations,
      exitCode,
      warnOnly: options.blockMode !== true,
    };
  }
  
  // Route to appropriate rule
  if (options.rule === 'block-quarantined') {
    const { generateScopeId } = await import('../../storage/paths.js');
    const scope = options.repoUrl
      ? {
          type: options.scopeType || 'project',
          id: generateScopeId(options.repoUrl),
        }
      : undefined;

    const result = await checkBlockQuarantined(cwd, scope);
    
    // Week 9 Day 60-62: Check validity if requested
    if (options.checkValidity) {
      const { checkValidity } = await import('../../validation/validity.js');
      const { createGitHubValidator } = await import('../../validation/github-validator.js');
      const { readFile } = await import('fs/promises');
      const { existsSync } = await import('fs');
      const { resolve } = await import('path');
      
      const validators = [createGitHubValidator()];
      
      // Check validity for each violation
      for (const violation of result.violations) {
        if (violation.quarantine_ref) {
          // Try to read the quarantined content
          // Handle both absolute and relative paths
          let quarantinePath = violation.quarantine_ref;
          if (!quarantinePath.startsWith('/')) {
            quarantinePath = resolve(cwd, quarantinePath);
          }
          
          if (existsSync(quarantinePath)) {
            try {
              const content = await readFile(quarantinePath, 'utf-8');
              
              // Extract secret from content - handle various formats
              // 1. Direct tokens: sk-xxx, ghp_xxx, AKIA...
              // 2. Key-value format: KEY=value
              let secret = '';
              
              // Try direct token format first
              const directMatch = content.match(/(?:sk-|ghp_|gho_|ghu_|ghs_|ghr_|AKIA)[A-Za-z0-9_\-]{20,}/);
              if (directMatch) {
                secret = directMatch[0];
              } else {
                // Try key-value format
                const kvMatch = content.match(/(?:token|key|secret|password|credential|api)[_\-]?\w*\s*[:=]\s*['"]?([a-zA-Z0-9\-_]{20,})['"]?/i);
                if (kvMatch) {
                  secret = kvMatch[1] || kvMatch[0];
                  // Check if the value contains a known prefix
                  const valueMatch = secret.match(/(?:sk-|ghp_|gho_|ghu_|ghs_|ghr_|AKIA)[A-Za-z0-9_\-]+/);
                  if (valueMatch) {
                    secret = valueMatch[0];
                  }
                }
              }
              
              if (secret && secret.length >= 20) {
                // Try to get pattern from metadata
                const metadataPath = resolve(cwd, '.memorylink', 'quarantined', `${violation.record_id}.metadata.json`);
                if (existsSync(metadataPath)) {
                  const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
                  const { SECRET_PATTERNS } = await import('../../quarantine/patterns.js');
                  
                  // Find pattern by ID or use a default one
                  let pattern = SECRET_PATTERNS.find(p => p.id === metadata.pattern_id);
                  
                  // If not found, try to match by secret format
                  if (!pattern) {
                    if (secret.startsWith('ghp_') || secret.startsWith('gho_')) {
                      pattern = SECRET_PATTERNS.find(p => p.id === 'github-token');
                    } else if (secret.startsWith('sk-')) {
                      pattern = SECRET_PATTERNS.find(p => p.id === 'openai-key' || p.id === 'anthropic-key');
                    } else if (secret.startsWith('AKIA')) {
                      pattern = SECRET_PATTERNS.find(p => p.id === 'aws-access-key');
                    }
                  }
                  
                  // If still not found, use the key-value pattern
                  if (!pattern) {
                    pattern = SECRET_PATTERNS.find(p => p.id === 'key-value-secret');
                  }
                  
                  if (pattern) {
                    const validityResult = await checkValidity(pattern, secret, validators);
                    // Store validity result in metadata
                    metadata.validity = validityResult;
                    await import('fs/promises').then(fs => 
                      fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
                    );
                    // Also store in violation for display
                    violation.validity = validityResult;
                  }
                }
              }
            } catch (e) {
              // Skip if can't read quarantine file
            }
          }
        }
      }
    }
    
    // Week 8: Apply tiered severity classification
    // Week 9: Load validity status from metadata for all violations (for display)
    const { readFile: readFileFS } = await import('fs/promises');
    const { existsSync: existsSyncFS } = await import('fs');
    const { resolve: resolveFS } = await import('path');
    
    for (const violation of result.violations) {
      if (!violation.validity && violation.quarantine_ref) {
        const metadataPath = resolveFS(cwd, '.memorylink', 'quarantined', `${violation.record_id}.metadata.json`);
        if (existsSyncFS(metadataPath)) {
          try {
            const metadata = JSON.parse(await readFileFS(metadataPath, 'utf-8'));
            if (metadata.validity) {
              violation.validity = metadata.validity;
            }
          } catch (e) {
            // Skip if can't read metadata
          }
        }
      }
    }
    
    // Week 9: Filter by validity status if requested
    let filteredViolations = result.violations;
    if (options.validity) {
      // Filter violations by validity status
      const { readFile } = await import('fs/promises');
      const { existsSync } = await import('fs');
      const { resolve } = await import('path');
      
      filteredViolations = [];
      for (const violation of result.violations) {
        if (violation.record_id) {
          const metadataPath = resolve(cwd, '.memorylink', 'quarantined', `${violation.record_id}.metadata.json`);
          if (existsSync(metadataPath)) {
            try {
              const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
              if (metadata.validity && metadata.validity.status === options.validity) {
                filteredViolations.push(violation);
              }
            } catch (e) {
              // If no validity info, include it (unknown status)
              if (options.validity === 'unknown') {
                filteredViolations.push(violation);
              }
            }
          } else {
            // No metadata - treat as unknown
            if (options.validity === 'unknown') {
              filteredViolations.push(violation);
            }
          }
        }
      }
    }
    
    // Use filtered violations for tier calculation
    const tier = filteredViolations.length > 0 ? SeverityTier.RED : SeverityTier.GREEN;
    
    // Week 8: Check bypass
    if (tier === SeverityTier.RED && options.bypass) {
      // Check if already bypassed
      const bypassCheck = await isBypassed(cwd);
      if (bypassCheck.ok && !bypassCheck.value) {
        // Not bypassed - create bypass if reason provided
        if (options.bypassReason) {
          const bypassResult = await createBypass(cwd, {
            reason: options.bypassReason,
            expiresInHours: options.bypassHours,
          });
          if (bypassResult.ok) {
            console.log(`⚠️  Bypass created: ${options.bypassReason}`);
            console.log(`   Expires: ${new Date(bypassResult.value.expires_at).toLocaleString()}`);
          }
        }
      }
      
      // If bypassed, change tier to YELLOW (warn but don't block)
      const bypassCheck2 = await isBypassed(cwd);
      if (bypassCheck2.ok && bypassCheck2.value) {
        // Bypassed - warn but don't block
        return {
          ...result,
          passed: true, // Don't block
          exitCode: EXIT_CODES.SUCCESS, // Exit 0 (warn but pass)
        };
      }
    }
    
    // Week 8: Apply severity filter
    if (options.severity && tier !== options.severity) {
      // Filter doesn't match - return pass
      return {
        ...result,
        passed: true,
        exitCode: EXIT_CODES.SUCCESS,
      };
    }
    
    // User-friendly mode: Check if we should BLOCK or just WARN
    // Default (blockMode=false): WARN only - exit 0, user can continue
    // Active (blockMode=true): BLOCK - exit 1, stop pipeline
    let exitCode: 0 | 1 | 2;
    
    if (options.blockMode === true) {
      // Block mode ACTIVE - use tier-based exit code
      exitCode = getTierExitCode(tier) as 0 | 1 | 2;
    } else {
      // Block mode OFF (default) - always exit 0, just warn
      exitCode = 0;
    }
    
    return {
      ...result,
      violations: filteredViolations, // Use filtered violations
      exitCode,
      // Add flag to indicate if we're in warn-only mode
      warnOnly: options.blockMode !== true,
    };
  }

  // Unknown rule
  return {
    passed: false,
    rule: options.rule,
    violations: [],
    exitCode: 2, // ERROR
  };
}

/**
 * Execute gate and output result
 * Handles exit codes and safe output
 */
export async function executeGate(
  cwd: string,
  options: GateOptions
): Promise<void> {
  const result = await runGate(cwd, options);

  // Log gate event to audit trail
  const auditResult = await appendAuditEvent(cwd, {
    event_type: 'GATE',
    rule: result.rule,
    result: result.passed ? 'PASS' : 'FAIL',
    violations: result.violations.length,
    exit_code: result.exitCode,
  });

  if (!auditResult.ok) {
    // Audit failure doesn't fail gate, but log it
    console.warn(`Warning: Failed to log audit event: ${auditResult.error.message}`);
  }

  // Week 9: JSON output mode
  if (options.json) {
    const { getRemediationGuide } = await import('../../remediation/guides.js');
    const { readFile } = await import('fs/promises');
    const { existsSync } = await import('fs');
    const { resolve } = await import('path');
    const { loadRecord } = await import('../../storage/local.js');
    const { generateScopeId } = await import('../../storage/paths.js');
    
    // Determine severity tier
    let tier: SeverityTier;
    if (result.passed && result.violations.length > 0) {
      tier = SeverityTier.YELLOW;
    } else if (!result.passed) {
      tier = SeverityTier.RED;
    } else {
      tier = SeverityTier.GREEN;
    }
    
    // Build JSON output with remediation guides
    const violationsWithRemediation = await Promise.all(
      result.violations.map(async (v) => {
        let remediation: any = undefined;
        let patternId: string | undefined = undefined;
        let patternName: string | undefined = undefined;
        
        // Try to get pattern info from the record
        if (v.record_id) {
          try {
            const scope = {
              type: 'project' as const,
              id: generateScopeId(cwd),
            };
            const recordResult = await loadRecord(cwd, scope, v.record_id);
            if (recordResult.ok && recordResult.value.quarantine_ref) {
              // Try to read quarantine metadata file
              const quarantineDir = resolve(cwd, '.memorylink', 'quarantined');
              const metadataPath = resolve(quarantineDir, `${v.record_id}.metadata.json`);
              
              if (existsSync(metadataPath)) {
                try {
                  const metadata = JSON.parse(await readFile(metadataPath, 'utf-8'));
                  patternId = metadata.pattern_id;
                  patternName = metadata.pattern_name;
                  
                  // Get remediation guide if pattern info available
                  if (patternId || patternName) {
                    const { SECRET_PATTERNS } = await import('../../quarantine/patterns.js');
                    const pattern = SECRET_PATTERNS.find(p => 
                      p.id === patternId || p.name === patternName
                    );
                    if (pattern) {
                      const guide = getRemediationGuide(pattern);
                      if (guide) {
                        remediation = guide;
                      }
                    }
                  }
                } catch (e) {
                  // Metadata file doesn't exist or is invalid - use generic guide
                }
              }
            }
          } catch (e) {
            // Failed to load record - use generic guide
          }
        }
        
        // Fallback to generic remediation if no pattern-specific guide
        if (!remediation) {
          remediation = {
            provider: 'Generic',
            steps: [
              '1. Review the quarantined file',
              '2. Remove or redact the secret',
              '3. Update your code/config',
              '4. Remove from Git history if committed',
            ],
          };
        }
        
        return {
          record_id: v.record_id,
          conflict_key: v.conflict_key,
          created_at: v.created_at,
          quarantine_ref: v.quarantine_ref,
          pattern_id: patternId,
          pattern_name: patternName,
          remediation,
        };
      })
    );
    
    // Build mode info for JSON output
    const modeInfo = options.modeInfo;
    const jsonOutput = {
      tool: 'memorylink',
      command: 'gate',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      
      // Mode info (smart resolution)
      mode: {
        effective: modeInfo?.effective || (options.blockMode ? 'active' : 'inactive'),
        source: modeInfo?.source || 'default',
        config_value: modeInfo?.configValue || 'inactive',
        env_value: modeInfo?.envValue || null,
        flag_value: modeInfo?.flagValue || null,
      },
      
      // Scan info
      scan: {
        scope: options.diff ? 'diff' : 'full',
        rule: result.rule,
      },
      
      // Result
      result: {
        status: result.passed ? (result.violations.length > 0 ? 'WARN' : 'PASS') : 'BLOCK',
        exit_code: result.exitCode,
        tier: tier,
      },
      
      // Summary
      summary: {
        critical: result.violations.filter(v => v.validity?.status === 'active').length,
        warning: result.violations.filter(v => v.validity?.status !== 'active').length,
        total: result.violations.length,
      },
      
      // Findings
      findings: violationsWithRemediation,
    };
    
    console.log(JSON.stringify(jsonOutput, null, 2));
    process.exit(result.exitCode);
  }

  // Format output (safe - no secrets)
  const output = formatGateResult(result);

  // Security check: Validate output doesn't contain secrets
  if (!validateGateOutput(output)) {
    console.error('Error: Gate output contains potential secrets');
    process.exit(2); // ERROR
  }

  // Print output
  console.log(output);
  
  // Week 8: Determine severity tier based on result
  // If passed=true but violations exist, it's YELLOW (bypassed)
  // If passed=false, it's RED (blocking)
  // If passed=true and no violations, it's GREEN
  let tier: SeverityTier;
  if (result.passed && result.violations.length > 0) {
    tier = SeverityTier.YELLOW; // Bypassed - warn but don't block
  } else if (!result.passed) {
    tier = SeverityTier.RED; // Blocking
  } else {
    tier = SeverityTier.GREEN; // No issues
  }
  
  // Smart output based on mode and findings
  // ANSI color codes
  const GREEN = '\x1b[0;32m';
  const YELLOW = '\x1b[0;33m';
  const RED = '\x1b[0;31m';
  const CYAN = '\x1b[0;36m';
  const DIM = '\x1b[2m';
  const BOLD = '\x1b[1m';
  const RESET = '\x1b[0m';
  
  // Quiet mode: print nothing if no issues
  if (options.quiet && result.violations.length === 0) {
    process.exit(result.exitCode);
  }
  
  // Get mode info for smart output
  const modeInfo = options.modeInfo;
  const modeSource = modeInfo?.source || 'default';
  
  console.log('');
  console.log('━'.repeat(60));
  
  // Mode indicator with source
  if (result.warnOnly) {
    console.log(`${YELLOW}📊 MODE: INACTIVE ${DIM}(warn-only)${RESET}`);
    console.log(`   ${DIM}Source: ${modeSource}${RESET}`);
  } else {
    console.log(`${RED}📊 MODE: ACTIVE ${DIM}(blocking)${RESET}`);
    console.log(`   ${DIM}Source: ${modeSource}${RESET}`);
  }
  console.log('━'.repeat(60));
  
  if (result.warnOnly && result.violations.length > 0) {
    // INACTIVE mode with issues found - show smart switching hints
    console.log('');
    console.log(`${YELLOW}⚠️  ${result.violations.length} issue(s) found${RESET}`);
    console.log(`   ${DIM}Continuing anyway (inactive mode)${RESET}`);
    console.log('');
    console.log('━'.repeat(60));
    console.log(`${BOLD}💡 To enforce security:${RESET}`);
    console.log('━'.repeat(60));
    console.log('');
    console.log(`   ${DIM}Permanently (set once):${RESET}`);
    console.log(`      ${CYAN}ml mode active${RESET}`);
    console.log('');
    console.log(`   ${DIM}One-time (this push only):${RESET}`);
    console.log(`      ${CYAN}ML_MODE=active git push${RESET}`);
    console.log('');
  } else if (tier === SeverityTier.RED && !result.warnOnly) {
    // ACTIVE mode with issues - blocking
    console.log('');
    console.log(`${RED}🚫 BLOCKED: ${result.violations.length} issue(s) found${RESET}`);
    console.log(`   ${DIM}Exit code: 1 (pipeline will fail)${RESET}`);
    console.log('');
    console.log('━'.repeat(60));
    console.log(`${BOLD}💡 To bypass temporarily:${RESET}`);
    console.log('━'.repeat(60));
    console.log('');
    console.log(`   ${DIM}One-time (this push only):${RESET}`);
    console.log(`      ${CYAN}ML_MODE=inactive git push${RESET}`);
    console.log('');
    console.log(`   ${DIM}Emergency bypass (Git built-in):${RESET}`);
    console.log(`      ${CYAN}git push --no-verify${RESET}`);
    console.log('');
    console.log(`   ${DIM}Switch to warn-only permanently:${RESET}`);
    console.log(`      ${CYAN}ml mode inactive${RESET}`);
    console.log('');
  } else if (tier === SeverityTier.GREEN) {
    // All clear - minimal output in quiet mode
    if (!options.quiet) {
      console.log('');
      console.log(`${GREEN}✅ All clear - no issues found!${RESET}`);
    }
  }
  
  // False positive escape hatch
  if (result.violations.length > 0) {
    console.log('━'.repeat(60));
    console.log(`${DIM}💡 False positive? Use:${RESET}`);
    console.log(`   ${CYAN}ml gate --mark-false <id>${RESET}  ${DIM}Mark as false positive${RESET}`);
    console.log(`   ${CYAN}ml release -l${RESET}              ${DIM}Review quarantined items${RESET}`);
    console.log('━'.repeat(60));
  }

  // Exit with appropriate code
  process.exit(result.exitCode);
}

