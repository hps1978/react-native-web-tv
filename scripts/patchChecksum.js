// @ts-check
// Utility for writing and verifying SHA256 checksums for patch archives
const fs = require('fs');
const crypto = require('crypto');

/**
 * Generate and save a SHA256 checksum for a file
 * @param {string} archivePath - Path to the archive file
 * @param {string} checksumPath - Path to write the checksum file
 * @returns {Promise<string>} The computed checksum
 */
function writeChecksum(archivePath, checksumPath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(archivePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => {
      const digest = hash.digest('hex');
      fs.writeFileSync(checksumPath, digest + '\n');
      resolve(digest);
    });
    stream.on('error', reject);
  });
}

/**
 * Verify a SHA256 checksum for a file
 * @param {string} archivePath - Path to the archive file
 * @param {string} checksumPath - Path to the checksum file
 * @returns {Promise<boolean>} True if valid, false otherwise
 */
function verifyChecksum(archivePath, checksumPath) {
  return new Promise((resolve, reject) => {
    const expected = fs.readFileSync(checksumPath, 'utf8').trim();
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(archivePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => {
      const actual = hash.digest('hex');
      resolve(actual === expected);
    });
    stream.on('error', reject);
  });
}

module.exports = { writeChecksum, verifyChecksum };
