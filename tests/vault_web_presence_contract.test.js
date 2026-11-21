const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

async function main() {
  const dom = new JSDOM(read('vault/index.html'), { url: 'https://onlytrueperspective.tech/vault', runScripts: 'outside-only' });
  const { window } = dom;
  window.matchMedia = () => ({ matches: true });
  window.Element.prototype.scrollIntoView = () => {};
  window.eval(read('vault/launch.js'));
  const page = window.document;
  const schema = JSON.parse(page.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(schema.operatingSystem, 'iOS 26.0 or later');
  assert.equal(page.querySelector('.explore').href, 'https://apps.apple.com/app/id6814101540');
  assert.ok(page.querySelector('.answers a[href="https://apps.apple.com/app/id6814101540"]'), 'App Store is reachable after the product overview');
  for (const name of ['library', 'signal', 'artist-setup', 'onboarding', 'player']) {
    const button = page.querySelector(`.feature[data-screen="${name}"]`);
    button.click();
    assert.equal(page.querySelector('#feature-screen').getAttribute('src'), `/assets/vault/launch/${name}.png`);
    assert.ok(page.querySelector('#feature-screen').alt.length > 0);
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(page.querySelectorAll('.feature[aria-pressed="true"]').length, 1);
  }
  const preview = page.querySelector('.customization-link');
  preview.click();
  assert.equal(page.querySelector('#feature-screen').getAttribute('src'), '/assets/vault/launch/artist-setup.png');
  assert.equal(page.querySelector('.feature[data-screen="artist-setup"]').getAttribute('aria-pressed'), 'true');
  assert.equal(page.querySelectorAll('.feature[aria-pressed="true"]').length, 1);
  assert.equal(preview.getAttribute('aria-pressed'), null, 'artist preview remains an action button');
  window.close();

  process.env.E2E_TEST_MODE = 'true';
  process.env.E2E_TEST_CLIENT_EMAIL = 'test@onlytrueperspective.tech';
  process.env.E2E_TEST_PORTAL_TOKEN = 'test-safe-portal-token';
  const app = require('../server.js');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const [route, title] of [['/vault', 'Private Music Masters'], ['/vault/', 'Private Music Masters'], ['/vault/privacy', 'VAULT Privacy Policy'], ['/vault/support', 'VAULT Support']]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200, `${route} serves successfully`);
      assert.ok((await response.text()).includes(title), `${route} serves the intended page`);
    }
    for (const [route, destination] of [['/vault/index.html', '/vault'], ['/vault/privacy.html', '/vault/privacy'], ['/vault/support.html', '/vault/support']]) {
      const response = await fetch(base + route, { redirect: 'manual' });
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('location'), destination);
    }
    for (const name of ['studio', 'library', 'player', 'signal', 'artist-setup', 'onboarding', 'app-icon']) {
      const response = await fetch(`${base}/assets/vault/launch/${name}.png`);
      assert.equal(response.status, 200, `${name} capture resolves`);
      assert.match(response.headers.get('content-type'), /^image\/png/);
      assert.ok((await response.arrayBuffer()).byteLength > 1000);
    }
    for (const route of ['/vault/launch.css', '/vault/launch.js']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('VAULT real routes, redirects, assets and screenshot interactions passed');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
