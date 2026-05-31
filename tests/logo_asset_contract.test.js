/**
 * OTP logo/icon asset contract.
 * Verifies public icon files match their declared formats and page references.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file));
const readText = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function assertPng(file, width, height) {
  const buffer = read(file);
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${file} must be a real PNG`);
  assert.equal(buffer.readUInt32BE(16), width, `${file} width`);
  assert.equal(buffer.readUInt32BE(20), height, `${file} height`);
}

function jpegSize(file) {
  const buffer = read(file);
  assert.equal(buffer[0], 0xff, `${file} must be a JPEG`);
  assert.equal(buffer[1], 0xd8, `${file} must be a JPEG`);
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) break;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3].includes(marker)) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5)
      };
    }
    offset += 2 + length;
  }
  throw new Error(`Could not read JPEG dimensions for ${file}`);
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.vercel'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(path.relative(root, full).replace(/\\/g, '/'));
  }
  return files;
}

console.log('LOGO ASSET CONTRACT...');

assertPng('assets/otp-logo-transparent.png', 1536, 1536);
assertPng('assets/otp-app-icon.png', 1024, 1024);
assertPng('favicon.png', 32, 32);
assertPng('favicon-32x32.png', 32, 32);
assertPng('apple-touch-icon.png', 180, 180);
assertPng('icon.png', 512, 512);
assertPng('icon-192.png', 192, 192);
assertPng('icon-512.png', 512, 512);

const og = jpegSize('og.jpg');
assert.deepEqual(og, { width: 1200, height: 630 }, 'OG image must be 1200x630');

const manifest = JSON.parse(readText('site.webmanifest'));
assert.deepEqual(
  manifest.icons.map((icon) => icon.src),
  ['/icon-192.png', '/icon-512.png'],
  'manifest uses dedicated app icons'
);

const htmlFiles = walk(root).filter((file) => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = readText(file);
  assert.ok(!html.includes('href="favicon.png"'), `${file} must not use relative favicon.png`);
  assert.ok(!html.includes('href="apple-touch-icon.png"'), `${file} must not use relative apple touch icon`);
}

const index = readText('index.html');
assert.ok(index.includes('href="/favicon-32x32.png"'), 'homepage references root favicon');
assert.ok(index.includes('href="/apple-touch-icon.png"'), 'homepage references root Apple touch icon');
assert.ok(index.includes('src="assets/otp-logo-transparent.png"'), 'homepage header uses primary transparent logo');
assert.ok(!index.includes('src="icon.png"'), 'homepage does not use square app icon as header logo');

const allProjectFiles = walk(root);
assert.ok(!allProjectFiles.some((file) => /logo\.PNG|Logo\.png|favicon\.jpg$/i.test(file)), 'no stale logo casing or jpg favicon files');

console.log('   OK: Logo asset contract');
console.log('LOGO ASSET CONTRACT COMPLETE');
