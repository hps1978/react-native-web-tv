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
  const files = (content.match(/^diff --git /gm) || []).length;
  return { lines, files };
}

function main() {
  const base = 'upstream-mirror';
  const head = 'tv-main';

  const rootDir = run('git rev-parse --show-toplevel');
  process.chdir(rootDir);

  const shortBase = run(`git rev-parse --short ${base}`);
  const shortHead = run(`git rev-parse --short ${head}`);
  const outDir = `patches/${shortBase}-to-${shortHead}`;
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

  const patches = [
    // New added files, excluding tests
    { file: '01-new-files.patch', filter: 'A', paths: ['.', ...TX] },
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

  if (totalNew !== totalPatchedNew || totalExisting !== totalPatchedExisting) {
    console.error(
      '\nWARNING: patch coverage count does not match git diff count.'
    );
    process.exit(1);
  }

  console.log('\nAll patches generated and coverage verified.');
}

main();
