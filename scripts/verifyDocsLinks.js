#!/usr/bin/env node

'use strict';

const execSync = require('child_process').execSync;
const fs = require('fs');
const https = require('https');
const minimist = require('minimist');
const path = require('path');

const argv = minimist(process.argv.slice(2));

const ROOT_DIR = path.resolve(__dirname, '..');
const DOCS_DIST_DIR = path.join(
  ROOT_DIR,
  'packages/react-native-web-docs/dist'
);
const PATH_PREFIX = '/react-native-web-tv/';
const DOCS_PREFIX = `${PATH_PREFIX}docs`;
const DEFAULT_DEPLOY_ORIGIN = 'https://hps1978.github.io';

function run(command, options = {}) {
  return execSync(command, {
    stdio: 'inherit',
    ...options
  });
}

function walkDirectory(dirPath, files = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  entries.forEach((entry) => {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDirectory(absolutePath, files);
    } else {
      files.push(absolutePath);
    }
  });
  return files;
}

function normalizePathForDisplay(value) {
  return value.replace(/\\/g, '/');
}

function stripQueryAndHash(urlPath) {
  return urlPath.split('#')[0].split('?')[0];
}

function hasExtension(urlPath) {
  const lastSegment = urlPath.split('/').filter(Boolean).pop() || '';
  return /\.[A-Za-z0-9]+$/.test(lastSegment);
}

function getInternalAbsoluteUrlsFromHtml(content) {
  const results = [];
  const sanitizedContent = content
    .replace(/<pre[\s\S]*?<\/pre>/gi, '')
    .replace(/<code[\s\S]*?<\/code>/gi, '');
  const regex = /(href|src)=['"]([^'"]+)['"]/g;
  let match = regex.exec(sanitizedContent);

  while (match) {
    const url = match[2];
    if (url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/#')) {
      results.push(url);
    }
    match = regex.exec(sanitizedContent);
  }

  return results;
}

function resolveDistTargets(urlPath) {
  const stripped = stripQueryAndHash(urlPath);
  const relative = stripped.slice(PATH_PREFIX.length);

  if (relative.length === 0) {
    return [path.join(DOCS_DIST_DIR, 'index.html')];
  }

  if (stripped.endsWith('/')) {
    return [path.join(DOCS_DIST_DIR, relative, 'index.html')];
  }

  if (hasExtension(stripped)) {
    return [path.join(DOCS_DIST_DIR, relative)];
  }

  return [
    path.join(DOCS_DIST_DIR, relative),
    path.join(DOCS_DIST_DIR, relative, 'index.html')
  ];
}

function checkUrl(url) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: 'GET'
      },
      (response) => {
        // Consume data to close socket cleanly.
        response.resume();
        resolve(response.statusCode || 0);
      }
    );

    request.on('error', (error) => reject(error));
    request.end();
  });
}

async function main() {
  if (argv.build) {
    run('npm run build -w packages/react-native-web-docs', { cwd: ROOT_DIR });
  }

  if (!fs.existsSync(DOCS_DIST_DIR)) {
    console.error(
      `Docs output not found at ${normalizePathForDisplay(
        DOCS_DIST_DIR
      )}. Run docs build first.`
    );
    process.exit(1);
  }

  const htmlFiles = walkDirectory(DOCS_DIST_DIR).filter((filePath) =>
    filePath.endsWith('.html')
  );

  const errors = [];
  const internalUrls = new Set();

  htmlFiles.forEach((htmlFilePath) => {
    const content = fs.readFileSync(htmlFilePath, { encoding: 'utf-8' });
    const urls = getInternalAbsoluteUrlsFromHtml(content);
    const displayFile = normalizePathForDisplay(
      path.relative(ROOT_DIR, htmlFilePath)
    );

    urls.forEach((url) => {
      internalUrls.add(url);

      const stripped = stripQueryAndHash(url);

      if (!stripped.startsWith(PATH_PREFIX)) {
        errors.push(
          `${displayFile}: internal URL must include pathPrefix "${PATH_PREFIX}" => ${url}`
        );
        return;
      }

      if (stripped === DOCS_PREFIX || stripped.startsWith(`${DOCS_PREFIX}/`)) {
        if (!stripped.endsWith('/') && !hasExtension(stripped)) {
          errors.push(
            `${displayFile}: docs URL should use trailing slash => ${url}`
          );
        }
      }

      const targets = resolveDistTargets(stripped);
      const foundTarget = targets.find((targetPath) =>
        fs.existsSync(targetPath)
      );
      if (!foundTarget) {
        const candidates = targets
          .map((targetPath) =>
            normalizePathForDisplay(path.relative(ROOT_DIR, targetPath))
          )
          .join(' OR ');
        errors.push(
          `${displayFile}: unresolved internal URL => ${url} (expected ${candidates})`
        );
      }
    });
  });

  if (argv.deployed) {
    const deployOrigin = String(argv.origin || DEFAULT_DEPLOY_ORIGIN).replace(
      /\/$/,
      ''
    );

    const sortedUrls = Array.from(internalUrls).sort();
    for (const urlPath of sortedUrls) {
      const url = `${deployOrigin}${urlPath}`;
      try {
        // eslint-disable-next-line no-await-in-loop
        const statusCode = await checkUrl(url);
        if (statusCode >= 400) {
          errors.push(`deployed URL returned ${statusCode} => ${url}`);
        }
      } catch (error) {
        errors.push(`deployed URL failed => ${url} (${error.message})`);
      }
    }
  }

  if (errors.length > 0) {
    console.error(
      `Docs link verification failed with ${errors.length} issue(s):`
    );
    errors.slice(0, 50).forEach((error) => console.error(`- ${error}`));
    if (errors.length > 50) {
      console.error(`- ...and ${errors.length - 50} more`);
    }
    process.exit(1);
  }

  console.log(
    `Docs link verification passed (${htmlFiles.length} pages, ${internalUrls.size} internal URLs).`
  );
}

main().catch((error) => {
  console.error(`Docs link verification failed: ${error.message}`);
  process.exit(1);
});
