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

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function syncFile(sourceRelativePath, targetRelativePath) {
  const sourcePath = path.join(rnwSourceRoot, sourceRelativePath);
  const targetPath = path.join(vendorRoot, targetRelativePath);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Missing RNW source file: ${sourcePath}`);
  }

  ensureDirectory(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function main() {
  fs.rmSync(vendorRoot, { recursive: true, force: true });
  ensureDirectory(vendorRoot);

  files.forEach(({ source, target }) => {
    syncFile(source, target);
  });

  console.log(
    `Synced ${files.length} static style compiler files to ${vendorRoot}`
  );
}

main();
