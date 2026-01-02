/**
 * ml mode command
 * 
 * Smart mode switching for MemoryLink
 * - ml mode → shows current mode
 * - ml mode active → sets blocking permanently
 * - ml mode inactive → sets warn-only permanently
 */

import { out } from '../output.js';
import { loadPreferences, setPreference } from '../../config/preferences.js';

export interface ModeOptions {
  mode?: 'active' | 'inactive';
}

/**
 * Detect if running in CI environment
 * CI should always enforce (active mode) by default
 */
export function isCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_URL ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.BUILDKITE ||
    process.env.AZURE_PIPELINES ||
    process.env.TEAMCITY_VERSION ||
    process.env.BITBUCKET_PIPELINES ||
    // AI Reviewer Suggestions (January 2026)
    process.env.DRONE ||
    process.env.APPVEYOR ||
    process.env.SEMAPHORE ||
    process.env.BUDDY ||
    process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.BITRISE_IO ||
    process.env.CODESHIP ||
    process.env.BITBUCKET_BUILD_NUMBER
  );
}

/**
 * Get effective mode with source information
 * Priority: flag > env > CI detection > config > default
 * 
 * CI ALWAYS ENFORCES by default (can be overridden with ML_MODE=inactive)
 */
export async function getEffectiveMode(
  cwd: string,
  flagValue?: 'active' | 'inactive'
): Promise<{
  effective: 'active' | 'inactive';
  source: 'flag' | 'env' | 'ci' | 'config' | 'default';
  configValue: 'active' | 'inactive';
  envValue: 'active' | 'inactive' | null;
  flagValue: 'active' | 'inactive' | null;
  isCI: boolean;
}> {
  // Get config value
  const prefsResult = await loadPreferences(cwd);
  const configValue: 'active' | 'inactive' = 
    prefsResult.ok && prefsResult.value.block_mode ? 'active' : 'inactive';
  
  // Get env value
  const envRaw = process.env.ML_MODE?.toLowerCase();
  const envValue: 'active' | 'inactive' | null = 
    envRaw === 'active' ? 'active' : 
    envRaw === 'inactive' ? 'inactive' : null;
  
  // Check CI environment
  const ciDetected = isCI();
  
  // Determine effective mode (priority: flag > env > CI > config > default)
  let effective: 'active' | 'inactive';
  let source: 'flag' | 'env' | 'ci' | 'config' | 'default';
  
  if (flagValue) {
    effective = flagValue;
    source = 'flag';
  } else if (envValue) {
    effective = envValue;
    source = 'env';
  } else if (ciDetected) {
    // CI auto-enforces unless explicitly overridden
    effective = 'active';
    source = 'ci';
  } else if (prefsResult.ok) {
    effective = configValue;
    source = 'config';
  } else {
    effective = 'inactive'; // Default
    source = 'default';
  }
  
  return {
    effective,
    source,
    configValue,
    envValue,
    flagValue: flagValue || null,
    isCI: ciDetected,
  };
}

/**
 * Execute mode command
 */
