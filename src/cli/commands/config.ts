/**
 * ml config command
 * 
 * View and change user preferences
 */

import { out } from '../output.js';
import {
  loadPreferences,
  savePreferences,
  setPreference,
  getPreferenceKeys,
  PREFERENCE_NAMES,
  PREFERENCE_DESCRIPTIONS,
  DEFAULT_PREFERENCES,
  type UserPreferences,
} from '../../config/preferences.js';

export interface ConfigOptions {
  list?: boolean;          // List all preferences
  set?: string;            // Set a preference (key=value)
  reset?: boolean;         // Reset to defaults
  interactive?: boolean;   // Interactive mode
}

/**
 * Execute config command
 */
export async function executeConfig(
  cwd: string,
  options: ConfigOptions
): Promise<void> {
  // Reset to defaults
  if (options.reset) {
    const result = await savePreferences(cwd, { ...DEFAULT_PREFERENCES });
    if (result.ok) {
      out.success('All preferences reset to defaults');
      await listPreferences(cwd);
    } else {
      out.error(`Failed to reset: ${result.error.message}`);
      process.exit(1);
    }
    return;
  }

  // Set a preference
  if (options.set) {
    await handleSet(cwd, options.set);
    return;
  }

  // Interactive mode
  if (options.interactive) {
    await interactiveConfig(cwd);
    return;
  }

  // Default: list all preferences
  await listPreferences(cwd);
}

/**
 * List all preferences
 */
