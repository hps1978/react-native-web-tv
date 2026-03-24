#!/usr/bin/env node

'use strict';

const execSync = require('child_process').execSync;
const fs = require('fs');
const glob = require('glob');
const minimist = require('minimist');
const os = require('os');
const path = require('path');

const rootPackageJson = require('../package.json');

const RELEASE_BRANCH = 'master';
const INTERNAL_PUBLISH_PACKAGE_NAMES = [
  'babel-plugin-react-native-web',
  'react-native-web'
];
const PUBLIC_PACKAGE_NAMES = {
  'babel-plugin-react-native-web': 'babel-plugin-react-native-web-tv',
  'react-native-web': 'react-native-web-tv'
};

const args = process.argv.slice(2);
const argv = minimist(args);

const version = argv._[0];
const skipGit = argv['skip-git'];
const oneTimeCode = argv.otp;
const publishTag = argv.tag;
const dryRun = argv['dry-run'] || false;
// Entry point selection
const entry = argv.entry; // 'plugin' or 'main' only

console.log(`Release workflow repo: ${rootPackageJson.name}`);
console.log(`Requested publish version: ${version}`);

function run(command, options = {}) {
  if (dryRun) {
    console.log(`[dry-run] Would run: ${command}`);
    return '';
  }
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

// Ensure prerequisites are met
// 1. Version argument is provided
// 2. Working tree is clean (no unstaged changes)
// 3. On the correct release branch (e.g., master/main) if not skipping git steps

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

// Collect workspace package manifests once, then derive publishable targets.
const workspaces = rootPackageJson.workspaces.reduce((acc, w) => {
  const resolvedPaths = glob.sync(w);
  resolvedPaths.forEach((p) => {
    const directory = path.resolve(p);
    const packageJsonPath = path.join(directory, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, { encoding: 'utf-8' })
    );
    if (packageJson.name && !acc.some((ws) => ws.directory === directory)) {
      acc.push({ directory, packageJson, packageJsonPath });
    }
  });
  return acc;
}, []);

// Only the internal core package is published; it is renamed in a staging dir.
const publishWorkspaces = workspaces.filter(({ packageJson }) =>
  INTERNAL_PUBLISH_PACKAGE_NAMES.includes(packageJson.name)
);

// Only these packages need their dependencies on published TV packages updated.
// Update this list if you add/remove packages that depend on react-native-web-tv or babel-plugin-react-native-web-tv.
const PUBLISHED_DEPENDENCY_CONSUMERS = [
  'react-native-web-tv-examples',
  'benchmarks'
];

// Keep release-visible workspace package versions aligned even if they are private.
const versionTrackedWorkspaces = workspaces.filter(
  ({ packageJson }) => packageJson.version !== '0.0.0'
);

if (publishWorkspaces.length === 0) {
  console.error('No publishable workspaces found.');
  process.exit(1);
}

console.log('Publish targets:');
publishWorkspaces.forEach(({ directory, packageJson }) => {
  console.log(
    `- ${packageJson.name} => ${
      PUBLIC_PACKAGE_NAMES[packageJson.name]
    } -> ${path.relative(process.cwd(), directory)}`
  );
});

function createPublishDirectory(directory, packageJson) {
  const publishDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), `${packageJson.name.replace(/[^a-z0-9-]/gi, '-')}-`)
  );

  // Publish from a temporary copy so the repo keeps the upstream package name.
  fs.cpSync(directory, publishDirectory, {
    recursive: true,
    filter: (source) => {
      const relativePath = path.relative(directory, source);

      if (relativePath === '') {
        return true;
      }

      return !relativePath.split(path.sep).includes('node_modules');
    }
  });

  const stagedPackageJsonPath = path.join(publishDirectory, 'package.json');
  const stagedPackageJson = JSON.parse(
    fs.readFileSync(stagedPackageJsonPath, { encoding: 'utf-8' })
  );

  // Rewrite only the public package identity for npm publication.
  stagedPackageJson.name = PUBLIC_PACKAGE_NAMES[packageJson.name];

  fs.writeFileSync(
    stagedPackageJsonPath,
    JSON.stringify(stagedPackageJson, null, 2) + '\n'
  );

  return publishDirectory;
}

// Update all workspace versions together and keep internal version references in sync.

