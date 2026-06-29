const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const requiredFiles = [
  'songwars.html',
  'songwars.css',
  'songwars.js',
  'songwars-config.js',
  'assets/songwars/songwars-poster.jpg',
  'assets/songwars/songwars-poster-480.jpg',
  'assets/songwars/songwars-poster-672.jpg',
  'assets/songwars/songwars-poster-800.jpg',
  'assets/songwars/songwars-poster-1200.jpg',
  'assets/songwars/songwars-poster-480.webp',
  'assets/songwars/songwars-poster-672.webp',
  'assets/songwars/songwars-poster-800.webp',
  'assets/songwars/songwars-poster-1200.webp',
  'assets/songwars/songwars-poster-1600.webp',
  'assets/songwars/otp-mark.png'
];

requiredFiles.forEach((file) => {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`);
});

const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('songwars.html');
const css = read('songwars.css');
const clientJs = read('songwars.js');
const configSource = read('songwars-config.js');
const server = read('server.js');
const config = require(path.join(root, 'songwars-config.js'));

const discordUrl = 'https://discord.gg/Awk2b7RSW';
const seoDescription = 'Join The Smack Club: Song Wars — 20 artists, direct battles, community voting, and Independence Day Weekend energy.';

assert.deepStrictEqual(
  {
    eventTitle: config.eventTitle,
    headline: config.headline,
    subheadline: config.subheadline,
    confirmedCount: config.confirmedCount,
    goalCount: config.goalCount,
    spotsLeft: config.spotsLeft,
    progressPercent: config.progressPercent,
    discordInviteUrl: config.discordInviteUrl,
    posterImagePath: config.posterImagePath,
    otpLogoPath: config.otpLogoPath,
    seoTitle: config.seoTitle,
    seoDescription: config.seoDescription,
    eventDateLabel: config.eventDateLabel,
    primaryHost: config.primaryHost,
    featuredParticipants: config.featuredParticipants,
    publicShareUrl: config.publicShareUrl
  },
  {
    eventTitle: 'THE SMACK CLUB: SONG WARS',
    headline: 'Independence Day Song Wars Weekend',
    subheadline: '20 artists. Direct battles. Community voting. Bragging rights.',
    confirmedCount: 12,
    goalCount: 20,
    spotsLeft: 8,
    progressPercent: 60,
    discordInviteUrl: discordUrl,
    posterImagePath: '/assets/songwars/songwars-poster.jpg',
    otpLogoPath: '/assets/songwars/otp-mark.png',
    seoTitle: 'Song Wars Weekend | OnlyTruePerspective',
    seoDescription,
    eventDateLabel: 'Sunday, July 5, 2026',
    primaryHost: '4reign',
    featuredParticipants: ['A1ZEK', 'SPOOKY', 'ELI3GANT', 'YUNG HAVOC', 'JDRVENGE'],
    publicShareUrl: 'https://onlytrueperspective.tech/songwars'
  },
  'the editable config contains the approved event and sharing values'
);

const sourceFiles = [html, css, configSource, server];
const discordOccurrences = sourceFiles.reduce(
  (count, source) => count + (source.match(/https:\/\/discord\.gg\/Awk2b7RSW/g) || []).length,
  0
);
assert.strictEqual(discordOccurrences, 1, 'the Discord invite is centralized in songwars-config.js');
assert.strictEqual(config.spotsLeft, config.goalCount - config.confirmedCount, 'spots left matches the event counts');
assert.strictEqual(config.progressPercent, (config.confirmedCount / config.goalCount) * 100, 'progress matches 12 of 20');
assert.deepStrictEqual(config.posterResponsiveSources.map(({ width }) => width), [480, 672, 800, 1200, 1600], 'responsive poster widths are centralized');
assert.deepStrictEqual(config.posterFallbackSources.map(({ width }) => width), [480, 672, 800, 1200, 1600], 'responsive poster fallback widths are centralized');
assert.strictEqual(config.people.length, 7, 'the featured people roster is centralized');
assert.deepStrictEqual(
  config.people.map(({ displayName, role, instagramUrl }) => ({ displayName, role, instagramUrl })),
  [
    { displayName: '4REIGN', role: 'Host', instagramUrl: 'https://www.instagram.com/killingpercs' },
    { displayName: 'ELI3GANT', role: 'Featured Artist / OTP', instagramUrl: 'https://www.instagram.com/eli3gant' },
    { displayName: 'SPOOKY', role: 'Featured Artist / The Smack Club', instagramUrl: 'https://www.instagram.com/akidnamedspooky' },
    { displayName: 'A1ZEK', role: 'Featured Artist', instagramUrl: 'https://www.instagram.com/a1z3k' },
    { displayName: 'YUNG HAVOC', role: 'Featured Artist', instagramUrl: 'https://www.instagram.com/yungxhavoc' },
    { displayName: 'JDRVENGE', role: 'Featured Artist', instagramUrl: 'https://www.instagram.com/jdrvenge' },
    { displayName: 'ONLYTRUEPERSPECTIVE', role: 'Production / Creative Direction / Platform', instagramUrl: 'https://www.instagram.com/onlytrueperspective' }
  ],
  'the approved roles and Instagram destinations stay editable in one config'
);

assert.match(server, /app\.get\(\['\/songwars', '\/songwars\/'\]/, 'server exposes /songwars and /songwars/');
assert.ok(server.includes("require('./songwars-config.js')"), 'server reads the centralized Song Wars config');
assert.ok(server.includes('renderSongWarsPage'), 'server renders share metadata and page content from config');

[
  '{{SEO_TITLE}}',
  '{{SEO_DESCRIPTION}}',
  '{{POSTER_IMAGE_URL}}',
  '{{POSTER_IMAGE_SRCSET}}',
  '{{POSTER_IMAGE_FALLBACK_SRCSET}}',
  '{{EVENT_TITLE}}',
  '{{HEADLINE}}',
  '{{SUBHEADLINE}}',
  '{{CONFIRMED_COUNT}}',
  '{{GOAL_COUNT}}',
  '{{SPOTS_LEFT}}',
  '{{PROGRESS_PERCENT}}',
  '{{DISCORD_INVITE_URL}}',
  '{{OTP_LOGO_PATH}}',
  '{{EVENT_DATE_LABEL}}',
  '{{PRIMARY_HOST}}',
  '{{FEATURED_PARTICIPANTS}}',
  '{{ARTIST_NODES}}',
  '{{FEATURED_PEOPLE_CARDS}}',
  '{{SONG_WARS_SCHEMA}}'
].forEach((token) => assert.ok(html.includes(token), `${token} is rendered from centralized config`));

assert.ok(html.includes('property="og:image" content="{{POSTER_IMAGE_URL}}"'), 'poster is the Open Graph preview');
assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), 'large Twitter card metadata is present');
assert.ok(html.includes('application/ld+json'), 'event schema is present');
assert.ok(html.includes('rel="canonical" href="https://www.onlytrueperspective.tech/songwars"'), 'canonical URL is correct');
assert.ok(html.includes('data-songwars-poster'), 'responsive poster is the featured hero visual');
assert.ok(html.includes('alt="{{POSTER_ALT}}"'), 'poster has config-derived alt text');
const posterNode = new JSDOM(html).window.document.querySelector('[data-songwars-poster]');
assert.ok(posterNode, 'poster image markup exists');
assert.ok(!posterNode.hasAttribute('height'), 'poster has no fixed HTML height');
assert.strictEqual(posterNode.getAttribute('srcset'), '{{POSTER_IMAGE_FALLBACK_SRCSET}}', 'poster has a responsive JPEG fallback source set');
assert.ok(posterNode.hasAttribute('sizes'), 'poster declares responsive display sizes');
assert.strictEqual(new JSDOM(html).window.document.querySelector('source[type="image/webp"]').getAttribute('srcset'), '{{POSTER_IMAGE_SRCSET}}', 'poster prefers responsive WebP sources');
assert.ok(html.includes('Hosted by {{PRIMARY_HOST}}. Presented with The Smack Club. Powered by OnlyTruePerspective.'), '4reign receives the primary host credit');
assert.ok(html.includes('Featured participants'), 'participant roster is labeled clearly');
assert.ok(!html.includes('Additional hosts'), 'featured participants are not mislabeled as hosts');
assert.ok(!html.includes('Hosted by The Smack Club.'), 'The Smack Club is not mislabeled as the event host');
assert.strictEqual((html.match(/data-discord-cta/g) || []).length, 3, 'hero, middle, and final registration CTAs use the Discord destination');
assert.ok(html.includes('href="#details"'), 'View Details remains an in-page details link');

[
  'Song Wars is a community music battle hosted for Independence Day Weekend. Artists submit music, get matched into battles, and the community votes through Discord.',
  'Join the Discord',
  'Register your artist name',
  'Submit your song',
  'Battle and get votes',
  'Bracket reveals after registration closes.',
  'Community Voting + Official Judges',
  'Prize Announcement Coming Soon.',
  'One Bracket. Twenty Artists. One Champion.',
  'Only {{SPOTS_LEFT}} spots left. Lock in before the bracket fills.'
].forEach((copy) => assert.ok(html.includes(copy), `${copy} appears on the page`));

assert.ok(css.includes('overflow-x: hidden'), 'mobile layout prevents horizontal overflow');
assert.ok(css.includes('min-height: 48px'), 'action links meet minimum touch target size');
assert.ok(css.includes(':focus-visible'), 'keyboard focus is visible');
assert.ok(css.includes('prefers-reduced-motion'), 'reduced motion is respected');
assert.ok(css.includes('@keyframes songwars-poster-float'), 'poster receives subtle GPU-composited ambient motion');
assert.ok(css.includes('@media (min-width: 768px)'), 'tablet layout is defined');
assert.ok(css.includes('@media (min-width: 1024px)'), 'desktop layout is defined');
assert.match(css, /\.poster-frame img\s*\{[^}]*height:\s*auto;/s, 'poster keeps its intrinsic square ratio at every breakpoint');
assert.match(css, /\.poster-frame img\s*\{[^}]*object-fit:\s*contain;/s, 'poster shows the full composition without cropping');
assert.doesNotMatch(css, /\.poster-frame img\s*\{[^}]*aspect-ratio:/s, 'poster ratio is not forced by CSS');
assert.ok(html.includes('<script src="/songwars.js'), 'small progressive-enhancement script is loaded');
assert.ok(clientJs.includes('IntersectionObserver'), 'scroll reveals use IntersectionObserver');
assert.ok(clientJs.includes('prefers-reduced-motion'), 'client motion honors reduced-motion preferences');
assert.ok(!clientJs.includes('addEventListener(\'scroll\''), 'client code does not install a scroll listener');
assert.ok(!clientJs.includes('fetch('), 'client code makes no extra network requests');

const app = require(path.join(root, 'server.js'));
assert.ok(app.__songWarsTestHooks, 'Song Wars renderer test hooks are available');
const previewHtml = app.__songWarsTestHooks.renderSongWarsPage('https://songwars-preview.example');
assert.ok(
  previewHtml.includes('property="og:image" content="https://songwars-preview.example/assets/songwars/songwars-poster.jpg"'),
  'preview metadata uses the current deployment origin for the poster asset'
);
assert.match(server, /renderSongWarsPage\(getRequestOrigin\(req\)\)/, 'Song Wars route renders metadata from the request origin');

const renderedDocument = new JSDOM(previewHtml).window.document;
assert.strictEqual(renderedDocument.querySelectorAll('.artist-node').length, 20, 'registration rail renders all twenty artist spots');
assert.strictEqual(renderedDocument.querySelectorAll('.artist-node.is-confirmed').length, 12, 'registration rail fills twelve confirmed spots');
assert.strictEqual(renderedDocument.querySelectorAll('.person-card').length, 7, 'all approved people render');
assert.strictEqual(renderedDocument.querySelectorAll('.person-card a[target="_blank"]').length, 7, 'all Instagram profiles open in a new tab');
assert.ok(previewHtml.includes('JDRVENGE'), 'JDRVENGE is included in the rendered page');
assert.ok(previewHtml.includes('https://www.instagram.com/jdrvenge'), 'JDRVENGE Instagram link is rendered');
assert.ok(!previewHtml.includes('JD REVENGE'), 'retired JD REVENGE display name is not rendered');

const workflow = read('.github/workflows/production-release.yml');
const sweep = read('scripts/prod_full_sweep.js');
assert.ok((workflow.match(/OTP_SWEEP_DEFER: songwars,songwars-poster/g) || []).length >= 2, 'pre-deploy sweeps continue deferring Song Wars');
assert.match(workflow, /Deploy prebuilt production output[\s\S]*Post-deploy public production sweep[\s\S]*npm run prod:full-sweep/, 'the complete sweep remains after deployment');
assert.ok(sweep.includes("name: 'songwars'") && sweep.includes("name: 'songwars-poster'"), 'the post-deploy sweep still checks the page and poster');

console.log('Song Wars landing page contract passed.');
