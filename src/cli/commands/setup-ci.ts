/**
 * Setup CI/CD Integration
 * 
 * Installs GitHub Action for automatic secret scanning
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { out } from '../output.js';

export interface SetupCIOptions {
  provider: 'github' | 'gitlab' | 'bitbucket';
  force?: boolean;
}

/**
 * Install GitHub Action
 */
export async function setupCI(
  cwd: string,
  options: SetupCIOptions
): Promise<void> {
  if (options.provider !== 'github') {
    out.error(`Provider "${options.provider}" not yet supported`);
    out.info('Currently supported: github');
    process.exit(1);
  }
  
  out.brand();
  
  const workflowDir = join(cwd, '.github', 'workflows');
  const workflowFile = join(workflowDir, 'memorylink.yml');
  
  // Check if already exists
  if (existsSync(workflowFile) && !options.force) {
    out.warn('GitHub Action already exists!');
    out.info(`Location: ${out.link('.github/workflows/memorylink.yml')}`);
    out.info('Use --force to overwrite');
    return;
  }
  
  // Create directory
  if (!existsSync(workflowDir)) {
    mkdirSync(workflowDir, { recursive: true });
  }
  
  // Use embedded template (no __dirname in ES modules)
  const template = getEmbeddedTemplate();
  
  // Write workflow file
  writeFileSync(workflowFile, template, 'utf-8');
  
  out.success('GitHub Action installed!');
  out.print(`    Location: ${out.link('.github/workflows/memorylink.yml')}`);
  out.newline();
  
  console.log('\x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('  \x1b[1m🚀 CI/CD PROTECTION ENABLED\x1b[0m');
  console.log('\x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('');
  console.log('  \x1b[1;37mWhat happens now:\x1b[0m');
  console.log('');
  console.log('    \x1b[0;32m●\x1b[0m Every push to main/master/develop is scanned');
  console.log('    \x1b[0;32m●\x1b[0m Every Pull Request is scanned');
  console.log('    \x1b[0;32m●\x1b[0m PRs with secrets are blocked');
  console.log('    \x1b[0;32m●\x1b[0m Results shown in GitHub Actions tab');
  console.log('');
  console.log('  \x1b[1;37mNext steps:\x1b[0m');
  console.log('');
  console.log('    \x1b[0;36m1.\x1b[0m Commit the workflow file:');
  console.log('       \x1b[0;36mgit add .github/workflows/memorylink.yml\x1b[0m');
  console.log('       \x1b[0;36mgit commit -m "Add MemoryLink security scanning"\x1b[0m');
  console.log('');
  console.log('    \x1b[0;36m2.\x1b[0m Push to GitHub:');
  console.log('       \x1b[0;36mgit push\x1b[0m');
  console.log('');
  console.log('    \x1b[0;36m3.\x1b[0m Check the Actions tab in GitHub');
  console.log('');
}

/**
 * Embedded template as fallback
 */
function getEmbeddedTemplate(): string {
  return `# MemoryLink GitHub Action
# Scans your code for secrets BEFORE they reach your repository.
#
# MODE: ENFORCE (blocking) - recommended for production
# PRs with secrets will be BLOCKED.
#
# To change to MONITOR mode (warn-only), replace:
#   ml gate --enforce --rule block-quarantined
# with:
#   ml gate --monitor --rule block-quarantined

name: MemoryLink Security Scan

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master, develop ]

jobs:
  security-scan:
    name: 🔒 Secret Detection
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: 🔧 Install MemoryLink
        run: npm install -g memorylink
      
      - name: 🔍 Initialize MemoryLink
        run: |
          ml init --skip-scan --defaults
      
      - name: 🔎 Scan for secrets
        run: |
          echo "🔍 Scanning for secrets..."
          ml scan
      
      - name: 🚦 Gate check (ENFORCE mode)
        run: |
          # ENFORCE: Block PR if secrets found (exit code 1)
          # Change to --monitor to allow PRs with warnings
          ml gate --enforce --rule block-quarantined
      
      - name: 📊 Summary
        if: always()
        run: |
          echo "## 🔒 MemoryLink Security Scan" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Mode:** ENFORCE (blocking)" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Scan completed. Check logs above for details." >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "💡 To change to MONITOR mode (warn-only), edit the workflow file." >> $GITHUB_STEP_SUMMARY
`;
}

