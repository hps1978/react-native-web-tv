#!/usr/bin/env node

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    patchDir: null,
    threeWay: true
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--patch-dir') {
      args.patchDir = argv[i + 1];
      i += 1;
    } else if (token === '--no-3way') {
      args.threeWay = false;
    }
  }

  return args;
}

function run(command) {
  return execSync(command, { stdio: ['inherit', 'pipe', 'inherit'] })
    .toString()
    .trim();
}

function ensureCleanWorkingTree() {
  const status = run('git status --porcelain');
  if (status.length > 0) {
    console.error(
      'Working tree is not clean. Commit or stash changes before replaying patches.'
    );
    process.exit(1);
  }
}

function getPatchFiles(patchDir) {
  const absolutePatchDir = path.resolve(patchDir);

  if (
    !fs.existsSync(absolutePatchDir) ||
    !fs.statSync(absolutePatchDir).isDirectory()
  ) {
    console.error(`Patch directory not found: ${patchDir}`);
    process.exit(1);
  }

  const patchFiles = fs
    .readdirSync(absolutePatchDir)
    .filter((fileName) => fileName.endsWith('.patch'))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(absolutePatchDir, fileName));

  if (patchFiles.length === 0) {
    console.error(`No .patch files found in: ${patchDir}`);
    process.exit(1);
  }

  return patchFiles;
}

function main() {
  const { patchDir, threeWay } = parseArgs(process.argv);

  if (!patchDir) {
    console.error(
      'Usage: npm run patches:replay -- --patch-dir <path-to-patches> [--no-3way]'
    );
    process.exit(1);
  }

  const rootDir = run('git rev-parse --show-toplevel');
  process.chdir(rootDir);
  ensureCleanWorkingTree();
  const patchFiles = getPatchFiles(patchDir);

  const command = ['git am'];
  if (threeWay) {
    command.push('--3way');
  }
  command.push(...patchFiles.map((file) => `"${file}"`));

  execSync(command.join(' '), { stdio: 'inherit' });

  console.log('');
  console.log('Patch replay completed successfully.');
}

main();
