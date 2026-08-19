const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Given
const dom = new JSDOM('<div id="otpMediaShowcaseMount"></div>', {
    runScripts: 'dangerously',
    url: 'https://www.onlytrueperspective.tech/'
});
dom.window.eval(read('otp-video-library.js'));
dom.window.eval(read('components/otp-media-showcase.js'));

// When
dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

// Then
const showcase = dom.window.document.querySelector('.otp-showcase-container');
assert.ok(showcase, 'homepage media showcase mounts from the public video library');
assert.ok(
    dom.window.document.querySelectorAll('.otp-media-card').length > 0,
    'homepage media showcase renders at least one project card'
);

console.log('Media showcase browser-DOM integration passed.');
