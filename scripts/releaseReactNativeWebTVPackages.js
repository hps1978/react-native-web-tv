#!/usr/bin/env node

'use strict';

const execSync = require('child_process').execSync;
const fs = require('fs');
const glob = require('glob');
const minimist = require('minimist');
const path = require('path');

const RELEASE_BRANCH = 'master';
const args = process.argv.slice(2);
const argv = minimist(args);

const version = argv._[0];
const skipGit = argv['skip-git'];
const oneTimeCode = argv.otp;
const publishTag = argv.tag;

console.log(`Publishing react-native-web-tv@${version}`);

function run(command, options = {}) {
  return execSync(command, {
    stdio: ['inherit', 'pipe', 'inherit'],
    ...options
  })
    .toString()
    .trim();
}

function ensureVersionProvided() {
  if (!version) {
    console.error(
      'Usage: npm run release -- <version> [--otp=<otp-code>] [--tag=<dist-tag>] [--skip-git]'
    );
    process.exit(1);
  }
}

function ensureCleanWorkingTree() {
  const status = run('git status --porcelain');
  if (status.length > 0) {
    console.error(
      'Working tree is not clean. Commit or stash changes before running release.'
    );
    process.exit(1);
  }
}

function ensureReleaseBranch() {
  const currentBranch = run('git rev-parse --abbrev-ref HEAD');
  if (currentBranch !== RELEASE_BRANCH) {
    console.error(
      `Release must be run from ${RELEASE_BRANCH}. Current branch: ${currentBranch}`
    );
    process.exit(1);
  }
}

ensureVersionProvided();
ensureCleanWorkingTree();
ensureReleaseBranch();

let resolvedPublishTag = publishTag;
// Default to 'beta' dist tag for prerelease versions if not explicitly provided.
// We want to support only 'beta' and 'latest' dist-tags to keep it simple for now.
if (!publishTag || publishTag !== 'latest') {
  resolvedPublishTag = 'beta';
  console.log(
    `Detected prerelease version (${version}); defaulting npm dist-tag to "${resolvedPublishTag}".`
  );
}
// Collect 'react-native-web' workspaces and package manifests
// NOTE: we don't look for 'react-native-web-tv' in path as the folder names
// remain the same, even though the pacakge names have been updated with '-tv'
const workspacePaths = require('../package.json').workspaces.reduce(
  (acc, w) => {
    const resolvedPaths = glob.sync(w);
    resolvedPaths.forEach((p) => {
      // Remove duplicates and unrelated packages
      if (p.includes('react-native-web') && acc.indexOf(p) === -1) {
        acc.push(p);
      }
    });
    return acc;
  },
  []
);

const workspaces = workspacePaths.map((dir) => {
  const directory = path.resolve(dir);
  const packageJsonPath = path.join(directory, 'package.json');
  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, { encoding: 'utf-8' })
  );
  return { directory, packageJson, packageJsonPath };
});

// Update each package version and its dependencies
const workspaceNames = workspaces.map(({ packageJson }) => packageJson.name);
workspaces.forEach(({ directory, packageJson, packageJsonPath }) => {
  packageJson.version = version;
  workspaceNames.forEach((name) => {
    if (packageJson.dependencies && packageJson.dependencies[name]) {
      packageJson.dependencies[name] = version;
    }
    if (packageJson.devDependencies && packageJson.devDependencies[name]) {
      packageJson.devDependencies[name] = version;
    }
  });
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n'
  );
});

execSync('npm install', { stdio: 'inherit' });

// Commit changes
if (!skipGit) {
  // add changes
  execSync('git add .', { stdio: 'inherit' });
  // commit
  execSync(`git commit -m "${version}" --no-verify`, { stdio: 'inherit' });
  // tag
  execSync(`git tag -fam ${version} "${version}"`, { stdio: 'inherit' });
}

// Publish public packages
workspaces.forEach(({ directory, packageJson }) => {
  if (!packageJson.private) {
    const otpArg = oneTimeCode ? `--otp ${oneTimeCode}` : '';
    const tagArg = resolvedPublishTag ? `--tag ${resolvedPublishTag}` : '';
    execSync(`cd ${directory} && npm publish ${tagArg} ${otpArg}`, {
      stdio: 'inherit'
    });
  }
});

// Push changes
if (!skipGit) {
  execSync(`git push --tags origin ${RELEASE_BRANCH}`, { stdio: 'inherit' });
}
