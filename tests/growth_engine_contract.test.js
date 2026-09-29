const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { renderProjectPage } = require('../project-stories');
const projects = require('../otp-projects').getProjects();

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

console.log('OTP GROWTH ENGINE CONTRACT...');

const homepage = read('index.html');
const shell = read('public-shell.js');
const archive = read('archive.html');
const studio = read('studio.html');
const bookings = read('bookings.html');
const bookingsJs = read('bookings.js');
const attribution = read('otp-attribution.js');
const server = read('server.js');

assert.ok(homepage.includes('/bookings?source=homepage-hero'), 'homepage primary CTA remains general booking');
assert.ok(!homepage.includes('/fixline/intake?source=homepage-hero'), 'homepage primary CTA cannot regress to FIXLINE');
assert.ok(shell.includes('/bookings?source=public-nav') && shell.includes('/bookings?source=public-footer'), 'shared public shell generic CTAs use booking');
assert.ok(archive.includes('/bookings?source=archive'), 'Archive CTA carries an attributed general booking source');
assert.ok(archive.includes('/fixline/intake?source=archive-fixline'), 'FIXLINE Archive entry remains separate');
assert.ok(studio.includes('data-entry-offer="quick-fix"'), 'Studio exposes one low-friction entry offer');
assert.ok(studio.includes('/bookings?source=quick-fix&amp;service=website-cleanup&amp;package=The+Signal'), 'Quick Fix routes into existing booking and package ladder');
assert.ok(bookings.includes('application/ld+json'), 'booking route exposes service metadata');
assert.ok(bookings.includes('within one business hour'), 'booking confirmation states a response expectation');
assert.ok(bookingsJs.includes('Send additional files or details'), 'booking confirmation provides an additional-details path');
assert.ok(bookingsJs.includes('selected_service') && bookingsJs.includes('selected_package'), 'completed booking payload captures selected service and package');
assert.ok(bookingsJs.includes("getBookingTracking('booking_completed')"), 'completed booking payload records conversion stage');
assert.ok(attribution.includes('completed_booking'), 'attribution helper permits completed-booking context');
assert.ok(server.includes('selected_service') && server.includes('selected_package') && server.includes('completed_booking'), 'server preserves conversion context safely');

for (const project of projects) {
  const document = new JSDOM(renderProjectPage(project, projects)).window.document;
  const conversion = document.querySelector('.project-contact .project-action');
  assert.ok(conversion, `${project.id} has a closing conversion CTA`);
  assert.equal(conversion.getAttribute('href'), project.bookingUrl, `${project.id} CTA matches its canonical booking route`);
  if (project.id === 'otp-fixline') assert.match(conversion.getAttribute('href'), /^\/fixline\/intake\?source=/, 'FIXLINE story stays in FIXLINE');
  else assert.match(conversion.getAttribute('href'), /^\/bookings\?source=/, `${project.id} story stays in general booking`);
  assert.equal(document.querySelectorAll('.project-story-grid > div').length, 5, `${project.id} has the proof structure`);
  assert.doesNotThrow(() => JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent), `${project.id} CreativeWork schema is valid JSON`);
}

for (const file of ['OTP_CONVERSION_AUDIT.md', 'OTP_ATTRIBUTION_MAP.md', 'OTP_CLIENT_ACQUISITION_PLAYBOOK.md', 'DAILY_CLIENT_SPRINT.md']) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
}

console.log('OTP GROWTH ENGINE CONTRACT COMPLETE');
