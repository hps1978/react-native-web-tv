#!/usr/bin/env node

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(command) {
  return execSync(command, { stdio: ['inherit', 'pipe', 'inherit'] })
    .toString()
    .trim();
}

function gitDiff(base, head, destFile, filterFlag, pathspecs) {
  const args = [
    'git diff',
    '--binary',
    `--diff-filter=${filterFlag}`,
    `${base}..${head}`,
    '--',
    ...pathspecs.map((p) => `"${p}"`)
  ];
  execSync(`${args.join(' ')} > "${destFile}"`, {
    stdio: 'inherit',
    shell: true
  });
}

function fileSummary(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  // Count diffs; in unified format, deletions are included in diff --git lines
  const files = (content.match(/^diff --git /gm) || []).length;
  return { lines, files };
}

function removeExistingGroupedPatchDirs(patchesRoot) {
  if (!fs.existsSync(patchesRoot)) return;

  fs.readdirSync(patchesRoot)
    .filter((entry) => /^([0-9a-f]+)-to-([0-9a-f]+)$/.test(entry))
    .map((entry) => path.join(patchesRoot, entry))
    .filter((entryPath) => fs.statSync(entryPath).isDirectory())
    .forEach((entryPath) =>
      fs.rmSync(entryPath, { recursive: true, force: true })
    );
}