const publishedNames = Object.values(PUBLIC_PACKAGE_NAMES);
versionTrackedWorkspaces.forEach(
  ({ directory, packageJson, packageJsonPath }) => {
    packageJson.version = version;
    // Only update dependencies for examples and benchmarks packages
    const pkgName = packageJson.name;
    if (PUBLISHED_DEPENDENCY_CONSUMERS.includes(pkgName)) {
      publishedNames.forEach((name) => {
        if (packageJson.dependencies && packageJson.dependencies[name]) {
          packageJson.dependencies[name] = version;
        }
        if (packageJson.devDependencies && packageJson.devDependencies[name]) {
          packageJson.devDependencies[name] = version;
        }
        if (
          packageJson.peerDependencies &&
          packageJson.peerDependencies[name]
        ) {
          packageJson.peerDependencies[name] = version;
        }
        if (
          packageJson.optionalDependencies &&
          packageJson.optionalDependencies[name]
        ) {
          packageJson.optionalDependencies[name] = version;
        }
      });
    }
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2) + '\n'
    );
  }
);

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

async function publishPluginOnly() {
  // Only publish the plugin
  const pluginWorkspace = publishWorkspaces.find(
    ({ packageJson }) => packageJson.name === 'babel-plugin-react-native-web'
  );
  if (!pluginWorkspace) {
    console.error('No plugin workspace found.');
    process.exit(1);
  }
  const { directory, packageJson } = pluginWorkspace;
  const otpArg = oneTimeCode ? ` --otp ${oneTimeCode}` : '';
  const tagArg = resolvedPublishTag ? ` --tag ${resolvedPublishTag}` : '';
  const publishDirectory = createPublishDirectory(directory, packageJson);
  const publicPackageName = PUBLIC_PACKAGE_NAMES[packageJson.name];
  console.log(
    `Publishing workspace package ${publicPackageName}@${
      packageJson.version
    } from ${path.relative(process.cwd(), directory)}`
  );
  if (!dryRun) {
    execSync(`npm publish${tagArg}${otpArg}`, {
      cwd: publishDirectory,
      stdio: 'inherit'
    });
  } else {
    console.log(
      `[dry-run] Would publish ${publicPackageName}@${packageJson.version}`
    );
  }
  // No polling here; just publish and exit
}

async function publishMainOnly() {
  // Check plugin availability first
  const pluginWorkspace = publishWorkspaces.find(
    ({ packageJson }) => packageJson.name === 'babel-plugin-react-native-web'
  );
  if (!pluginWorkspace) {
    console.error('No plugin workspace found.');
    process.exit(1);
  }
  const pluginPublicName =
    PUBLIC_PACKAGE_NAMES[pluginWorkspace.packageJson.name];
  const pluginVersion = pluginWorkspace.packageJson.version;
  // Check immediately (fail fast)
  try {
    const result = dryRun
      ? pluginVersion
      : execSync(`npm view ${pluginPublicName}@${pluginVersion} version`, {
          stdio: ['ignore', 'pipe', 'ignore']
        })
          .toString()
          .trim();
    if (result !== pluginVersion) {
      throw new Error('Version mismatch');
    }
  } catch (e) {
    console.error(
      `ERROR: ${pluginPublicName}@${pluginVersion} is NOT available on npm. Aborting main package publish.`
    );
    process.exit(1);
  }
  // Only run npm install after plugin is confirmed available
  execSync('npm install', { stdio: 'inherit' });

  // Publish main package
  const mainWorkspace = publishWorkspaces.find(
    ({ packageJson }) => packageJson.name === 'react-native-web'
  );
  if (!mainWorkspace) {
    console.error('No main workspace found.');
    process.exit(1);
  }
  const { directory, packageJson } = mainWorkspace;
  const otpArg = oneTimeCode ? ` --otp ${oneTimeCode}` : '';
  const tagArg = resolvedPublishTag ? ` --tag ${resolvedPublishTag}` : '';
  const publishDirectory = createPublishDirectory(directory, packageJson);
  const publicPackageName = PUBLIC_PACKAGE_NAMES[packageJson.name];
  console.log(
    `Publishing workspace package ${publicPackageName}@${
      packageJson.version
    } from ${path.relative(process.cwd(), directory)}`
  );
  if (!dryRun) {
    execSync(`npm publish${tagArg}${otpArg}`, {
      cwd: publishDirectory,
      stdio: 'inherit'
    });
  } else {
    console.log(
      `[dry-run] Would publish ${publicPackageName}@${packageJson.version}`
    );
  }
}

async function main() {
  if (entry === 'plugin') {
    await publishPluginOnly();
  } else if (entry === 'main') {
    await publishMainOnly();
  } else {
    console.error('Invalid entry point. Use --entry=plugin or --entry=main');
    process.exit(1);
  }
}

main();

// Push changes
if (!skipGit) {
  execSync(`git push --tags origin ${RELEASE_BRANCH}`, { stdio: 'inherit' });
}
