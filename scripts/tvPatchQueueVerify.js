#!/usr/bin/env node

'use strict';

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command) {
  return execSync(command, { stdio: ['inherit', 'pipe', 'inherit'] })
    .toString()
    .trim();
}

function parseArgs(argv) {
  const args = {
    patchDir: null,
    base: 'upstream-mirror'
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
  }
  return args;
}

function findLatestGroupedDir(rootDir) {
  const patchesRoot = path.join(rootDir, 'patches');
  if (!fs.existsSync(patchesRoot)) return null;
  const dirs = fs
    .readdirSync(patchesRoot)
    .filter((d) => /^([0-9a-f]+)-to-([0-9a-f]+)$/.test(d))
    .map((d) => path.join(patchesRoot, d))
    .filter((d) => {
      if (!fs.statSync(d).isDirectory()) return false;
      const expected = ['01-new-files.patch', '12-existing-test-files.patch'];
      return expected.every((f) => fs.existsSync(path.join(d, f)));
    })
    .filter((d) => fs.statSync(d).isDirectory())
    .sort()
    .reverse();
  return dirs[0] || null;
}

function getPatchFiles(patchDir) {
  return fs
    .readdirSync(patchDir)
    .filter((f) => f.endsWith('.patch'))
    .sort()
    .map((f) => path.join(patchDir, f));
}

function main() {
  const { patchDir: argPatchDir, base } = parseArgs(process.argv);
  const rootDir = run('git rev-parse --show-toplevel');
  process.chdir(rootDir);

  const patchDir = argPatchDir
    ? path.resolve(argPatchDir)
    : findLatestGroupedDir(rootDir);

  if (!patchDir || !fs.existsSync(patchDir)) {
    console.error(
      'No patch directory found. Run npm run patches:export first, or pass --patch-dir <path>.'
    );
    process.exit(1);
  }

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
    execSync(`git worktree remove --force "${worktreeDir}"`, { stdio: 'pipe' });
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

main();
