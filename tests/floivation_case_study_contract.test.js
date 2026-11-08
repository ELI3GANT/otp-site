'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { floivation, renderCaseStudy } = require('../floivation-case-study');

const source = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
const html = renderCaseStudy(floivation);

assert.equal(floivation.status, 'In production');
assert.equal(floivation.captureDate, '2026-11-06');
assert.equal(floivation.comparison.before.url, 'https://beacons.ai/floivation');
assert.equal(floivation.redesignedUrl, 'https://preview--floivation.lovable.app/');
assert.equal(floivation.comparison.after.url, '');
assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large">/);
assert.match(html, /rel="canonical" href="https:\/\/www\.onlytrueperspective\.tech\/projects\/floivation"/);
assert.match(html, /Before &amp; after/);
assert.match(html, /data-flo-slider/);
assert.match(html, /<video controls playsinline preload="none"/);
assert.match(html, /<video class="flo-film" controls playsinline preload="none"/);
assert.match(html, /aria-label="Reveal redesigned website"/);
assert.match(html, /type="range"/);
assert.match(html, /prefers-reduced-motion:reduce/);
assert.match(html, /slider\.addEventListener\('input',reveal\)/);
assert.doesNotMatch(html, /autoplay/i);
assert.match(html, /The after section follows the redesigned site into its fitness and lifestyle section/);
assert.match(html, /future opportunities, not completed or included features/i);
assert.match(html, /Original website walkthrough/);
assert.match(html, /Redesigned website walkthrough/);
assert.match(html, /before-recordly-web\.mp4/);
assert.match(html, /after-recordly-web\.mp4/);
assert.match(html, /preload="none"/);
assert.match(html, /Private redesign preview; access is limited to the Lovable workspace/);
assert.doesNotMatch(html, /href="https:\/\/preview--floivation\.lovable\.app\//);
assert.match(html, /Jeff has approved public presentation of this case study/);
assert.match(html, /No post-launch performance metrics are claimed/);
assert.match(html, /\/start-project\?source=project-floivation/);
assert.match(source, /req\.params\.slug === 'floivation'/);
const projectLibrary = require('../otp-projects');
const floivationProject = projectLibrary.getProjects().find((project) => project.id === 'floivation');
assert.ok(floivationProject, 'FLOIVATION is registered in the Archive project library');
assert.equal(floivationProject.caseStudyUrl, '/projects/floivation');
assert.equal(floivationProject.bookingUrl, '/start-project?source=archive-floivation');
assert.match(fs.readFileSync(path.join(__dirname, '..', 'sitemap.xml'), 'utf8'), /<loc>https:\/\/www\.onlytrueperspective\.tech\/projects\/floivation<\/loc>/);

console.log('FLOIVATION case study contract passed.');
