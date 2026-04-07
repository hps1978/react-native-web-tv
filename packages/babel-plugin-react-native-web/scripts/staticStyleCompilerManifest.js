'use strict';

const files = [
  {
    source: 'exports/StyleSheet/preprocess.js',
    target: 'src/exports/StyleSheet/preprocess.js'
  },
  {
    source: 'exports/StyleSheet/compiler/index.js',
    target: 'src/exports/StyleSheet/compiler/index.js'
  },
  {
    source: 'exports/StyleSheet/compiler/createReactDOMStyle.js',
    target: 'src/exports/StyleSheet/compiler/createReactDOMStyle.js'
  },
  {
    source: 'exports/StyleSheet/compiler/hash.js',
    target: 'src/exports/StyleSheet/compiler/hash.js'
  },
  {
    source: 'exports/StyleSheet/compiler/hyphenateStyleName.js',
    target: 'src/exports/StyleSheet/compiler/hyphenateStyleName.js'
  },
  {
    source: 'exports/StyleSheet/compiler/normalizeColor.js',
    target: 'src/exports/StyleSheet/compiler/normalizeColor.js'
  },
  {
    source: 'exports/StyleSheet/compiler/normalizeValueWithProperty.js',
    target: 'src/exports/StyleSheet/compiler/normalizeValueWithProperty.js'
  },
  {
    source: 'exports/StyleSheet/compiler/unitlessNumbers.js',
    target: 'src/exports/StyleSheet/compiler/unitlessNumbers.js'
  },
  {
    source: 'modules/prefixStyles/index.js',
    target: 'src/modules/prefixStyles/index.js'
  },
  {
    source: 'modules/prefixStyles/static.js',
    target: 'src/modules/prefixStyles/static.js'
  },
  {
    source: 'modules/canUseDom/index.js',
    target: 'src/modules/canUseDom/index.js'
  },
  {
    source: 'modules/isWebColor/index.js',
    target: 'src/modules/isWebColor/index.js'
  },
  {
    source: 'modules/warnOnce/index.js',
    target: 'src/modules/warnOnce/index.js'
  },
  {
    source: 'exports/processColor/index.js',
    target: 'src/exports/processColor/index.js'
  }
];

module.exports = {
  files
};