function main() {
  const base = 'upstream-mirror';
  const head = 'tv-main';

  const rootDir = run('git rev-parse --show-toplevel');
  process.chdir(rootDir);

  const shortBase = run(`git rev-parse --short ${base}`);
  const shortHead = run(`git rev-parse --short ${head}`);
  const outDir = `patches/${shortBase}-to-${shortHead}`;

  // Keep a single grouped patch series so verify cannot pick a stale folder.
  removeExistingGroupedPatchDirs(path.join(rootDir, 'patches'));
  fs.mkdirSync(outDir, { recursive: true });

  // Remove previous patches
  fs.readdirSync(outDir)
    .filter((f) => f.endsWith('.patch'))
    .forEach((f) => fs.unlinkSync(path.join(outDir, f)));

  console.log(`Generating patches into: ${outDir}\n`);

  const TX = [
    ':(exclude)**/__tests__/**',
    ':(exclude)**/*.test.js',
    ':(exclude)**/*.spec.js'
  ];

  // Exclude patch workflow scripts from new files patch.
  // These scripts must be copied manually into the target branch for patch replay,
  // and including them in the patch set causes conflicts if already present.
  const PATCH_SCRIPT_EXCLUDES = [
    ':(exclude)scripts/tvPatchQueueReplay.js',
    ':(exclude)scripts/tvPatchQueueCheck.js',
    ':(exclude)scripts/patchChecksum.js'
  ];

  const patches = [
    // New added files, excluding tests and patch workflow scripts
    {
      file: '01-new-files.patch',
      filter: 'A',
      paths: ['.', ...TX, ...PATCH_SCRIPT_EXCLUDES]
    },
    // Existing modified files per package, excluding tests
    {
      file: '02-babel-plugin-react-native-web-existing.patch',
      filter: 'MRTD',
      paths: ['packages/babel-plugin-react-native-web', ...TX]
    },
    {
      file: '03-benchmarks-existing.patch',
      filter: 'MRTD',
      paths: ['packages/benchmarks', ...TX]
    },
    {
      file: '04-dom-event-testing-library-existing.patch',
      filter: 'MRTD',
      paths: ['packages/dom-event-testing-library', ...TX]
    },
    {
      file: '05-react-native-web-existing.patch',
      filter: 'MRTD',
      paths: ['packages/react-native-web', ...TX]
    },
    {
      file: '06-react-native-web-docs-existing.patch',
      filter: 'MRTD',
      paths: ['packages/react-native-web-docs', ...TX]
    },
    {
      file: '07-react-native-web-examples-existing.patch',
      filter: 'MRTD',
      paths: ['packages/react-native-web-examples', ...TX]
    },
    // Root config/CI, excluding tests
    {
      file: '08-root-config-and-ci-existing.patch',
      filter: 'MRTD',
      paths: ['.github', 'configs', 'package.json', '.gitignore', ...TX]
    },
    // Docs and lockfile (no test exclusion needed)
    {
      file: '09-root-docs-existing.patch',
      filter: 'MRTD',
      paths: ['README.md']
    },
    {
      file: '10-lockfiles-existing.patch',
      filter: 'MRTD',
      paths: ['package-lock.json']
    },
    // Tests own patches (exclusively)
    {
      file: '11-new-test-files.patch',
      filter: 'A',
      paths: [
        ':(glob)**/__tests__/**',
        ':(glob)**/*.test.js',
        ':(glob)**/*.spec.js'
      ]
    },
    {
      file: '12-existing-test-files.patch',
      filter: 'MRTD',
      paths: [
        ':(glob)**/__tests__/**',
        ':(glob)**/*.test.js',
        ':(glob)**/*.spec.js'
      ]
    }
  ];

  for (const { file, filter, paths } of patches) {
    const dest = path.join(outDir, file);
    gitDiff(base, head, dest, filter, paths);
  }

  console.log('Summary:');
  let totalPatchedNew = 0;
  let totalPatchedExisting = 0;
  for (const { file } of patches) {
    const dest = path.join(outDir, file);
    const { lines, files } = fileSummary(dest);
    console.log(`  ${file} | lines=${lines} | files=${files}`);
    if (file.startsWith('01-') || file.startsWith('11-'))
      totalPatchedNew += files;
    else totalPatchedExisting += files;
  }

  // Coverage check
  const totalNew = Number(
    run(`git diff --name-only --diff-filter=A ${base}..${head} | wc -l`).trim()
  );
  const totalExisting = Number(
    run(
      `git diff --name-only --diff-filter=MRTD ${base}..${head} | wc -l`
    ).trim()
  );

  console.log('');
  console.log(
    `Coverage: new files      git=${totalNew}      patches=${totalPatchedNew}`
  );
  console.log(
    `Coverage: existing files git=${totalExisting} patches=${totalPatchedExisting}`
  );

  // Coverage check: tolerate new file count mismatch ONLY if the difference exactly matches the number of intentionally excluded patch workflow scripts
  const excludedScriptCount = PATCH_SCRIPT_EXCLUDES.length;
  const newMismatch = totalNew !== totalPatchedNew;
  const newMismatchAllowed =
    newMismatch && totalNew - totalPatchedNew === excludedScriptCount;
  const existingMismatch = Math.abs(totalExisting - totalPatchedExisting) > 1;

  if ((newMismatch && !newMismatchAllowed) || existingMismatch) {
    const detail =
      newMismatch && existingMismatch
        ? 'new and existing files'
        : newMismatch
        ? 'new files'
        : 'existing files';
    console.error(
      `\nWARNING: patch coverage count does not match git diff count (${detail}).`
    );
    console.error(
      'This may indicate missing files in patches, or a counting discrepancy with deleted files.'
    );
    process.exit(1);
  }

  console.log('\nAll patches generated and coverage verified.');

  // --- Patch compression and checksum ---
  const tar = require('tar');
  const { writeChecksum } = require('./patchChecksum');

  const archivePath = `${outDir}.tar.gz`;
  const checksumPath = `${archivePath}.sha256`;

  // Remove any previous archive/checksum
  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
  if (fs.existsSync(checksumPath)) fs.unlinkSync(checksumPath);

  // Create tar.gz archive of the patch directory
  tar
    .c(
      {
        gzip: true,
        file: archivePath,
        cwd: path.dirname(outDir)
      },
      [path.basename(outDir)]
    )
    .then(async () => {
      // Write SHA256 checksum
      await writeChecksum(archivePath, checksumPath);
      console.log(`\nArchive created: ${archivePath}`);
      console.log(`Checksum written: ${checksumPath}`);
      // Always delete the patch directory after archiving
      fs.rmSync(outDir, { recursive: true, force: true });
      console.log(`Patch directory deleted: ${outDir}`);
    })
    .catch((err) => {
      console.error('Error creating patch archive:', err);
      process.exit(1);
    });
}

main();
