#!/usr/bin/env node

/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const rootDir = path.resolve(__dirname, '..');
const pluginPath = path.join(
  rootDir,
  'packages/babel-plugin-react-native-web/src/index.js'
);

const inputArg = process.argv[2];
const outputArg = process.argv[3];
const modeArg = process.argv[4] || '--mode=preview';

const mode = modeArg.replace('--mode=', '');

if (!inputArg) {
  console.error(
    'Usage: node scripts/transpileStaticStylesPreview.js <input-file> [output-file] [--mode=preview|replace]'
  );
  process.exit(1);
}

if (mode !== 'preview' && mode !== 'replace') {
  console.error(`Invalid mode: ${mode}. Use --mode=preview or --mode=replace`);
  process.exit(1);
}

const inputFile = path.resolve(rootDir, inputArg);
if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

const defaultOutput = path.join(rootDir, 'tmp', 'transpiled-static-styles-preview.js');
const outputFile = outputArg
  ? path.resolve(rootDir, outputArg)
  : defaultOutput;

const result = babel.transformFileSync(inputFile, {
  configFile: false,
  babelrc: false,
  presets: [
    [require.resolve('@babel/preset-env'), { modules: false }],
    require.resolve('@babel/preset-flow'),
    require.resolve('@babel/preset-react')
  ],
  plugins: [
    [
      pluginPath,
      mode === 'replace'
        ? { extractStaticStylesReplace: true, transpileStaticStyleProps: true }
        : { extractStaticStylesPreview: true, transpileStaticStyleProps: true }
    ]
  ],
  sourceType: 'unambiguous',
  filename: inputFile
});

if (!result || typeof result.code !== 'string') {
  console.error('Babel transform failed to produce output.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, result.code, 'utf8');

console.log(`Wrote transpiled preview: ${path.relative(rootDir, outputFile)}`);
if (mode === 'replace') {
  console.log(
    'Replace mode: first StyleSheet.create argument is compiled styles; look for "$$css" and "__rnwTvStaticPreview".'
  );
} else {
  console.log('Preview mode: look for "__rnwTvStaticPreview" next to StyleSheet.create.');
}
