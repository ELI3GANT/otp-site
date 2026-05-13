/**
 * OTP YouTube video contract.
 * Guards the shared video library, archive/featured mounts, and safe fallback behavior.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const videos = require('../otp-video-library.js');

console.log('OTP YOUTUBE VIDEO CONTRACT...');

const server = read('server.js');
const index = read('index.html');
const archive = read('archive.html');
const siteInit = read('site-init.js');

const fallback = videos.getFallbackVideos();
const tjVideos = fallback.filter((video) => video.id === 'j70o4Psmxfk');
assert.strictEqual(tjVideos.length, 1, 'TJ video appears once in fallback library');
assert.strictEqual(tjVideos[0].title, 'TJ\u2019S NIGHT | Shot + Edited by OnlyTruePerspective');
assert.match(tjVideos[0].url, /^https:\/\/www\.youtube\.com\/watch\?v=j70o4Psmxfk$/);
assert.match(tjVideos[0].embedUrl, /^https:\/\/www\.youtube\.com\/embed\/j70o4Psmxfk$/);
assert.match(tjVideos[0].thumbnail, /^https:\/\/i\.ytimg\.com\/vi\/j70o4Psmxfk\//);
assert.strictEqual(tjVideos[0].category, 'Video / Recap');

const classifiedMusic = videos.normalizeVideo({
    id: 'A1b2C3d4E5f',
    title: 'Fame & Fortune | Official Music Visual',
    description: 'Music visuals and post-production from OTP.'
});
assert.strictEqual(classifiedMusic.category, 'Music / Visuals', 'music videos classify beyond recap');

const classifiedSystem = videos.normalizeVideo({
    id: 'Z9y8X7w6V5u',
    title: 'OTP Client Portal Flow',
    description: 'Website and booking system build for the brand.'
});
assert.strictEqual(classifiedSystem.category, 'Creative Systems', 'systems work classifies beyond recap');

const classifiedBrand = videos.normalizeVideo({
    id: 'Q1w2E3r4T5y',
    title: 'Perspective Sweep: Identity Rollout',
    description: 'Brand identity direction and logo refinement.'
});
assert.strictEqual(classifiedBrand.category, 'Brand Work', 'brand work classifies beyond recap');

const featured = videos.getFeaturedVideos(fallback, 4);
assert.strictEqual(featured[0].id, 'j70o4Psmxfk', 'latest fallback video is first in Featured Work');
assert.strictEqual(new Set(featured.map((video) => video.id)).size, featured.length, 'featured videos are deduped');

const merged = videos.mergeVideoLists([
    { id: 'j70o4Psmxfk', title: '<img src=x onerror=alert(1)>TJ', thumbnail: 'javascript:alert(1)' },
    { url: 'https://youtu.be/j70o4Psmxfk', title: 'duplicate' }
], fallback);
assert.strictEqual(merged.filter((video) => video.id === 'j70o4Psmxfk').length, 1, 'merge removes duplicate YouTube IDs');
assert.ok(!merged[0].title.includes('<'), 'video title normalization strips HTML');
assert.ok(!merged[0].thumbnail.startsWith('javascript:'), 'unsafe thumbnails are rejected');

for (const video of fallback) {
    assert.strictEqual(video.source, 'youtube', `source normalized for ${video.id}`);
    assert.match(video.url, /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/);
    assert.match(video.embedUrl, /^https:\/\/www\.youtube\.com\/embed\/[A-Za-z0-9_-]{11}$/);
    assert.match(video.thumbnail, /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\//);
    assert.ok(!/otp-os|supabase|localhost|127\.0\.0\.1/i.test(JSON.stringify(video)), 'public videos expose no internal URLs');
}

assert.ok(index.includes('data-video-feed="featured"'), 'homepage mounts Featured Work from video feed');
assert.ok(index.includes('otp-video-library.js?v='), 'homepage loads shared video library');
assert.ok(index.includes('Book OTP'), 'homepage video area keeps Book OTP CTA visible');
assert.ok(archive.includes('data-video-feed="archive"'), 'archive mounts Vault from video feed');
assert.ok(archive.includes('Video / Recap'), 'archive exposes requested category filters');
assert.ok(archive.includes('Music / Visuals'), 'archive exposes requested category filters');
assert.ok(archive.includes('Creative Systems'), 'archive exposes requested category filters');
assert.ok(archive.includes('otp-video-library.js?v='), 'archive loads shared video library');

assert.match(server, /app\.get\('\/api\/youtube\/videos'/, 'server exposes YouTube videos API');
assert.match(server, /'\/vault': 'archive\.html'/, 'server exposes Vault alias to archive');
assert.ok(server.includes('youtube.com/feeds/videos.xml'), 'server attempts YouTube RSS sync');
assert.ok(server.includes('YOUTUBE_API_KEY'), 'server can use YouTube Data API only when env exists');
assert.ok(server.includes('Showing saved videos while YouTube updates.'), 'server returns clean fallback message');
assert.ok(siteInit.includes('/api/youtube/videos'), 'client fetches normalized video API');
assert.ok(siteInit.includes('textContent'), 'client renderer uses text nodes for video copy');
assert.ok(!siteInit.includes('innerHTML = `<iframe'), 'client does not inject raw iframe HTML');

console.log('   OK: OTP YouTube video contract');
console.log('OTP YOUTUBE VIDEO CONTRACT COMPLETE');
