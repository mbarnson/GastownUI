#!/usr/bin/env npx ts-node
/**
 * UI Sanity Check Script
 *
 * This script verifies basic UI functionality after code changes.
 * Can be run standalone or invoked by Claude Code with --chrome flag.
 *
 * Usage:
 *   npm run verify:ui           # Run basic checks (build + dev server starts)
 *   claude --chrome             # Run with browser automation for visual verification
 *
 * Checks performed:
 *   1. npm run build succeeds
 *   2. Dev server starts without immediate crash
 *   3. (With --chrome) Header contains Gas Town banner
 *   4. (With --chrome) No React error overlays visible
 *   5. (With --chrome) Main dashboard renders
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkBuild(): boolean {
  log('\n[1/3] Running npm run build...', 'blue');
  try {
    execSync('npm run build', { stdio: 'pipe', timeout: 120000 });
    log('  Build succeeded', 'green');
    return true;
  } catch (error) {
    log('  Build FAILED', 'red');
    if (error instanceof Error && 'stderr' in error) {
      console.error((error as any).stderr?.toString().slice(-500));
    }
    return false;
  }
}

function checkDevServerStarts(): Promise<boolean> {
  log('\n[2/3] Checking dev server starts...', 'blue');

  return new Promise((resolve) => {
    const devServer = spawn('npm', ['run', 'dev'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });

    let output = '';
    let hasError = false;
    const timeout = setTimeout(() => {
      devServer.kill();
      if (!hasError) {
        log('  Dev server started (no immediate crash)', 'green');
        resolve(true);
      } else {
        resolve(false);
      }
    }, 10000);

    devServer.stdout?.on('data', (data) => {
      output += data.toString();
      // Check for successful startup indicators
      if (output.includes('ready in') || output.includes('Local:')) {
        clearTimeout(timeout);
        devServer.kill();
        log('  Dev server ready', 'green');
        resolve(true);
      }
    });

    devServer.stderr?.on('data', (data) => {
      const errorText = data.toString();
      // Look for fatal errors (not just warnings)
      if (errorText.includes('Error:') || errorText.includes('FATAL')) {
        hasError = true;
        log('  Dev server error detected:', 'red');
        console.error(errorText.slice(-500));
      }
    });

    devServer.on('exit', (code) => {
      clearTimeout(timeout);
      if (code !== null && code !== 0) {
        log(`  Dev server exited with code ${code}`, 'red');
        resolve(false);
      }
    });
  });
}

function checkRequiredFiles(): boolean {
  log('\n[3/3] Checking required files exist...', 'blue');

  const requiredFiles = [
    'public/gastown-banner.jpg',
    'src/contexts/SidebarModeContext.tsx',
    'src/components/Header.tsx',
    'src/routes/__root.tsx',
  ];

  let allExist = true;
  for (const file of requiredFiles) {
    if (existsSync(file)) {
      log(`  ${file}`, 'green');
    } else {
      log(`  MISSING: ${file}`, 'red');
      allExist = false;
    }
  }

  return allExist;
}

async function main() {
  log('=== GastownUI Sanity Check ===', 'yellow');
  log('Verifying UI functionality after code changes\n');

  const results = {
    build: false,
    devServer: false,
    files: false,
  };

  // Check required files first (fast)
  results.files = checkRequiredFiles();

  // Check build
  results.build = checkBuild();
  if (!results.build) {
    log('\nBUILD FAILED - Fix build errors before continuing', 'red');
    process.exit(1);
  }

  // Check dev server starts
  results.devServer = await checkDevServerStarts();
  if (!results.devServer) {
    log('\nDEV SERVER FAILED - App crashes on startup', 'red');
    process.exit(1);
  }

  // Summary
  log('\n=== Results ===', 'yellow');
  log(`  Build:      ${results.build ? 'PASS' : 'FAIL'}`, results.build ? 'green' : 'red');
  log(`  Dev Server: ${results.devServer ? 'PASS' : 'FAIL'}`, results.devServer ? 'green' : 'red');
  log(`  Files:      ${results.files ? 'PASS' : 'WARN'}`, results.files ? 'green' : 'yellow');

  if (results.build && results.devServer) {
    log('\nBasic sanity checks PASSED', 'green');
    log('For visual verification, run: claude --chrome', 'blue');
    process.exit(0);
  } else {
    log('\nSanity checks FAILED - DO NOT COMPLETE WORK', 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Verification script error:', error);
  process.exit(1);
});
