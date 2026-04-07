'use strict';

const fs = require('fs');
const path = require('path');
const { files } = require('./staticStyleCompilerManifest');

const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const rnwSourceRoot = path.join(
  repoRoot,
  'packages',
  'react-native-web',
  'src'
);
const vendorRoot = path.join(packageRoot, 'vendor', 'rnw-compiler');

function collectFiles(dirPath, currentBase = dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return collectFiles(entryPath, currentBase);
    }
    return [path.relative(currentBase, entryPath)];
  });
}

function main() {
  const expectedTargets = files.map(({ target }) => target).sort();
  const actualTargets = collectFiles(vendorRoot).sort();
  const issues = [];

  files.forEach(({ source, target }) => {
    const sourcePath = path.join(rnwSourceRoot, source);
    const targetPath = path.join(vendorRoot, target);

    if (!fs.existsSync(targetPath)) {
      issues.push(`Missing vendored file: ${target}`);
      return;
    }

    const sourceContents = fs.readFileSync(sourcePath, 'utf8');
    const targetContents = fs.readFileSync(targetPath, 'utf8');
    if (sourceContents !== targetContents) {
      issues.push(`Out-of-sync vendored file: ${target}`);
    }
  });

  actualTargets.forEach((target) => {
    if (!expectedTargets.includes(target)) {
      issues.push(`Unexpected vendored file: ${target}`);
    }
  });

  if (issues.length > 0) {
    console.error('Static style compiler vendor snapshot is out of sync.');
    issues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }

  console.log('Static style compiler vendor snapshot is in sync.');
}

main();
