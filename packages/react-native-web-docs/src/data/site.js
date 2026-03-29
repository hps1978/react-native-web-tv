const packageJson = require('../../../react-native-web/package.json');

const isProduction = process.env.ELEVENTY_PRODUCTION === 'true';
const embedSourceInDev = (
  process.env.DOCS_EMBED_SOURCE || 'sandbox'
).toLowerCase();
const useLocalEmbedsInDev = embedSourceInDev === 'local';
const examplesLocalBaseUrl = (
  process.env.EXAMPLES_LOCAL_BASE_URL || 'http://localhost:8080'
).replace(/\/$/, '');

module.exports = {
  name: 'React Native Web for TV',
  description: '',
  footer:
    'Portions Copyright © Nicolas Gallagher, Meta Platforms, Inc., Facebook, Inc. and affiliates, and other contributors as noted in file headers and THIRD_PARTY_NOTICES.md. Modifications and TV extensions Copyright © Harpreet Singh and contributors.',
  url: 'https://hps1978.github.io/react-native-web-tv',
  githubUrl: 'https://github.com/hps1978/react-native-web-tv',
  githubBranch: 'master',
  packageName: 'react-native-web-tv',
  packageUrl: 'https://www.npmjs.com/package/react-native-web-tv',
  packageVersion: packageJson.version,
  isProduction,
  useCodeSandboxEmbeds: isProduction || !useLocalEmbedsInDev,
  embedSourceInDev,
  examplesLocalBaseUrl,
  enableEditButton: false,
  enableGithubLink: true
};
