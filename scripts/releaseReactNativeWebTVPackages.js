#!/usr/bin/env node

'use strict';

const execSync = require('child_process').execSync;
const fs = require('fs');
const glob = require('glob');
const minimist = require('minimist');
const path = require('path');

const RELEASE_BRANCH = 'master';
const PUBLISH_PACKAGE_NAMES = ['@hps1978/react-native-web-tv'];

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

function isPrereleaseVersion(value) {
  return /-/.test(value);
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
if (!skipGit) {
  ensureReleaseBranch();
}

let resolvedPublishTag = publishTag;
if (isPrereleaseVersion(version) && !resolvedPublishTag) {
  resolvedPublishTag = 'beta';
  console.log(
    `Detected prerelease version (${version}); defaulting npm dist-tag to "${resolvedPublishTag}".`
  );
}

// Collect explicitly publishable workspaces and their package manifests
const workspacePaths = require('../package.json').workspaces.reduce(
  (acc, w) => {
    const resolvedPaths = glob.sync(w);
    resolvedPaths.forEach((p) => {
      const packageJsonPath = path.join(path.resolve(p), 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return;
      }
      const packageJson = JSON.parse(
        fs.readFileSync(packageJsonPath, { encoding: 'utf-8' })
      );
      if (
        PUBLISH_PACKAGE_NAMES.includes(packageJson.name) &&
        acc.indexOf(p) === -1
      ) {
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

if (workspaces.length === 0) {
  console.error('No publishable workspaces found.');
  process.exit(1);
}

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
  // commit only when there are staged changes
  const stagedFiles = run('git diff --cached --name-only');
  if (stagedFiles.length > 0) {
    execSync(`git commit -m "${version}" --no-verify`, { stdio: 'inherit' });
  } else {
    console.log('No version changes to commit; continuing with tag/publish.');
  }
  // tag
  execSync(`git tag -fam ${version} "${version}"`, { stdio: 'inherit' });
}

// Publish public packages
workspaces.forEach(({ directory, packageJson }) => {
  if (!packageJson.private) {
    const otpArg = oneTimeCode ? ` --otp ${oneTimeCode}` : '';
    const tagArg = resolvedPublishTag ? ` --tag ${resolvedPublishTag}` : '';
    execSync(`npm publish${tagArg}${otpArg}`, {
      cwd: directory,
      stdio: 'inherit'
    });
  }
});

// Push changes
if (!skipGit) {
  execSync(`git push --tags origin ${RELEASE_BRANCH}`, { stdio: 'inherit' });
}
