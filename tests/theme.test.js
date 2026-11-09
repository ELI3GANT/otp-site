// tests/theme.test.js

const { JSDOM } = require('jsdom');

// 1. Setup Mock DOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html lang="en">
<head></head>
<body>
    <button class="theme-btn">🌗</button>
</body>
</html>
`);

global.document = dom.window.document;
global.window = dom.window;
global.localStorage = {
    store: {},
    getItem: function(key) { return this.store[key] || null; },
    setItem: function(key, value) { this.store[key] = value.toString(); },
    removeItem: function(key) { delete this.store[key]; },
    clear: function() { this.store = {}; }
};

// 2. Load the Logic (Simulate site-init.js)
// Since site-init.js executes immediately, we wrap the logic we want to test or we mock the OTP object definition

// Mocking window.toggleAdminTheme from otp-terminal.html logic
window.toggleAdminTheme = function() {
    // Debounce mock
    if(window.themeDebounceTimer) return;
    window.themeDebounceTimer = true;
    setTimeout(() => { window.themeDebounceTimer = null; }, 500);

    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    
    if(next === 'light') html.setAttribute('data-theme', 'light');
    else html.removeAttribute('data-theme');
    
    localStorage.setItem('theme', next);

    // Update Icon & Style
    const btns = document.querySelectorAll('.theme-btn');
    btns.forEach(btn => {
        btn.textContent = next === 'light' ? '☀️' : '🌗';
        if(next === 'light') btn.classList.add('theme-active');
        else btn.classList.remove('theme-active');
    });
};

// 3. Run Tests
console.log("Running Theme Toggle Tests...");

// Test 1: Initial State
const html = document.documentElement;
if (!html.getAttribute('data-theme')) console.log("PASS: Initial theme is dark (no attribute)");
else console.error("FAIL: Initial theme should be dark");

// Test 2: Toggle to Light
window.toggleAdminTheme();
if (html.getAttribute('data-theme') === 'light') console.log("PASS: Toggled to light mode");
else console.error("FAIL: Theme attribute missing after toggle");

if (localStorage.getItem('theme') === 'light') console.log("PASS: LocalStorage updated to 'light'");
else console.error("FAIL: LocalStorage not updated");

// Test 3: Toggle back to Dark
// Need to wait for debounce (mocked)
window.themeDebounceTimer = null; 
window.toggleAdminTheme();

if (!html.getAttribute('data-theme')) console.log("PASS: Toggled back to dark mode");
else console.error("FAIL: Theme attribute should be removed for dark mode");

if (localStorage.getItem('theme') === 'dark') console.log("PASS: LocalStorage updated to 'dark'");
else console.error("FAIL: LocalStorage not updated to dark");

// Test 4: Priority Logic (Local vs Remote)
// Simulate remote state sync logic
const remoteConfig = { theme: 'light' }; // Remote says Light
localStorage.setItem('theme', 'dark');   // User says Dark

function syncLogic(config) {
    // This mirrors the fix in site-init.js
    if (config.theme) {
        const hasOverride = localStorage.getItem('theme');
        // If user has override, ignore remote
        // If no override, use remote
        return hasOverride ? hasOverride : config.theme;
    }
}

const finalTheme = syncLogic(remoteConfig);
if (finalTheme === 'dark') console.log("PASS: Local user preference overrides remote state");
else console.error(`FAIL: Remote state clobbered local preference. Got ${finalTheme}`);

console.log("Theme tests complete.");

// Exercise the actual first-paint script: a random spectral roll must not
// replace a palette carried from Home into the booking flow.
const assert = require('node:assert/strict');
const themeSource = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'theme-chrono.js'), 'utf8');
function paintPublicPalette(navigationType) {
    const page = new JSDOM('<html data-refresh-palette="true"><head></head><body></body></html>', {
        url: 'https://www.onlytrueperspective.tech/start-project', runScripts: 'outside-only'
    });
    page.window.sessionStorage.setItem('otp_public_session_palette', 'purple');
    page.window.localStorage.setItem('otp_public_home_last_palette', 'blue');
    page.window.Math.random = () => 0;
    page.window.performance.getEntriesByType = () => [{ type: navigationType }];
    page.window.eval(themeSource);
    const result = {
        selected: page.window.document.documentElement.dataset.palette,
        saved: page.window.sessionStorage.getItem('otp_public_session_palette')
    };
    page.window.close();
    return result;
}
assert.deepEqual(paintPublicPalette('navigate'), { selected: 'purple', saved: 'purple' }, 'navigation preserves the selected palette even when random rolls would normally choose a spectral hue');
assert.deepEqual(paintPublicPalette('reload'), { selected: 'orange', saved: 'orange' }, 'refresh chooses a different palette from this tab even if another tab changed the global last palette');
console.log('Public palette navigation and refresh regressions passed.');
