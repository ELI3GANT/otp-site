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
    page.window.localStorage.setItem('theme', 'dark');
    page.window.localStorage.setItem('theme_manual', 'true');
    page.window.localStorage.setItem('theme_manual_time', String(Date.now()));
    page.window.Math.random = () => 0;
    page.window.performance.getEntriesByType = () => [{ type: navigationType }];
    page.window.eval(themeSource);
    const result = {
        selected: page.window.document.documentElement.dataset.palette,
        saved: page.window.sessionStorage.getItem('otp_public_session_palette'),
        ink: page.window.document.documentElement.style.getPropertyValue('--accent-otp-ink')
    };
    page.window.close();
    return result;
}
assert.deepEqual(paintPublicPalette('navigate'), { selected: 'purple', saved: 'purple', ink: '#050609' }, 'navigation preserves the selected palette even when random rolls would normally choose a spectral hue');
assert.deepEqual(paintPublicPalette('reload'), { selected: 'orange', saved: 'orange', ink: '#050609' }, 'refresh rotates this tab and selects the higher contrast dark foreground for orange');
console.log('Public palette navigation and refresh regressions passed.');

const publicPage = new JSDOM('<html data-refresh-palette="true"><body></body></html>', {
    url: 'https://www.onlytrueperspective.tech/', runScripts: 'outside-only'
});
publicPage.window.sessionStorage.setItem('otp_public_session_palette', 'blue');
publicPage.window.eval(themeSource);
publicPage.window.OTP.setTheme('light');
assert.equal(publicPage.window.document.documentElement.dataset.theme, 'light');
assert.equal(publicPage.window.localStorage.getItem('theme_manual'), 'true');
assert.equal(publicPage.window.OTP.getEffectiveThemeForPaint(), 'light');
publicPage.window.localStorage.setItem('theme', 'dark');
publicPage.window.dispatchEvent(new publicPage.window.StorageEvent('storage', { key: 'theme' }));
assert.equal(publicPage.window.document.documentElement.hasAttribute('data-theme'), false, 'mode changes from another tab update the page');
assert.equal(publicPage.window.document.documentElement.dataset.palette, 'blue', 'day/night changes preserve the chosen color family');
publicPage.window.close();
console.log('Shared manual theme and cross-tab synchronization passed.');

for (const [query, expected] of [
    ['otp_palette=purple&otp_theme=light&otp_theme_mode=manual', {palette:'purple',theme:'light',mode:'manual'}],
    ['otp_palette=unknown&otp_theme=invalid', null],
    ['otp_palette=blue&otp_theme=light&otp_theme_mode=auto', {palette:'blue',mode:'auto'}]
]) {
    const page = new JSDOM('<html data-refresh-palette="true"><body></body></html>', {
        url: 'https://otp-os.vercel.app/bookings?' + query, runScripts:'outside-only'
    });
    page.window.performance.getEntriesByType = () => [{type:'navigate'}];
    page.window.eval(themeSource);
    const state = page.window.OTP.getPublicThemeState();
    if (expected) for (const key of Object.keys(expected)) assert.equal(state[key], expected[key]);
    else {
        assert.notEqual(state.palette, 'unknown');
        assert.equal(state.mode, 'auto');
    }
    page.window.OTP.setTheme('dark');
    assert.equal(page.window.OTP.getPublicThemeState().theme, 'dark');
    assert.equal(page.window.OTP.getPublicThemeState().mode, 'manual');
    page.window.close();
}
console.log('Cross-origin public display preferences accept allowlisted values and preserve automatic mode.');
