#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i += 1;
    }
  }
  return args;
}

function parseListArg(value) {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function validatePattern(pattern) {
  if (pattern.includes('..')) {
    throw new Error(`Pattern must not contain '..': ${pattern}`);
  }
}

function buildExclusionPathspecs(packageName, excludePatterns) {
  return excludePatterns.map((pattern) => {
    const fullPath = path.posix.join('node_modules', packageName, pattern);
    return `:!${fullPath}`;
  });
}

function ensureDirectory(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function run(command, cwd) {
  return execSync(command, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'benchmark-patch-bot',
      GIT_AUTHOR_EMAIL: 'benchmark-patch-bot@example.com',
      GIT_COMMITTER_NAME: 'benchmark-patch-bot',
      GIT_COMMITTER_EMAIL: 'benchmark-patch-bot@example.com'
    }
  })
    .toString()
    .trim();
}

function copyDirectory(sourceDir, targetDir) {
  ensureDirectory(path.dirname(targetDir));
  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    force: true
  });
}

function quotePathspec(pathspec) {
  return `'${pathspec.replace(/'/g, "'\\''")}'`;
}

function main() {
  const args = parseArgs(process.argv);
  const packageName = args.package;
  const sourceDir = args.source && path.resolve(args.source);
  const installedDir = args.installed && path.resolve(args.installed);
  const patchDir = args['patch-dir']
    ? path.resolve(args['patch-dir'])
    : path.resolve('patches');
  const includePaths = parseListArg(args.include);
  const excludePatterns = parseListArg(args.exclude);

  if (!packageName || !sourceDir || !installedDir) {
    console.error(
      'Usage: node ./scripts/createPackagePatch.mjs --package <name> --source <dir> --installed <dir> --patch-dir <dir> [--include <path1,path2,...>] [--exclude <pattern1,pattern2,...>]'
    );
    process.exit(1);
  }

  if (includePaths.length > 0 && excludePatterns.length > 0) {
    console.error('Cannot use --include and --exclude together');
    process.exit(1);
  }

  try {
    excludePatterns.forEach(validatePattern);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(installedDir)) {
    console.error(`Installed package directory not found: ${installedDir}`);
    process.exit(1);
  }

  const installedPackageJson = JSON.parse(
    fs.readFileSync(path.join(installedDir, 'package.json'), 'utf8')
  );
  const version = installedPackageJson.version;
  const patchFile = path.join(patchDir, `${packageName}+${version}.patch`);

  ensureDirectory(patchDir);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-patch-'));
  const repoDir = path.join(tempRoot, 'repo');
  const baselinePath = path.join(repoDir, 'node_modules', packageName);

  try {
    ensureDirectory(repoDir);
    run('git init', repoDir);

    copyDirectory(sourceDir, baselinePath);
    run('git add .', repoDir);
    run('git commit -m "baseline"', repoDir);

    fs.rmSync(baselinePath, { recursive: true, force: true });
    copyDirectory(installedDir, baselinePath);

    let pathspecs = [path.posix.join('node_modules', packageName)];

    if (includePaths.length > 0) {
      pathspecs = includePaths.map((includePath) =>
        path.posix.join('node_modules', packageName, includePath)
      );
    } else if (excludePatterns.length > 0) {
      const exclusions = buildExclusionPathspecs(packageName, excludePatterns);
      pathspecs = [...pathspecs, ...exclusions];
    }

    const diffOutput = run(
      `git diff --binary -- ${pathspecs.map(quotePathspec).join(' ')}`,
      repoDir
    );

    if (!diffOutput) {
      if (fs.existsSync(patchFile)) {
        console.log(
          `No changes detected for ${packageName}; keeping existing patch at ${patchFile}.`
        );
      } else {
        console.log(`No changes detected for ${packageName}; no patch generated.`);
      }
      return;
    }

    fs.writeFileSync(patchFile, `${diffOutput}\n`, 'utf8');
    console.log(`Created patch: ${patchFile}`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main();