export async function executeMode(
  cwd: string,
  options: ModeOptions
): Promise<void> {
  // ANSI colors
  const GREEN = '\x1b[0;32m';
  const YELLOW = '\x1b[0;33m';
  const RED = '\x1b[0;31m';
  const CYAN = '\x1b[0;36m';
  const DIM = '\x1b[2m';
  const BOLD = '\x1b[1m';
  const RESET = '\x1b[0m';
  
  // If mode specified, set it
  if (options.mode) {
    const newMode = options.mode === 'active';
    const result = await setPreference(cwd, 'block_mode', newMode);
    
    if (result.ok) {
      console.log('');
      if (options.mode === 'active') {
        console.log(`${GREEN}✓${RESET} Mode set to ${RED}${BOLD}ACTIVE${RESET} (blocking)`);
        console.log('');
        console.log(`  ${DIM}What this means:${RESET}`);
        console.log(`    • Git commits/pushes will be ${RED}BLOCKED${RESET} if secrets found`);
        console.log(`    • Exit code will be ${RED}1${RESET} on findings`);
        console.log('');
        console.log(`  ${DIM}To temporarily allow (one-time):${RESET}`);
        console.log(`    ${CYAN}ML_MODE=inactive git push${RESET}`);
        console.log('');
        console.log(`  ${DIM}To switch back to warn-only:${RESET}`);
        console.log(`    ${CYAN}ml mode inactive${RESET}`);
      } else {
        console.log(`${GREEN}✓${RESET} Mode set to ${YELLOW}${BOLD}INACTIVE${RESET} (warn-only)`);
        console.log('');
        console.log(`  ${DIM}What this means:${RESET}`);
        console.log(`    • Git commits/pushes will ${YELLOW}WARN${RESET} but allow through`);
        console.log(`    • Exit code will be ${GREEN}0${RESET} even with findings`);
        console.log('');
        console.log(`  ${DIM}To temporarily enforce (one-time):${RESET}`);
        console.log(`    ${CYAN}ML_MODE=active git push${RESET}`);
        console.log('');
        console.log(`  ${DIM}To switch to blocking permanently:${RESET}`);
        console.log(`    ${CYAN}ml mode active${RESET}`);
      }
      console.log('');
    } else {
      out.error(`Failed to set mode: ${result.error.message}`);
      process.exit(1);
    }
    return;
  }
  
  // Show current mode
  const mode = await getEffectiveMode(cwd);
  
  console.log('');
  console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  ${BOLD}📊 MEMORYLINK MODE${RESET}`);
  console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log('');
  
  // Current effective mode
  if (mode.effective === 'active') {
    console.log(`  Current: ${RED}${BOLD}ACTIVE${RESET} ${DIM}(blocking)${RESET}`);
    console.log(`  Source:  ${DIM}${mode.source}${RESET}`);
    console.log('');
    console.log(`  ${DIM}Behavior:${RESET}`);
    console.log(`    • Commits/pushes ${RED}BLOCKED${RESET} if secrets found`);
    console.log(`    • Exit code: ${RED}1${RESET} on findings`);
  } else {
    console.log(`  Current: ${YELLOW}${BOLD}INACTIVE${RESET} ${DIM}(warn-only)${RESET}`);
    console.log(`  Source:  ${DIM}${mode.source}${RESET}`);
    console.log('');
    console.log(`  ${DIM}Behavior:${RESET}`);
    console.log(`    • Commits/pushes ${YELLOW}WARNED${RESET} but allowed`);
    console.log(`    • Exit code: ${GREEN}0${RESET} even with findings`);
  }
  
  console.log('');
  console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  ${BOLD}Resolution Order${RESET} ${DIM}(highest priority first)${RESET}`);
  console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log('');
  
  // Show resolution order
  const flagIcon = mode.source === 'flag' ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
  const envIcon = mode.source === 'env' ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
  const ciIcon = mode.source === 'ci' ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
  const configIcon = mode.source === 'config' ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
  const defaultIcon = mode.source === 'default' ? `${GREEN}●${RESET}` : `${DIM}○${RESET}`;
  
  console.log(`  ${flagIcon} 1. CLI flag     ${DIM}--mode active|inactive${RESET}    ${mode.flagValue ? `= ${mode.flagValue}` : `${DIM}(not set)${RESET}`}`);
  console.log(`  ${envIcon} 2. Env var      ${DIM}ML_MODE${RESET}                   ${mode.envValue ? `= ${mode.envValue}` : `${DIM}(not set)${RESET}`}`);
  console.log(`  ${ciIcon} 3. CI detect    ${DIM}(auto-enforce in CI)${RESET}      ${mode.isCI ? `${RED}= active${RESET}` : `${DIM}(not CI)${RESET}`}`);
  console.log(`  ${configIcon} 4. Config       ${DIM}.memorylink/config.json${RESET}   = ${mode.configValue}`);
  console.log(`  ${defaultIcon} 5. Default      ${DIM}(built-in)${RESET}                = inactive`);
  
  console.log('');
  console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  ${BOLD}Quick Commands${RESET}`);
  console.log(`${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log('');
  console.log(`  ${DIM}Set permanently:${RESET}`);
  console.log(`    ${CYAN}ml mode active${RESET}      ${DIM}→ block on secrets${RESET}`);
  console.log(`    ${CYAN}ml mode inactive${RESET}    ${DIM}→ warn only${RESET}`);
  console.log('');
  console.log(`  ${DIM}Override once:${RESET}`);
  console.log(`    ${CYAN}ML_MODE=active git push${RESET}      ${DIM}→ enforce this push${RESET}`);
  console.log(`    ${CYAN}ML_MODE=inactive git push${RESET}    ${DIM}→ allow this push${RESET}`);
  console.log('');
  console.log(`  ${DIM}Emergency bypass (Git built-in):${RESET}`);
  console.log(`    ${CYAN}git push --no-verify${RESET}         ${DIM}→ skip all hooks${RESET}`);
  console.log('');
}

