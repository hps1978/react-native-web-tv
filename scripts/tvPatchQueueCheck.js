#!/usr/bin/env node

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    base: null,
    head: 'tv-main',
    patchDir: null,
    requireClean: false
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--base') {
      args.base = argv[i + 1];
      i += 1;
    } else if (token === '--head') {
      args.head = argv[i + 1];
      i += 1;
    } else if (token === '--patch-dir') {
      args.patchDir = argv[i + 1];
      i += 1;
    } else if (token === '--require-clean') {
      args.requireClean = true;
    }
  }

  return args;
}

function run(command) {
  return execSync(command, { stdio: ['inherit', 'pipe', 'inherit'] })
    .toString()
    .trim();
}

function hasRef(ref) {
  try {
    run(`git rev-parse --verify ${ref}^{commit}`);
    return true;
  } catch (error) {
    return false;
  }
}

function branchExists(branchName) {
  try {
    run(`git show-ref --verify refs/heads/${branchName}`);
    return true;
  } catch (error) {
    return false;
  }
}

function remoteExists(remoteName) {
  const remotes = run('git remote').split('\n').filter(Boolean);
  return remotes.includes(remoteName);
}

function listPatchFiles(patchDir) {
  const absolutePatchDir = path.resolve(patchDir);
  if (
    !fs.existsSync(absolutePatchDir) ||
    !fs.statSync(absolutePatchDir).isDirectory()
  ) {
    return { ok: false, reason: `Patch directory not found: ${patchDir}` };
  }

  const patchFiles = fs
    .readdirSync(absolutePatchDir)
    .filter((fileName) => fileName.endsWith('.patch'))
    .sort((a, b) => a.localeCompare(b));

  if (patchFiles.length === 0) {
    return { ok: false, reason: `No .patch files found in: ${patchDir}` };
  }

  return { ok: true, count: patchFiles.length, absolutePatchDir };
}

function main() {
  const args = parseArgs(process.argv);
  const failures = [];

  const rootDir = run('git rev-parse --show-toplevel');
  process.chdir(rootDir);

  const currentBranch = run('git rev-parse --abbrev-ref HEAD');
  const status = run('git status --porcelain');

  console.log(`Repository root: ${rootDir}`);
  console.log(`Current branch: ${currentBranch}`);

  if (!remoteExists('upstream')) {
    failures.push(
      'Missing upstream remote. Run: git remote add upstream https://github.com/necolas/react-native-web.git'
    );
  } else {
    console.log('OK: upstream remote exists');
  }

  if (!branchExists('tv-main')) {
    failures.push('Missing local branch: tv-main');
  } else {
    console.log('OK: tv-main branch exists');
  }

  if (!branchExists('upstream-mirror')) {
    failures.push('Missing local branch: upstream-mirror');
  } else {
    console.log('OK: upstream-mirror branch exists');
  }

  if (args.requireClean && status.length > 0) {
    failures.push('Working tree is not clean. Commit or stash changes.');
  }

  if (args.base) {
    if (!hasRef(args.base)) {
      failures.push(`Invalid base ref: ${args.base}`);
    }
    if (!hasRef(args.head)) {
      failures.push(`Invalid head ref: ${args.head}`);
    }

    if (hasRef(args.base) && hasRef(args.head)) {
      const commitCount = run(
        `git rev-list --count ${args.base}..${args.head}`
      );
      console.log(
        `OK: refs valid (${args.base}..${args.head}), commits in range: ${commitCount}`
      );
      if (commitCount === '0') {
        failures.push(`No commits found between ${args.base} and ${args.head}`);
      }
    }
  }

  if (args.patchDir) {
    const patchInfo = listPatchFiles(args.patchDir);
    if (!patchInfo.ok) {
      failures.push(patchInfo.reason);
    } else {
      console.log(
        `OK: patch directory ${patchInfo.absolutePatchDir} (${patchInfo.count} patch files)`
      );
    }
  }

  if (failures.length > 0) {
    console.error('');
    console.error('Patch queue preflight failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log('');
  console.log('Patch queue preflight checks passed.');
}

main();
