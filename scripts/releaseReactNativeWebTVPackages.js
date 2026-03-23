#!/usr/bin/env node

'use strict';

const execSync = require('child_process').execSync;
const fs = require('fs');
const glob = require('glob');
const minimist = require('minimist');
const os = require('os');
const path = require('path');

const RELEASE_BRANCH = 'master';
const INTERNAL_PUBLISH_PACKAGE_NAMES = [
  'babel-plugin-react-native-web',
  'react-native-web'
];
const PUBLIC_PACKAGE_NAMES = {
  'react-native-web': 'react-native-web-tv',
  'babel-plugin-react-native-web': 'babel-plugin-react-native-web-tv'
};

const args = process.argv.slice(2);
const argv = minimist(args);

const version = argv._[0];
const skipGit = argv['skip-git'];
const oneTimeCode = argv.otp;
const publishTag = argv.tag;
const dryRun = argv['dry-run'] || false;
const rootPackageJson = require('../package.json');

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
      if (packageJson.name && acc.indexOf(p) === -1) {
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

// Publish plugin first, then poll for availability, then publish main package
async function pollNpmForVersion(
  pkg,
  version,
  maxAttempts = 24,
  delayMs = 5000
) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      const result = dryRun
        ? version
        : execSync(`npm view ${pkg}@${version} version`, {
            stdio: ['ignore', 'pipe', 'ignore']
          })
            .toString()
            .trim();
      if (result === version) {
        console.log(`\n${pkg}@${version} is now available on npm.`);
        return true;
      }
    } catch (e) {
      // Not available yet
    }
    attempts++;
    console.log(
      `Waiting for ${pkg}@${version} to be available on npm... (${attempts}/${maxAttempts})`
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  console.error(
    `\nERROR: ${pkg}@${version} did not appear on npm after ${
      (maxAttempts * delayMs) / 1000
    } seconds.`
  );
  process.exit(1);
}

async function main() {
  // Publish plugin first
  const pluginWorkspace = publishWorkspaces.find(
    ({ packageJson }) => packageJson.name === 'babel-plugin-react-native-web'
  );
  if (pluginWorkspace) {
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
    // Poll for availability
    await pollNpmForVersion(publicPackageName, packageJson.version);
  }

  // Publish main package
  const mainWorkspace = publishWorkspaces.find(
    ({ packageJson }) => packageJson.name === 'react-native-web'
  );
  if (mainWorkspace) {
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
}

main();

// Push changes
if (!skipGit) {
  execSync(`git push --tags origin ${RELEASE_BRANCH}`, { stdio: 'inherit' });
}
