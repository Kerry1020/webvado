#!/usr/bin/env node

/**
 * WebVado Toolchain Checker
 * Verifies that required FPGA development tools are installed
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

const TOOLS = [
  {
    name: 'Icarus Verilog',
    command: 'iverilog',
    versionCmd: 'iverilog -V',
    versionRegex: /Icarus Verilog version ([\d.]+)/,
    minVersion: '11.0',
    required: true,
    purpose: 'Verilog compilation and simulation'
  },
  {
    name: 'Verilator',
    command: 'verilator',
    versionCmd: 'verilator --version',
    versionRegex: /Verilator ([\d.]+)/,
    minVersion: '5.0',
    required: false,
    purpose: 'Fast simulation and linting'
  },
  {
    name: 'Yosys',
    command: 'yosys',
    versionCmd: 'yosys -V',
    versionRegex: /Yosys ([\d.]+)/,
    minVersion: '0.33',
    required: false,
    purpose: 'RTL synthesis (Level 3)'
  },
  {
    name: 'nextpnr (iCE40)',
    command: 'nextpnr-ice40',
    versionCmd: 'nextpnr-ice40 --version',
    versionRegex: /nextpnr.*?([\d.]+)/,
    minVersion: '0.5',
    required: false,
    purpose: 'FPGA place & route for iCE40 (Level 3)'
  },
  {
    name: 'icepack',
    command: 'icepack',
    versionCmd: 'icepack -h',
    versionRegex: null, // No version in output
    minVersion: null,
    required: false,
    purpose: 'iCE40 bitstream generation (Level 3)'
  }
];

function checkCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getVersion(versionCmd, regex) {
  try {
    const output = execSync(versionCmd, { encoding: 'utf8', stderr: 'pipe' });
    if (!regex) return null;
    const match = output.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

function checkTool(tool) {
  const exists = checkCommand(tool.command);
  
  if (!exists) {
    return {
      ...tool,
      status: 'missing',
      installed: false,
      version: null,
      versionOk: false
    };
  }
  
  const version = getVersion(tool.versionCmd, tool.versionRegex);
  let versionOk = true;
  
  if (version && tool.minVersion) {
    versionOk = compareVersions(version, tool.minVersion) >= 0;
  }
  
  return {
    ...tool,
    status: versionOk ? 'ok' : 'outdated',
    installed: true,
    version: version || 'unknown',
    versionOk
  };
}

function printResults(results) {
  console.log('\n' + chalk.bold.blue('━'.repeat(80)));
  console.log(chalk.bold.blue('  WebVado Toolchain Check'));
  console.log(chalk.bold.blue('━'.repeat(80)) + '\n');
  
  let requiredOk = true;
  let optionalCount = 0;
  let optionalInstalled = 0;
  
  results.forEach(result => {
    const icon = result.status === 'ok' ? '✓' :
                 result.status === 'outdated' ? '⚠' : '✗';
    
    const color = result.status === 'ok' ? chalk.green :
                  result.status === 'outdated' ? chalk.yellow : chalk.red;
    
    const statusText = result.installed 
      ? `v${result.version}${!result.versionOk ? ' (outdated)' : ''}`
      : 'NOT FOUND';
    
    console.log(`${color(icon)} ${chalk.bold(result.name.padEnd(25))} ${statusText}`);
    console.log(`   ${chalk.gray(result.purpose)}`);
    
    if (result.required) {
      if (!result.installed || !result.versionOk) {
        requiredOk = false;
      }
    } else {
      optionalCount++;
      if (result.installed && result.versionOk) {
        optionalInstalled++;
      }
    }
    
    console.log('');
  });
  
  console.log(chalk.bold.blue('━'.repeat(80)));
  
  if (requiredOk) {
    console.log(chalk.green.bold('\n✓ All required tools are installed and up-to-date!'));
    console.log(chalk.gray(`  Optional tools: ${optionalInstalled}/${optionalCount} installed\n`));
  } else {
    console.log(chalk.red.bold('\n✗ Some required tools are missing or outdated\n'));
  }
  
  return requiredOk;
}

function printInstallInstructions() {
  console.log(chalk.bold.yellow('\nInstallation Instructions:\n'));
  
  console.log(chalk.bold('macOS (Homebrew):'));
  console.log(chalk.gray('  brew install icarus-verilog verilator yosys icestorm\n'));
  
  console.log(chalk.bold('Ubuntu/Debian:'));
  console.log(chalk.gray('  sudo apt-get install iverilog verilator yosys fpga-icestorm\n'));
  
  console.log(chalk.bold('Fedora:'));
  console.log(chalk.gray('  sudo dnf install iverilog verilator yosys icestorm\n'));
  
  console.log(chalk.bold('Arch Linux:'));
  console.log(chalk.gray('  sudo pacman -S iverilog verilator yosys icestorm-git\n'));
  
  console.log(chalk.bold('Windows:'));
  console.log(chalk.gray('  Use WSL2 with Ubuntu, or download precompiled binaries\n'));
  
  console.log(chalk.gray('For more details, visit: https://github.com/yourusername/webvado/wiki/Toolchain-Setup\n'));
}

// Run checks
console.log(chalk.gray('\nChecking FPGA development tools...\n'));

const results = TOOLS.map(checkTool);
const success = printResults(results);

if (!success) {
  printInstallInstructions();
  process.exit(1);
}

process.exit(0);
