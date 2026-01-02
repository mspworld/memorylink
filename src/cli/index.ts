#!/usr/bin/env node
/**
 * MemoryLink CLI Entry Point
 * Week 2: Core commands
 * Based on SPEC.md v4.3.10
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { out } from './output.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read version from package.json
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);
const version = packageJson.version;

const program = new Command();

program
  .name('ml')
  .description('MemoryLink - Repo-native memory governance system')
  .version(version);

// ml capture command
program
  .command('capture')
  .description('Capture a memory (E0 or E1 only)')
  .requiredOption('-t, --topic <topic>', 'Topic for the memory')
  .requiredOption('-c, --content <content>', 'Content to capture')
  .option('-e, --evidence <level>', 'Evidence level (E0 or E1)', 'E0')
  .option('--scope-type <type>', 'Scope type (project|user|org)', 'project')
  .option('--repo-url <url>', 'Repository URL for scope')
  .option('--purpose-tags <tags>', 'Purpose tags (comma-separated)')
  .option('--approve', 'Approve instruction-type content (Week 6: required for instructions)')
  .action(async (options) => {
    const { captureMemory } = await import('./commands/capture.js');
    const result = await captureMemory(process.cwd(), {
      topic: options.topic,
      content: options.content,
      evidence: options.evidence,
      scopeType: options.scopeType,
      repoUrl: options.repoUrl,
      purposeTags: options.purposeTags?.split(','),
      approve: options.approve || false, // Week 6: Approval flag
    });

    if (result.ok) {
      const record = result.value;
      if (record.status === 'QUARANTINED') {
        out.quarantined({
          recordId: record.id,
          reason: 'Secret detected in content',
          quarantinePath: record.quarantine_ref || '.memorylink/quarantined/',
        });
      } else {
        out.success(`Captured: ${out.recordId(record.id)}`);
        out.print(`    ${out.dim('Evidence:')} ${record.evidence_level}`);
        out.print(`    ${out.dim('Status:')} ${out.green(record.status)}`);
        out.print(`    ${out.dim('Topic:')} ${record.conflict_key}`);
      }
      process.exit(0);
    } else {
      out.error(result.error.message);
      process.exit(result.error.exitCode || 1);
    }
  });

// ml query command
program
  .command('query')
  .description('Query memories by topic')
  .requiredOption('-t, --topic <topic>', 'Topic to query')
  .option('--scope-type <type>', 'Scope type (project|user|org)', 'project')
  .option('--repo-url <url>', 'Repository URL for scope')
  .action(async (options) => {
    const { queryMemory } = await import('./commands/query.js');
    const result = await queryMemory(process.cwd(), {
      topic: options.topic,
      scopeType: options.scopeType,
      repoUrl: options.repoUrl,
    });

    if (result.ok) {
      const resolution = result.value;
      if (!resolution) {
        out.info('No matches found', `Topic "${options.topic}" has no active memories`);
        process.exit(0);
      } else {
        const winner = resolution.winner;
        out.newline();
        out.print(`  ${out.highlight('Result:')} ${out.recordId(winner.id)}`);
        out.print(`    ${out.dim('Evidence:')} ${winner.evidence_level}`);
        out.print(`    ${out.dim('Status:')} ${out.green(winner.status)}`);
        out.newline();
        out.print(`  ${out.highlight('Content:')}`);
        out.print(`    ${winner.content}`);
        out.newline();
        out.print(`  ${out.dim('Reason: ' + resolution.reason)}`);
        out.newline();
        process.exit(0);
      }
    } else {
      out.error(result.error.message);
      process.exit(result.error.exitCode || 1);
    }
  });

// ml gate command
program
  .command('gate')
  .description('Run policy gate check')
  .option('-r, --rule <rule>', 'Gate rule (block-quarantined)')
  .option('--scope-type <type>', 'Scope type (project|user|org)', 'project')
  .option('--repo-url <url>', 'Repository URL for scope')
  .option('--bypass', 'Create bypass for violations (Week 8)')
  .option('--bypass-reason <reason>', 'Reason for bypass (required with --bypass)')
  .option('--bypass-hours <hours>', 'Bypass expiry in hours (default: 24)', '24')
  .option('--severity <tier>', 'Filter by severity tier (red|yellow|green) (Week 8)')
  .option('--diff', 'Check only changed files (pre-commit)')
  .option('--history', 'Scan commit history for secrets')
  .option('--history-limit <n>', 'Number of commits to scan (default: 10)', '10')
  .option('--validity <status>', 'Filter by validity status (active|inactive|unknown)')
  .option('--json', 'Output in JSON format')
  .option('--check-validity', 'Check if secrets are active/inactive')
  .option('--mark-false <id>', 'Mark a finding as false positive (never warn again)')
  // Smart mode switching: --mode flag (highest priority)
  .option('--mode <mode>', 'Set mode for this run: active (block) or inactive (warn)')
  // Legacy aliases (map to --mode)
  .option('--block', 'Alias for --mode active')
  .option('--enforce', 'Alias for --mode active')
  .option('--monitor', 'Alias for --mode inactive')
  .option('--warn', 'Alias for --mode inactive')
  // Output control
  .option('--quiet', 'Print nothing unless blocked or issues found')
  .option('--verbose', 'Print detailed scanning info')
  .action(async (options) => {
    const { executeGate } = await import('./commands/gate.js');
    const { SeverityTier } = await import('../gate/severity.js');
    const { getEffectiveMode } = await import('./commands/mode.js');
    
    // Parse severity tier
    let severity: typeof SeverityTier[keyof typeof SeverityTier] | undefined;
    if (options.severity) {
      const tierMap: Record<string, typeof SeverityTier[keyof typeof SeverityTier]> = {
        'red': SeverityTier.RED,
        'yellow': SeverityTier.YELLOW,
        'green': SeverityTier.GREEN,
      };
      severity = tierMap[options.severity.toLowerCase()];
    }
    
    // Handle --mark-false option
    if (options.markFalse) {
      const { markFalsePositive } = await import('../validation/validity.js');
      const result = await markFalsePositive(process.cwd(), options.markFalse);
      if (result.ok) {
        out.success(`Marked as false positive: ${options.markFalse}`);
        out.info('This finding will be skipped in future scans');
        process.exit(0);
      } else {
        out.error(`Failed to mark false positive: ${result.error.message}`);
        process.exit(1);
      }
      return;
    }
    
    // Validate rule is required if not using --mark-false
    if (!options.rule) {
      out.error('Missing required option: --rule <rule>');
      out.info('Use: ml gate --rule block-quarantined');
      process.exit(1);
    }
    
    // Smart mode resolution: flag > env > config > default
    // Map legacy flags to --mode value
    let flagValue: 'active' | 'inactive' | undefined;
    if (options.mode) {
      flagValue = options.mode === 'active' ? 'active' : 'inactive';
    } else if (options.block || options.enforce) {
      flagValue = 'active';
    } else if (options.monitor || options.warn) {
      flagValue = 'inactive';
    }
    
    // Get effective mode using smart resolution
    const modeInfo = await getEffectiveMode(process.cwd(), flagValue);
    const blockMode = modeInfo.effective === 'active';
    
    await executeGate(process.cwd(), {
      rule: options.rule,
      scopeType: options.scopeType,
      repoUrl: options.repoUrl,
      bypass: options.bypass || false,
      bypassReason: options.bypassReason,
      bypassHours: options.bypassHours ? parseInt(options.bypassHours, 10) : undefined,
      severity,
      diff: options.diff || false,
      history: options.history || false,
      historyLimit: options.historyLimit ? parseInt(options.historyLimit, 10) : undefined,
      validity: options.validity as 'active' | 'inactive' | 'unknown' | undefined,
      json: options.json || false,
      checkValidity: options.checkValidity || false,
      blockMode,
      quiet: options.quiet || false,
      verbose: options.verbose || false,
      // Pass mode info for output
      modeInfo,
    });
  });

// ml promote command
program
  .command('promote')
  .description('Promote memory to E2 (only path to E2)')
  .requiredOption('-r, --record-id <id>', 'Record ID to promote')
  .requiredOption('--to <level>', 'Target evidence level (must be E2)', 'E2')
  .requiredOption('--reason <reason>', 'Reason for promotion (required for audit)')
  .option('--scope-type <type>', 'Scope type (project|user|org)', 'project')
  .option('--repo-url <url>', 'Repository URL for scope')
  .option('--constitution', 'Approve constitution file changes (Week 5: required for constitution.md)')
  .action(async (options) => {
    const { promoteMemory } = await import('./commands/promote.js');
    const result = await promoteMemory(process.cwd(), {
      recordId: options.recordId,
      to: options.to,
      reason: options.reason,
      scopeType: options.scopeType,
      repoUrl: options.repoUrl,
      constitution: options.constitution || false, // Week 5: Constitution approval
    });

    if (result.ok) {
      const record = result.value;
      out.success(`Promoted: ${out.recordId(record.id)}`);
      out.print(`    ${out.dim('Evidence:')} ${out.green(record.evidence_level)}`);
      out.print(`    ${out.dim('Status:')} ${record.status}`);
      process.exit(0);
    } else {
      out.error(result.error.message);
      process.exit(result.error.exitCode || 1);
    }
  });

// ml audit command
program
  .command('audit')
  .description('View audit trail')
  .option('-v, --view <view>', 'View type (timeline|security|verify)', 'timeline')
  .option('--from <date>', 'Start date (ISO-8601)')
  .option('--to <date>', 'End date (ISO-8601)')
  .option('--record-id <id>', 'Filter by record ID')
  .option('--drift', 'Detect memory conflicts (Week 9 Day 63)')
  .option('--spec-drift', 'Detect code vs spec drift (Week 9 Day 63)')
  .option('--consistency', 'Check tool pointer consistency (Week 9 Day 63)')
  .action(async (options) => {
    const { runAudit } = await import('./commands/audit.js');
    const result = await runAudit(process.cwd(), {
      view: options.view,
      from: options.from,
      to: options.to,
      recordId: options.recordId,
      drift: options.drift || false,
      specDrift: options.specDrift || false,
      consistency: options.consistency || false,
    });

    if (result.ok) {
      process.exit(0);
    } else {
      console.error(`❌ Error: ${result.error.message}`);
      process.exit(result.error.exitCode || 1);
    }
  });

// ml release command (Gemini's critical requirement - undo quarantine)
program
  .command('release')
  .description('Release items from quarantine (undo accidental quarantines)')
  .option('-l, --list', 'List all quarantined items')
  .option('-s, --show <id>', 'Show details of a quarantined item')
  .option('-i, --id <id>', 'Release a specific quarantined item')
  .option('-f, --force', 'Force release without confirmation')
  .action(async (options) => {
    const { executeRelease } = await import('./commands/release.js');
    await executeRelease(process.cwd(), {
      list: options.list,
      show: options.show,
      id: options.id,
      force: options.force,
    });
  });

// ml scan command
program
  .command('scan')
  .description('Scan entire project for secrets and personal data (real-time)')
  .option('-p, --path <path>', 'Path to scan (default: current directory)')
  .option('-e, --exclude <dirs>', 'Comma-separated directories to exclude', (value) => value.split(','))
  .action(async (options) => {
    const { executeScan } = await import('./commands/scan.js');
    await executeScan(process.cwd(), {
      path: options.path,
      exclude: options.exclude,
    });
  });

// ml init command (first-time setup with complete scan)
program
  .command('init')
  .description('Initialize MemoryLink in project (first-time setup)')
  .option('--skip-scan', 'Skip the initial project scan')
  .option('--skip-hooks', 'Skip Git hooks installation')
  .option('--skip-setup', 'Skip interactive preference setup')
  .option('--defaults', 'Use default preferences (no questions)')
  .action(async (options) => {
    const { executeInit } = await import('./commands/init.js');
    await executeInit(process.cwd(), {
      skipScan: options.skipScan,
      skipHooks: options.skipHooks,
      skipSetup: options.skipSetup || options.defaults,
      useDefaults: options.defaults,
    });
  });

// ml hooks command (Week 8: Git hooks management)
program
  .command('hooks')
  .description('Manage Git hooks (Week 8)')
  .option('--install', 'Install Git hooks (pre-commit, pre-push)')
  .option('--uninstall', 'Uninstall Git hooks')
  .option('--force', 'Force overwrite existing hooks')
  .action(async (options) => {
    const { installHooks, uninstallHooks } = await import('../gate/hooks.js');
    
    if (options.uninstall) {
      const result = await uninstallHooks(process.cwd());
      if (result.ok) {
        console.log('✅ Git hooks uninstalled');
        process.exit(0);
      } else {
        console.error(`❌ Error: ${result.error.message}`);
        process.exit(result.error.exitCode || 1);
      }
    } else {
      // Default: install (or if --install flag is set)
      const result = await installHooks(process.cwd(), options.force || false);
      if (result.ok) {
        console.log('✅ Git hooks installed');
        console.log('   • pre-commit: Checks changed files before commit');
        console.log('   • pre-push: Checks entire repository before push');
        process.exit(0);
      } else {
        console.error(`❌ Error: ${result.error.message}`);
        process.exit(result.error.exitCode || 1);
      }
    }
  });

// ml promote-plan command (Week 6: Tool integration)
program
  .command('promote-plan')
  .description('Promote Cursor plan file from .cursor/plans/ to docs/plans/ (Week 6)')
  .requiredOption('-f, --file <file>', 'Plan file to promote (e.g., feature-x.md)')
  .action(async (options) => {
    const { executePromotePlan } = await import('./commands/promote-plan.js');
    await executePromotePlan(process.cwd(), {
      planFile: options.file,
    });
  });

// ml ci command - Setup CI/CD integration
program
  .command('ci')
  .description('Setup CI/CD integration (GitHub Actions)')
  .option('--provider <provider>', 'CI provider (github)', 'github')
  .option('--force', 'Overwrite existing workflow')
  .action(async (options) => {
    const { setupCI } = await import('./commands/setup-ci.js');
    await setupCI(process.cwd(), {
      provider: options.provider as 'github',
      force: options.force,
    });
  });

// ml history command - Scan Git history for secrets
program
  .command('history')
  .description('Scan Git history for leaked secrets (even deleted ones)')
  .option('--limit <n>', 'Limit number of commits to scan', '100')
  .option('--all', 'Scan ALL commits (may take a while)')
  .action(async (options) => {
    const { scanGitHistory, formatHistoryScanResults } = await import('../audit/history-scan.js');
    
    const limit = options.all ? undefined : parseInt(options.limit, 10);
    
    console.log('');
    console.log('  🔍 Scanning Git history for secrets...');
    console.log(`     ${limit ? `Checking last ${limit} commits` : 'Checking ALL commits'}`);
    console.log('');
    
    let lastProgress = 0;
    const result = await scanGitHistory(process.cwd(), {
      limit,
      onProgress: (current, total) => {
        const percent = Math.floor((current / total) * 100);
        if (percent >= lastProgress + 10) {
          process.stdout.write(`\r     Progress: ${percent}% (${current}/${total} commits)`);
          lastProgress = percent;
        }
      },
    });
    
    console.log('\r     Progress: 100% - Done!                    ');
    
    if (result.ok) {
      console.log(formatHistoryScanResults(result.value));
      
      // Exit with error if secrets found
      if (!result.value.clean) {
        process.exit(1);
      }
    } else {
      out.error(result.error.message);
      process.exit(1);
    }
  });

// ml config command - User preferences
program
  .command('config')
  .description('View and change your preferences')
  .option('--list', 'List all preferences (default)')
  .option('--set <key=value>', 'Set a preference (e.g., git_hooks=off)')
  .option('--reset', 'Reset all preferences to defaults')
  .option('--interactive', 'Change settings interactively')
  .action(async (options) => {
    const { executeConfig } = await import('./commands/config.js');
    await executeConfig(process.cwd(), {
      list: options.list,
      set: options.set,
      reset: options.reset,
      interactive: options.interactive,
    });
  });

// ml mode command - Smart mode switching
program
  .command('mode')
  .description('View or set security mode (active=block, inactive=warn)')
  .argument('[mode]', 'Mode to set: active (block) or inactive (warn-only)')
  .action(async (mode?: string) => {
    const { executeMode } = await import('./commands/mode.js');
    
    // Validate mode if provided
    if (mode && mode !== 'active' && mode !== 'inactive') {
      console.error(`Invalid mode: ${mode}`);
      console.error('Use: ml mode active  OR  ml mode inactive');
      process.exit(1);
    }
    
    await executeMode(process.cwd(), {
      mode: mode as 'active' | 'inactive' | undefined,
    });
  });

// ml self-check command - Verify installation
program
  .command('self-check')
  .description('Verify MemoryLink installation and configuration')
  .action(async () => {
    const { runSelfCheck } = await import('./commands/self-check.js');
    await runSelfCheck(process.cwd());
  });

program.parse();
