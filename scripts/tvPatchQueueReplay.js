#!/usr/bin/env node

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const tar = require('tar');
const { verifyChecksum } = require('./patchChecksum');

// Find the latest patch archive (.tar.gz) and checksum
function findLatestPatchArchive(rootDir) {
  const patchesRoot = path.join(rootDir, 'patches');
  if (!fs.existsSync(patchesRoot)) return null;
  const archives = fs
    .readdirSync(patchesRoot)
    .filter((f) => /^([0-9a-f]+)-to-([0-9a-f]+)\.tar\.gz$/.test(f))
    .map((f) => {
      const archivePath = path.join(patchesRoot, f);
      return {
        archivePath,
        checksumPath: archivePath + '.sha256',
        mtime: fs.statSync(archivePath).mtimeMs
      };
    })
    .filter(({ checksumPath }) => fs.existsSync(checksumPath))
    .sort((a, b) => b.mtime - a.mtime);
  return archives[0] || null;
}

function parseArgs(argv) {
  const args = {
    patchDir: null,
    patchArchive: null,
    checksum: null
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--patch-dir') {
      args.patchDir = argv[i + 1];
      i += 1;
    } else if (token === '--patch-archive') {
      args.patchArchive = argv[i + 1];
      i += 1;
    } else if (token === '--checksum') {
      args.checksum = argv[i + 1];
      i += 1;
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
  const {
    patchDir: argPatchDir,
    patchArchive,
    checksum
  } = parseArgs(process.argv);

  let patchDir = argPatchDir ? path.resolve(argPatchDir) : null;

  // If no explicit patchDir or patchArchive, prefer latest archive+checksum
  let archiveToUse = null;
  if (!patchDir && !patchArchive) {
    const rootDir = run('git rev-parse --show-toplevel');
    const found = findLatestPatchArchive(rootDir);
    if (found) {
      archiveToUse = found;
    }
  }

  // If patchArchive param or found archive, use archive flow
  const archivePath = patchArchive
    ? path.resolve(patchArchive)
    : archiveToUse && archiveToUse.archivePath;
  const checksumPath = checksum
    ? path.resolve(checksum)
    : archiveToUse && archiveToUse.checksumPath;

  if (archivePath) {
    if (!fs.existsSync(archivePath)) {
      console.error(`Patch archive not found: ${archivePath}`);
      process.exit(1);
    }
    if (!fs.existsSync(checksumPath)) {
      console.error(`Checksum file not found: ${checksumPath}`);
      process.exit(1);
    }
    verifyChecksum(archivePath, checksumPath)
      .then((ok) => {
        if (!ok) {
          console.error('Patch archive checksum validation failed.');
          process.exit(1);
        } else {
          extractAndContinue();
        }
      })
      .catch((err) => {
        console.error('Checksum verification error:', err);
        process.exit(1);
      });
    return;
  } else {
    if (!patchDir) {
      console.error(
        'Usage: npm run patches:replay -- --patch-dir <path-to-patches>'
      );
      process.exit(1);
    }
    continueMain(patchDir);
  }

  function extractAndContinue() {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patches-'));
    tar.x({ file: archivePath, cwd: tmpDir, sync: true });
    // Assume archive contains a single top-level directory
    const entries = fs.readdirSync(tmpDir);
    if (entries.length !== 1) {
      console.error('Archive must contain a single top-level directory.');
      process.exit(1);
    }
    patchDir = path.join(tmpDir, entries[0]);
    continueMain(patchDir);
  }

  function continueMain(patchDir) {
    const rootDir = run('git rev-parse --show-toplevel');
    process.chdir(rootDir);
    ensureCleanWorkingTree();
    const patchFiles = getPatchFiles(patchDir);

    // Apply each patch file using git apply
    for (const patchFile of patchFiles) {
      try {
        execSync(`git apply --index "${patchFile}"`, { stdio: 'inherit' });
      } catch (err) {
        console.error(`Failed to apply patch: ${patchFile}`);
        process.exit(1);
      }
    }

    console.log('');
    console.log('Patch replay completed successfully.');
  }
}

main();
