#!/usr/bin/env node

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const tar = require('tar');
const { verifyChecksum } = require('./patchChecksum');

function run(command) {
  return execSync(command, { stdio: ['inherit', 'pipe', 'inherit'] })
    .toString()
    .trim();
}

function parseArgs(argv) {
  const args = {
    patchDir: null,
    base: 'upstream-mirror',
    patchArchive: null,
    checksum: null
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--patch-dir') {
      args.patchDir = argv[i + 1];
      i += 1;
    }
    if (argv[i] === '--base') {
      args.base = argv[i + 1];
      i += 1;
    }
    if (argv[i] === '--patch-archive') {
      args.patchArchive = argv[i + 1];
      i += 1;
    }
    if (argv[i] === '--checksum') {
      args.checksum = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

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

function findLatestGroupedDir(rootDir) {
  const patchesRoot = path.join(rootDir, 'patches');
  if (!fs.existsSync(patchesRoot)) return null;
  const dirs = fs
    .readdirSync(patchesRoot)
    .filter((d) => /^([0-9a-f]+)-to-([0-9a-f]+)$/.test(d))
    .map((d) => {
      const dirPath = path.join(patchesRoot, d);
      return {
        dirPath,
        modifiedTime: fs.statSync(dirPath).mtimeMs
      };
    })
    .filter(({ dirPath }) => {
      if (!fs.statSync(dirPath).isDirectory()) return false;
      const expected = ['01-new-files.patch', '12-existing-test-files.patch'];
      return expected.every((f) => fs.existsSync(path.join(dirPath, f)));
    })
    .sort((left, right) => right.modifiedTime - left.modifiedTime);
  return dirs[0]?.dirPath || null;
}

function getPatchFiles(patchDir) {
  return fs
    .readdirSync(patchDir)
    .filter((f) => f.endsWith('.patch'))
    .sort()
    .map((f) => path.join(patchDir, f));
}

function main() {
  const {
    patchDir: argPatchDir,
    base,
    patchArchive,
    checksum
  } = parseArgs(process.argv);
  const rootDir = run('git rev-parse --show-toplevel');
  process.chdir(rootDir);

  let patchDir = argPatchDir ? path.resolve(argPatchDir) : null;

  // If no explicit patchDir or patchArchive, prefer latest archive+checksum
  let archiveToUse = null;
  if (!patchDir && !patchArchive) {
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
      patchDir = findLatestGroupedDir(rootDir);
    }
    if (!patchDir || !fs.existsSync(patchDir)) {
      console.error(
        'No patch directory or archive found. Run npm run patches:export first, or pass --patch-dir <path>.'
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
    const patchFiles = getPatchFiles(patchDir);
    if (patchFiles.length === 0) {
      console.error(`No .patch files found in: ${patchDir}`);
      process.exit(1);
    }

    console.log(`Verifying ${patchFiles.length} patches from: ${patchDir}`);
    console.log(`Against base: ${base}\n`);

    const tmpBranch = `patch-verify-tmp-${Date.now()}`;
    const worktreeDir = path.join(rootDir, `tmp/${tmpBranch}`);

    // Create isolated worktree
    execSync(`git worktree add "${worktreeDir}" -b "${tmpBranch}" "${base}"`, {
      stdio: 'inherit'
    });

    const results = [];
    let failed = false;

    try {
      for (const patchFile of patchFiles) {
        const name = path.basename(patchFile);
        const result = spawnSync(
          'git',
          ['apply', '--check', '--3way', patchFile],
          { cwd: worktreeDir, encoding: 'utf8' }
        );
        const ok = result.status === 0;
        results.push({ name, ok, stderr: result.stderr });
        if (!ok) failed = true;
        console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${name}`);
        if (!ok && result.stderr) {
          result.stderr
            .split('\n')
            .filter(Boolean)
            .forEach((l) => console.log(`       ${l}`));
        }
      }
    } finally {
      // Always clean up worktree and temp branch
      execSync(`git worktree remove --force "${worktreeDir}"`, {
        stdio: 'pipe'
      });
      execSync(`git branch -D "${tmpBranch}"`, { stdio: 'pipe' });
    }

    console.log('');
    const passed = results.filter((r) => r.ok).length;
    console.log(
      `Results: ${passed}/${results.length} patches apply cleanly against ${base}`
    );

    if (failed) {
      console.error(
        '\nSome patches have conflicts. Review the FAIL entries above.'
      );
      process.exit(1);
    }

    console.log('\nAll patches verified successfully.');
  }
}

main();
