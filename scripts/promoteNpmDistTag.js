#!/usr/bin/env node

'use strict';

const execSync = require('child_process').execSync;
const minimist = require('minimist');

const PACKAGE_NAME = 'react-native-web-tv';
const argv = minimist(process.argv.slice(2));

function printUsage() {
  console.log(
    'Usage: npm run release:dist-tag -- <version> [--tag=<dist-tag>] [--otp=<otp-code>]'
  );
  console.log(
    'Example: npm run release:dist-tag -- 0.21.2-tv.2 --tag=latest --otp=123456'
  );
}

if (argv.help || argv.h) {
  printUsage();
  process.exit(0);
}

const version = argv._[0];
const tag = argv.tag || 'latest';
const otp = argv.otp;

if (!version) {
  printUsage();
  process.exit(1);
}

if (/\s/.test(tag)) {
  console.error(`Invalid dist-tag: "${tag}"`);
  process.exit(1);
}

const otpArg = otp ? ` --otp ${otp}` : '';
const addTagCommand = `npm dist-tag add ${PACKAGE_NAME}@${version} ${tag}${otpArg}`;

console.log(`Promoting ${PACKAGE_NAME}@${version} to dist-tag "${tag}"...`);
execSync(addTagCommand, { stdio: 'inherit' });

const tags = execSync(`npm view ${PACKAGE_NAME} dist-tags --json`, {
  stdio: ['ignore', 'pipe', 'inherit']
})
  .toString()
  .trim();

console.log('Updated dist-tags:');
console.log(tags);
