#!/usr/bin/env node

'use strict';

const execSync = require('child_process').execSync;
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'packages/react-native-web-docs/dist');

function run(command, options = {}) {
  execSync(command, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    ...options
  });
}

function runOutput(command) {
  return execSync(command, {
    cwd: ROOT_DIR,
    stdio: ['ignore', 'pipe', 'inherit']
  })
    .toString()
    .trim();
}

function stageDocsArtifacts() {
  // Stage everything in gh-pages working tree after replacing docs artifacts.
  run('git add -A .');
}

function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(
      `Docs build output not found at ${path.relative(
        ROOT_DIR,
        DIST_DIR
      )}. Run docs build first.`
    );
    process.exit(1);
  }

  const startBranch = runOutput('git rev-parse --abbrev-ref HEAD');
  let switchedBranch = false;

  try {
    if (startBranch !== 'gh-pages') {
      run('git checkout gh-pages');
      switchedBranch = true;
    }

    run('rm -rf ./docs ./index.html ./404.html ./static');
    run('cp -R packages/react-native-web-docs/dist/. ./');

    stageDocsArtifacts();

    const hasStagedChanges =
      runOutput('git diff --cached --name-only').length > 0;

    if (!hasStagedChanges) {
      console.log('No docs changes to deploy.');
      return;
    }

    run('git commit -m "Deploy documentation"');
    run('git push origin gh-pages');
  } finally {
    if (switchedBranch) {
      run(`git checkout ${startBranch}`);
    }
  }
}

main();
