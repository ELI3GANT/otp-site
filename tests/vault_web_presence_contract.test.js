const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const vault = read('vault/index.html');
const privacy = read('vault/privacy.html');
const css = read('vault/vault.css');
const server = read('server.js');
const vercel = read('vercel.json');

assert.ok(vault.includes('<title>VAULT — Private Music Masters &amp; Release Planning | OnlyTruePerspective</title>'), 'VAULT product page has its App Store-facing title');
assert.ok(vault.includes('https://onlytrueperspective.tech/vault'), 'VAULT product page has the canonical public URL');
assert.ok(vault.includes('"@type": "SoftwareApplication"'), 'VAULT product page publishes SoftwareApplication structured data');
assert.ok(vault.includes('"softwareVersion": "1.0.0"'), 'VAULT structured data matches shipping version 1.0.0');
assert.ok(vault.includes('Coming to the App Store'), 'VAULT does not fabricate an App Store link before release');
assert.ok(vault.includes('Considering</li><li>Shortlist</li><li>Release Candidate</li><li>Rollout</li><li>Scheduled</li><li>Released'), 'VAULT accurately lists the SIGNAL lifecycle');
assert.ok(vault.includes('15-milestone checklist'), 'VAULT accurately describes the SIGNAL checklist');
assert.ok(vault.includes('/vault/privacy'), 'VAULT prominently links its privacy policy');
assert.ok(!/appstore\.com|apps\.apple\.com/i.test(vault), 'VAULT does not fabricate an App Store URL');

for (const asset of ['onboarding.png', 'home.png', 'library.png', 'signal.png', 'profile.png', 'release-dossier.png']) {
  assert.ok(fs.existsSync(path.join(root, 'assets', 'vault', asset)), `VAULT screenshot asset exists: ${asset}`);
  assert.ok(vault.includes(`/assets/vault/${asset}`), `VAULT page references screenshot asset: ${asset}`);
}

assert.ok(privacy.includes('<title>VAULT Privacy Policy | OnlyTruePerspective</title>'), 'privacy page has the required title');
assert.ok(privacy.includes('<link rel="canonical" href="https://onlytrueperspective.tech/vault/privacy" />'), 'privacy page has the canonical URL');
assert.ok(privacy.includes('Effective date: September 20, 2026'), 'privacy page uses the current production date');
for (const heading of ['1. Overview', '2. Data collection', '3. Music and user content', '4. Network and server use', '5. Backups and exports', '6. Apple services', '7. Third-party services', '8. Children', '9. Security', '10. Data retention', '11. Deleting data', '12. Changes to this policy', '13. Contact']) assert.ok(privacy.includes(heading), `privacy section exists: ${heading}`);
assert.ok(privacy.includes('contact@onlytrueperspective.tech'), 'privacy page uses the verified OTP contact email');
assert.ok(privacy.includes('does not collect personal data through VAULT'), 'privacy page states the audited collection boundary');
assert.ok(privacy.includes('no VAULT network requests'), 'privacy page accurately states the audited network boundary');

assert.match(server, /'\/vault': 'vault\/index\.html'/, 'Express serves /vault as the product page');
assert.match(server, /'\/vault\/privacy': 'vault\/privacy\.html'/, 'Express serves /vault/privacy as the policy page');
assert.match(server, /app\.get\('\/vault\/index\.html'/, 'Express redirects duplicate VAULT index URL');
assert.match(server, /app\.get\('\/vault\/privacy\.html'/, 'Express redirects duplicate privacy URL');
assert.ok(vercel.includes('"dest": "/vault/index.html"'), 'Vercel serves the VAULT product route');
assert.ok(vercel.includes('"dest": "/vault/privacy.html"'), 'Vercel serves the VAULT privacy route');
assert.ok(css.includes('@media (max-width:760px)'), 'VAULT CSS has responsive rules');
assert.ok(!/localhost/i.test(vault + privacy), 'VAULT public pages have no localhost references');

console.log('VAULT web presence contract passed');
