#!/usr/bin/env node
/**
 * Build script: Vendor and transpile RNW StyleSheet compiler source.
 *
 * This script:
 * 1. Copies required RNW StyleSheet/compiler and modules source files
 * 2. Transpiles them from Flow/ES modules to plain CommonJS JavaScript
 * 3. Places transpiled output in vendor/ for bundled distribution
 *
 * The transpiled vendor code is imported by src/index.js to avoid
 * runtime coupling to RNW dist artifacts and transpilation needs.
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const RNW_ROOT = path.resolve(PLUGIN_ROOT, '../react-native-web/src');
const VENDOR_ROOT = path.resolve(PLUGIN_ROOT, 'vendor/rnw-compiler');

/**
 * Define the minimal RNW source subset required by the plugin.
 * Each entry: { src: 'path/in/rnw/src', dest: 'path/in/vendor' }
 */
const VENDOR_FILES = [
  // Main compiler entry point and helpers
  { src: 'exports/StyleSheet/preprocess.js', dest: 'StyleSheet/preprocess.js' },
  { src: 'exports/StyleSheet/index.js', dest: 'StyleSheet/index.js' },
  {
    src: 'exports/StyleSheet/compiler/index.js',
    dest: 'StyleSheet/compiler/index.js'
  },
  {
    src: 'exports/StyleSheet/compiler/createReactDOMStyle.js',
    dest: 'StyleSheet/compiler/createReactDOMStyle.js'
  },
  {
    src: 'exports/StyleSheet/compiler/normalizeColor.js',
    dest: 'StyleSheet/compiler/normalizeColor.js'
  },
  {
    src: 'exports/StyleSheet/compiler/normalizeValueWithProperty.js',
    dest: 'StyleSheet/compiler/normalizeValueWithProperty.js'
  },
  {
    src: 'exports/StyleSheet/compiler/hash.js',
    dest: 'StyleSheet/compiler/hash.js'
  },
  {
    src: 'exports/StyleSheet/compiler/hyphenateStyleName.js',
    dest: 'StyleSheet/compiler/hyphenateStyleName.js'
  },
  {
    src: 'exports/StyleSheet/compiler/resolveShadowValue.js',
    dest: 'StyleSheet/compiler/resolveShadowValue.js'
  },
  {
    src: 'exports/StyleSheet/compiler/unitlessNumbers.js',
    dest: 'StyleSheet/compiler/unitlessNumbers.js'
  },

  // Module helpers
  {
    src: 'modules/prefixStyles/index.js',
    dest: 'modules/prefixStyles/index.js'
  },
  {
    src: 'modules/prefixStyles/static.js',
    dest: 'modules/prefixStyles/static.js'
  },
  { src: 'modules/warnOnce/index.js', dest: 'modules/warnOnce/index.js' },
  { src: 'modules/canUseDom/index.js', dest: 'modules/canUseDom/index.js' },
  { src: 'modules/isWebColor/index.js', dest: 'modules/isWebColor/index.js' }
];

/**
 * Babel config for transpiling RNW source (Flow + ES modules to CommonJS).
 */
const BABEL_CONFIG = {
  assumptions: {
    iterableIsArray: true
  },
  plugins: [
    '@babel/plugin-transform-flow-strip-types',
    ['@babel/plugin-proposal-class-properties', { loose: true }],
    ['@babel/plugin-proposal-object-rest-spread', { useBuiltIns: true }],
    '@babel/plugin-proposal-nullish-coalescing-operator',
    '@babel/plugin-transform-modules-commonjs'
  ]
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function transpileAllFiles() {
  console.log(`Building vendored RNW compiler into ${VENDOR_ROOT}...\n`);

  // Clean vendor directory
  if (fs.existsSync(VENDOR_ROOT)) {
    fs.rmSync(VENDOR_ROOT, { recursive: true });
  }
  ensureDir(VENDOR_ROOT);

  let successCount = 0;
  let errorCount = 0;

  for (const { src, dest } of VENDOR_FILES) {
    const srcPath = path.resolve(RNW_ROOT, src);
    const destPath = path.resolve(VENDOR_ROOT, dest);

    if (!fs.existsSync(srcPath)) {
      console.error(`✗ Source not found: ${srcPath}`);
      errorCount++;
      continue;
    }

    try {
      // Read source file
      const sourceCode = fs.readFileSync(srcPath, 'utf-8');

      // Transpile using Babel
      const result = babel.transformSync(sourceCode, {
        ...BABEL_CONFIG,
        filename: srcPath
      });

      // Ensure destination directory exists
      ensureDir(path.dirname(destPath));

      // Write transpiled output
      fs.writeFileSync(destPath, result.code, 'utf-8');

      console.log(`✓ ${dest}`);
      successCount++;
    } catch (err) {
      console.error(`✗ Failed to transpile ${src}:`);
      console.error(`  ${err.message}`);
      errorCount++;
    }
  }

  console.log(`\n${successCount} file(s) transpiled, ${errorCount} error(s).`);

  if (errorCount > 0) {
    process.exit(1);
  }

  console.log(`\nVendored compiler ready at ${VENDOR_ROOT}`);
}

transpileAllFiles();