async function listPreferences(cwd: string): Promise<void> {
  const result = await loadPreferences(cwd);
  
  if (!result.ok) {
    out.error(`Failed to load preferences: ${result.error.message}`);
    process.exit(1);
  }
  
  const prefs = result.value;
  
  console.log('');
  console.log('\x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('  \x1b[1m⚙️  YOUR PREFERENCES\x1b[0m');
  console.log('\x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('');
  
  // Group preferences
  const groups = {
    'Security Features': ['git_hooks', 'validity_check', 'browser_patterns', 'debug_patterns'],
    'Scanning': ['scan_on_init', 'auto_scan'],
    'Output': ['show_tips', 'colored_output'],
    'Blocking Behavior': ['block_mode', 'strict_mode'],
  };
  
  for (const [groupName, groupKeys] of Object.entries(groups)) {
    console.log(`  \x1b[1;37m${groupName}:\x1b[0m`);
    console.log('');
    
    for (const key of groupKeys) {
      const k = key as keyof UserPreferences;
      const value = prefs[k];
      const name = PREFERENCE_NAMES[k];
      const icon = value ? '\x1b[0;32m●\x1b[0m' : '\x1b[0;90m○\x1b[0m';
      const status = value ? '\x1b[0;32mON\x1b[0m' : '\x1b[0;90mOFF\x1b[0m';
      
      console.log(`    ${icon} ${name}`);
      console.log(`       Status: ${status}  \x1b[2m(ml config --set ${key}=${value ? 'off' : 'on'})\x1b[0m`);
      console.log('');
    }
  }
  
  console.log('\x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('');
  console.log('  \x1b[1;37mCommands:\x1b[0m');
  console.log('');
  console.log('    \x1b[0;36mml config --set git_hooks=off\x1b[0m    Turn off a feature');
  console.log('    \x1b[0;36mml config --set git_hooks=on\x1b[0m     Turn on a feature');
  console.log('    \x1b[0;36mml config --reset\x1b[0m                Reset to defaults');
  console.log('    \x1b[0;36mml config --interactive\x1b[0m          Change settings interactively');
  console.log('');
}

/**
 * Handle set command
 */
async function handleSet(cwd: string, value: string): Promise<void> {
  // Parse key=value
  const match = value.match(/^([a-z_]+)=(on|off|true|false|yes|no|1|0)$/i);
  
  if (!match) {
    out.error('Invalid format. Use: --set key=on or --set key=off');
    out.info('Example: ml config --set git_hooks=off');
    console.log('');
    console.log('  Available options:');
    for (const key of getPreferenceKeys()) {
      console.log(`    - ${key}`);
    }
    process.exit(1);
  }
  
  const key = match[1] as keyof UserPreferences;
  const boolValue = ['on', 'true', 'yes', '1'].includes(match[2].toLowerCase());
  
  // Check if key is valid
  if (!getPreferenceKeys().includes(key)) {
    out.error(`Unknown setting: ${key}`);
    console.log('');
    console.log('  Available options:');
    for (const k of getPreferenceKeys()) {
      console.log(`    - ${k}`);
    }
    process.exit(1);
  }
  
  // Set the preference
  const result = await setPreference(cwd, key, boolValue);
  
  if (result.ok) {
    const status = boolValue ? '\x1b[0;32mON\x1b[0m' : '\x1b[0;90mOFF\x1b[0m';
    out.success(`${PREFERENCE_NAMES[key]}: ${status}`);
    
    // Show relevant tip
    if (key === 'git_hooks' && boolValue) {
      out.info('Run "ml init" to install git hooks');
    } else if (key === 'validity_check' && boolValue) {
      out.info('Secrets will be checked against provider APIs (requires internet)');
    }
  } else {
    out.error(`Failed to save: ${result.error.message}`);
    process.exit(1);
  }
}

/**
 * Interactive configuration
 */
async function interactiveConfig(cwd: string): Promise<void> {
  const readline = await import('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };
  
  console.log('');
  console.log('\x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('  \x1b[1m⚙️  CONFIGURE YOUR PREFERENCES\x1b[0m');
  console.log('\x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('');
  console.log('  Answer y (yes) or n (no) for each feature.');
  console.log('  Press Enter to keep current setting.');
  console.log('');
  
  // Load current preferences
  const loadResult = await loadPreferences(cwd);
  const currentPrefs = loadResult.ok ? loadResult.value : { ...DEFAULT_PREFERENCES };
  const newPrefs = { ...currentPrefs };
  
  // Ask about each key preference
  const questionsOrder: (keyof UserPreferences)[] = [
    'block_mode',  // Ask this first - most important!
    'git_hooks',
    'scan_on_init',
    'browser_patterns',
    'debug_patterns',
    'validity_check',
    'strict_mode',
  ];
  
  for (const key of questionsOrder) {
    const current = currentPrefs[key];
    const currentStr = current ? '\x1b[0;32mON\x1b[0m' : '\x1b[0;90mOFF\x1b[0m';
    const defaultHint = current ? '[Y/n]' : '[y/N]';
    
    console.log(`  \x1b[1;37m${PREFERENCE_NAMES[key]}\x1b[0m`);
    console.log(`  \x1b[2m${PREFERENCE_DESCRIPTIONS[key]}\x1b[0m`);
    
    const answer = await question(`  Currently: ${currentStr} - Change? ${defaultHint}: `);
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      newPrefs[key] = true;
      console.log(`  \x1b[0;32m✓ Turned ON\x1b[0m`);
    } else if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      newPrefs[key] = false;
      console.log(`  \x1b[0;90m○ Turned OFF\x1b[0m`);
    } else {
      console.log(`  \x1b[2m— Kept ${current ? 'ON' : 'OFF'}\x1b[0m`);
    }
    
    console.log('');
  }
  
  rl.close();
  
  // Save preferences
  const saveResult = await savePreferences(cwd, newPrefs);
  
  if (saveResult.ok) {
    console.log('\x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
    out.success('Preferences saved!');
    out.info('Run "ml config" to see all settings');
  } else {
    out.error(`Failed to save: ${saveResult.error.message}`);
    process.exit(1);
  }
}

/**
 * Run interactive setup during ml init
 * Returns the preferences chosen by user
 */
export async function runInitialSetup(cwd: string): Promise<UserPreferences> {
  const readline = await import('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };
  
  console.log('');
  console.log('  \x1b[1;37mLet\'s set up your preferences:\x1b[0m');
  console.log('');
  
  const prefs = { ...DEFAULT_PREFERENCES };
  
  // ============================================================
  // MODE SELECTION (AI SUGGESTION: 4/8 AIs recommended this)
  // ============================================================
  console.log('  \x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('  \x1b[1;37m📊 Choose your security mode:\x1b[0m');
  console.log('');
  console.log('    \x1b[0;33m[1] MONITOR\x1b[0m (recommended for getting started)');
  console.log('        → Warns about secrets but allows commits');
  console.log('        → Great for learning and gradual adoption');
  console.log('');
  console.log('    \x1b[0;31m[2] ENFORCE\x1b[0m (recommended for production)');
  console.log('        → Blocks commits if secrets found');
  console.log('        → Strict security for critical repos');
  console.log('');
  
  const modeAnswer = await question('  Choose mode [1/2] (default: 1 - MONITOR): ');
  
  if (modeAnswer === '2') {
    prefs.block_mode = true;
    console.log('    \x1b[0;31m✓ ENFORCE mode enabled\x1b[0m - commits blocked if secrets found');
  } else {
    prefs.block_mode = false;
    console.log('    \x1b[0;33m✓ MONITOR mode enabled\x1b[0m - warnings only, no blocking');
  }
  console.log('');
  console.log('  \x1b[2mTip: Change anytime with "ml config --set block_mode=on/off"\x1b[0m');
  console.log('  \x1b[2mTip: Override once with "ml gate --enforce" or "ml gate --monitor"\x1b[0m');
  console.log('  \x1b[1;37m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('');
  
  // Additional settings (simplified)
  const questions: { key: keyof UserPreferences; question: string; recommended: boolean }[] = [
    { 
      key: 'git_hooks', 
      question: 'Install Git hooks (pre-commit/pre-push)?', 
      recommended: true 
    },
    { 
      key: 'scan_on_init', 
      question: 'Scan project now for existing issues?', 
      recommended: true 
    },
  ];
  
  for (const q of questions) {
    const hint = q.recommended ? '[Y/n]' : '[y/N]';
    const answer = await question(`  ${q.question} ${hint}: `);
    
    const isYes = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || 
                  (answer === '' && q.recommended);
    
    prefs[q.key] = isYes;
    
    const status = isYes ? '\x1b[0;32m✓ ON\x1b[0m' : '\x1b[0;90m○ OFF\x1b[0m';
    console.log(`    ${status}`);
  }
  
  rl.close();
  console.log('');
  
  // Save preferences
  await savePreferences(cwd, prefs);
  
  return prefs;
}

