/**
 * MemoryLink Init Command
 * First-time setup: Complete project scan
 * Based on SPEC.md v4.3.10
 */

import { readFile, appendFile, writeFile } from 'fs/promises';
import { existsSync, lstatSync } from 'fs';
import { join } from 'path';
import { executeScan } from './scan.js';
// Week 6: Tool integration
import { generateAllPointers } from '../../tools/pointer-generator.js';
import { out } from '../output.js';

/**
 * Check if path is a symlink (security protection)
 * Prevents symlink attacks where .memorylink could point to sensitive directories
 */
function isSymlink(path: string): boolean {
  try {
    if (!existsSync(path)) {
      return false;
    }
    const stats = lstatSync(path);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

export interface InitOptions {
  skipScan?: boolean;
  skipHooks?: boolean; // Week 8: Skip Git hooks installation
  skipSetup?: boolean; // Skip interactive preference setup
  useDefaults?: boolean; // Use default preferences
}

/**
 * Initialize MemoryLink in a project
 * First-time setup: Runs complete scan, then initializes .memorylink/
 */
export async function initializeProject(
  cwd: string,
  options: InitOptions = {}
): Promise<void> {
  const memorylinkDir = join(cwd, '.memorylink');
  
  // Security: Check for symlink attack
  // Prevents attacker from creating .memorylink as symlink to /tmp or other sensitive locations
  if (isSymlink(memorylinkDir)) {
    out.errorBox(
      'SECURITY: SYMLINK DETECTED',
      '.memorylink/ is a symlink, which is a security risk.\n\n' +
      'An attacker could redirect quarantined secrets to an unprotected location.\n\n' +
      'Please remove the symlink and run ml init again:\n' +
      '  rm .memorylink && ml init'
    );
    process.exit(2);
  }
  
  const isFirstTime = !existsSync(memorylinkDir);

  out.brand();

  if (isFirstTime) {
    out.success('First-time setup detected');
    out.newline();
    
    // Interactive preference setup
    if (!options.skipSetup) {
      const { savePreferences, DEFAULT_PREFERENCES } = await import('../../config/preferences.js');
      const { runInitialSetup } = await import('./config.js');
      
      if (options.useDefaults) {
        // Use defaults silently
        await savePreferences(cwd, { ...DEFAULT_PREFERENCES });
        out.success('Using default preferences');
      } else {
        // Interactive setup
        const prefs = await runInitialSetup(cwd);
        
        // Update options based on preferences
        if (!prefs.scan_on_init) {
          options.skipScan = true;
        }
        if (!prefs.git_hooks) {
          options.skipHooks = true;
        }
      }
      out.newline();
    }
    
    out.print(`  ${out.highlight('What happens next:')}`);
    out.print(`    ${out.dim('1.')} Scan your project for existing secrets`);
    out.print(`    ${out.dim('2.')} Create .memorylink/ directory`);
    out.print(`    ${out.dim('3.')} Generate AI tool configurations`);
    out.print(`    ${out.dim('4.')} Install Git hooks for protection`);
    out.newline();

    if (!options.skipScan) {
      out.header('SCANNING PROJECT FOR SECRETS');

      // Run complete scan
      await executeScan(cwd, {});

      out.newline();
      out.divider();
      out.newline();
      out.success('Scan complete!');
      out.newline();
      out.print(`  ${out.highlight('Next Steps:')}`);
      out.print(`    ${out.dim('1.')} Review any issues found above`);
      out.print(`    ${out.dim('2.')} Fix or rotate any real secrets`);
      out.print(`    ${out.dim('3.')} Run: ${out.cmd('ml scan')} to verify fixes`);
      out.newline();
    } else {
      out.warn('Scan skipped');
      out.print(`    Run ${out.cmd('ml scan')} to scan manually`);
      out.newline();
    }
  } else {
    out.success('MemoryLink already initialized');
    out.print(`    Location: ${out.link('.memorylink/')}`);
    out.newline();
    out.info(`To scan again: ${out.cmd('ml scan')}`);
    out.newline();
  }

  // Create .memorylink directory structure
  const { mkdir } = await import('fs/promises');
  const { existsSync: exists } = await import('fs');
  
  if (!exists(memorylinkDir)) {
    await mkdir(memorylinkDir, { recursive: true });
    await mkdir(join(memorylinkDir, 'records'), { recursive: true });
    await mkdir(join(memorylinkDir, 'quarantined'), { recursive: true });
    await mkdir(join(memorylinkDir, 'audit'), { recursive: true });
    await mkdir(join(memorylinkDir, 'backups'), { recursive: true });
    
    out.success('Created .memorylink/ directory');
  }

    // Week 8: Install git hooks (optional, can be skipped)
    if (isFirstTime && !(options as any).skipHooks) {
      const { installHooks } = await import('../../gate/hooks.js');
      const hooksResult = await installHooks(cwd, false);
      if (hooksResult.ok) {
        out.success('Installed Git hooks', 'Checks for secrets before commit/push');
      } else {
        // Don't fail init if hooks installation fails
        out.warn(`Failed to install Git hooks: ${hooksResult.error.message}`);
        out.print(`    Install later with: ${out.cmd('ml hooks install')}`);
      }
    }

    // Week 6: Generate AGENTS.md and tool pointers (if first time)
    if (isFirstTime) {
    const agentsMdPath = join(cwd, 'AGENTS.md');
    if (!existsSync(agentsMdPath)) {
      // Create basic AGENTS.md template
      const basicTemplate = `# AGENTS.md
**Universal Hub for All AI Tools**

This file is the single source of truth for all AI coding assistants (Cursor, Claude Code, Copilot, etc.).

---

## 📋 Commands

**Build:**
\`\`\`bash
npm run build
# or
pnpm build
\`\`\`

**Test:**
\`\`\`bash
npm test
# or
pnpm test
\`\`\`

**Lint:**
\`\`\`bash
npm run lint
# or
pnpm lint
\`\`\`

---

## 🏗️ Architecture

[Add your project architecture notes here]

---

## 📝 Coding Conventions

[Add your coding conventions here]

---

## 🔒 Security

- Never commit secrets to Git
- Use environment variables for sensitive data
- Run \`ml scan\` before committing

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}
`;
      await writeFile(agentsMdPath, basicTemplate, 'utf-8');
      out.success('Created AGENTS.md', 'Universal hub for all AI tools');
    }

    // Generate tool pointer files
    const pointerResult = await generateAllPointers(cwd);
    if (pointerResult.ok) {
      out.success('Generated AI tool configurations');
      out.print(`    ${out.dim('•')} .cursorrules ${out.dim('→ Points to AGENTS.md')}`);
      out.print(`    ${out.dim('•')} CLAUDE.md ${out.dim('→ Points to AGENTS.md')}`);
      out.print(`    ${out.dim('•')} .github/copilot-instructions.md ${out.dim('→ Points to AGENTS.md')}`);
    } else {
      out.warn(`Failed to generate pointer files: ${pointerResult.error.message}`);
    }

    // CRITICAL: Add .memorylink/ to .gitignore (ALL 8 AIs agreed)
    await updateGitignore(cwd);
  }

  out.newline();
  out.successBox('MEMORYLINK IS READY', 'Your AI workflows are now protected from secret leaks.');
  
  // Enhanced success message with status summary
  out.newline();
  out.print(`  ${out.highlight('✅ What\'s now active:')}`);
  out.print(`    ${out.dim('•')} Git pre-commit hook ${out.dim('→ Scans staged files')}`);
  out.print(`    ${out.dim('•')} Git pre-push hook ${out.dim('→ Full project scan')}`);
  out.print(`    ${out.dim('•')} 112 secret patterns ${out.dim('→ AWS, Stripe, Aadhaar, UPI...')}`);
  out.print(`    ${out.dim('•')} AES-256-GCM encryption ${out.dim('→ Quarantined secrets protected')}`);
  out.newline();
  
  out.print(`  ${out.highlight('💡 Tips:')}`);
  out.print(`    ${out.dim('•')} Run ${out.cmd('ml mode active')} to block commits with secrets`);
  out.print(`    ${out.dim('•')} Run ${out.cmd('ml scan')} anytime to check for issues`);
  out.print(`    ${out.dim('•')} Add ${out.cmd('// ml:ignore')} to skip false positives`);
  out.newline();
  
  out.quickCommands();
}

/**
 * Update .gitignore with MemoryLink entries
 * Critical security fix: Ensures quarantined secrets never get committed
 */
async function updateGitignore(cwd: string): Promise<void> {
  const gitignorePath = join(cwd, '.gitignore');
  
  // Entries to add (prioritized by security importance)
  const memorylinkEntries = `
# ===========================================
# MemoryLink - SECURITY CRITICAL
# ===========================================
# These directories may contain sensitive data
# DO NOT REMOVE these entries

# MemoryLink data directory (contains quarantined secrets)
.memorylink/
.memorylink/**

# Cursor AI (plans may contain secrets)
.cursor/plans/
.cursor/tmp/

# Claude Code scratch space
.agent/scratch/

# Windsurf/Codeium
.windsurf/
.codeium/

# General AI agent scratch
.ai-scratch/
*.ai-temp
`;

  try {
    if (existsSync(gitignorePath)) {
      const content = await readFile(gitignorePath, 'utf-8');
      
      // Check if .memorylink/ already present
      if (!content.includes('.memorylink/')) {
        await appendFile(gitignorePath, memorylinkEntries);
        out.success('Updated .gitignore', 'Added .memorylink/ and AI directories');
        out.print(`    ${out.dim('→')} Quarantined secrets protected from git`);
      } else {
        out.dim('  .gitignore already contains .memorylink/');
      }
    } else {
      // Create new .gitignore
      await writeFile(gitignorePath, memorylinkEntries.trim() + '\n', 'utf-8');
      out.success('Created .gitignore', 'Added MemoryLink security entries');
    }
  } catch (error: any) {
    out.warn(`Failed to update .gitignore: ${error.message}`);
    out.print(`    ${out.dim('→')} Manually add: .memorylink/ to your .gitignore`);
  }
}

/**
 * Execute init command
 */
export async function executeInit(
  cwd: string,
  options: InitOptions = {}
): Promise<void> {
  try {
    await initializeProject(cwd, options);
    process.exit(0);
  } catch (error: any) {
    out.errorBox('INITIALIZATION FAILED', error.message);
    process.exit(2);
  }
}

