const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { palette, choose } = require('../public-accent');
const { clips, startAt } = require('../home-reel');
const library = require('../otp-video-library');
for (const color of palette) {
  for (const random of [0, 0.2, 0.8, 0.999]) {
    assert.notEqual(choose(color, random), color, 'reload selects a different accent');
    assert.ok(palette.includes(choose(color, random)));
  }
}
for (const clip of clips) assert.ok(library.getFallbackVideos().some(video => video.id === clip.id), 'showcase uses the real curated library');
for (const duration of [4, 11, 100, 500]) for (const random of [0, .99]) assert.ok(startAt(duration, random) <= Math.max(0, duration - 6), 'cuts leave enough playback time');

function fixture(reduceMotion = false, saveData = false) {
  const dom = new JSDOM(fs.readFileSync('index.html', 'utf8'), { url: 'https://www.onlytrueperspective.tech/', runScripts: 'outside-only', pretendToBeVisual: true });
  const window = dom.window;
  let observe, options, instance, motionChange, timerId = 0;
  const timers = new Map();
  window.matchMedia = () => ({ matches: reduceMotion, addEventListener: (_, callback) => { motionChange = callback; } });
  Object.defineProperty(window.navigator, 'connection', { value: { saveData } });
  window.setTimeout = (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; };
  window.clearTimeout = id => timers.delete(id);
  window.IntersectionObserver = class { constructor(callback) { observe = callback; } observe() {} };
  window.YT = { Player: function (_, config) {
    options = config;
    instance = { mute() {}, pauseVideo() {}, playVideo() {}, loadVideoById(clip) { instance.clip = clip; }, getIframe() { return window.document.createElement('iframe'); }, getDuration() { return 100; }, seekTo(value) { instance.position = value; } };
    return instance;
  } };
  window.eval(fs.readFileSync('home-reel.js', 'utf8'));
  return { dom, window, timers, get player() { return instance; }, get options() { return options; }, visible(value) { observe([{ isIntersecting: value }]); }, motion() { motionChange({ matches: true }); } };
}
for (const [reduce, save] of [[true, false], [false, true]]) {
  const f = fixture(reduce, save); f.visible(true);
  assert.equal(f.player, undefined, 'accessibility and data saving prevent automatic YouTube loading');
  assert.equal(f.window.document.querySelector('[data-reel-toggle]').hidden, false);
  f.dom.window.close();
}
const f = fixture(); f.visible(true);
f.options.events.onReady({ target: f.player });
f.options.events.onStateChange({ data: 1, target: f.player });
assert.equal(f.window.document.querySelector('[data-home-reel]').dataset.state, 'playing');
const cut = [...f.timers.values()].find(timer => timer.delay === 5000);
assert.ok(cut, 'rotation starts after real playback'); cut.callback();
assert.equal(f.player.clip.videoId, clips[1].id, 'five-second timer selects the next real film');
f.options.events.onStateChange({ data: 2, target: f.player });
assert.equal(f.window.document.querySelector('[data-home-reel]').dataset.state, 'loading', 'YouTube transition pause does not cancel the next clip');
assert.ok([...f.timers.values()].some(timer => timer.delay === 15000), 'loading retains its failure timeout');
f.options.events.onStateChange({ data: 1, target: f.player });
f.visible(false); assert.equal(f.timers.size, 0, 'off-screen playback stops timers');
f.visible(true); f.options.events.onStateChange({ data: 1, target: f.player });
f.motion(); assert.equal(f.timers.size, 0, 'motion preference changes stop active rotation');
f.options.events.onAutoplayBlocked();
assert.equal(f.window.document.querySelector('[data-reel-status]').hidden, false, 'blocked playback gives a truthful fallback');
f.dom.window.close();
console.log('Public accents and film showcase behavior passed.');
