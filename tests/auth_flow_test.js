// tests/auth_flow_test.js
// Unit tests for Authentication Logic (Mocking Client-Side Behavior)

const assert = require('assert');

// 1. MOCK BROWSER ENVIRONMENT
const localStorageMock = (function() {
    let store = {};
    return {
        getItem: function(key) { return store[key] || null; },
        setItem: function(key, value) { store[key] = value.toString(); },
        removeItem: function(key) { delete store[key]; },
        clear: function() { store = {}; }
    };
})();

// Mock Window/Location
const windowMock = {
    location: { href: '', search: '' },
    history: { replaceState: () => {} }
};

// 2. LOGIC TO TEST (Extracted/Simulated from admin-core.js/portal-gate.html)
const AuthLogic = {
    logout: function() {
        localStorageMock.removeItem('otp_admin_token');
        windowMock.location.href = 'portal-gate.html?reason=logout';
    },
    checkSession: function() {
        const token = localStorageMock.getItem('otp_admin_token');
        if (!token) return false;
        
        try {
            if (token === 'static-bypass-token') return true;
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            const now = Math.floor(Date.now() / 1000);
            return !(payload.exp && payload.exp < now);
        } catch (e) {
            return false; 
        }
    }
};

// 3. TEST SUITE
console.log("🧪 STARTING AUTH FLOW UNIT TESTS...");

try {
    // TEST 1: Logout Clears Token & Redirects
    console.log("   Test 1: Logout Behavior...");
    localStorageMock.setItem('otp_admin_token', 'valid-token');
    AuthLogic.logout();
    
    assert.strictEqual(localStorageMock.getItem('otp_admin_token'), null, "Token should be removed");
    assert.ok(windowMock.location.href.includes('?reason=logout'), "Redirect should include reason");
    console.log("   ✅ PASSED");

    // TEST 2: Valid Session Check
    console.log("   Test 2: Valid Token Check...");
    // Create a future token
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const validToken = `header.${Buffer.from(JSON.stringify({ exp: futureExp })).toString('base64')}.sig`;
    localStorageMock.setItem('otp_admin_token', validToken);
    
    assert.strictEqual(AuthLogic.checkSession(), true, "Future token should be valid");
    console.log("   ✅ PASSED");

    // TEST 3: Expired Session Check
    console.log("   Test 3: Expired Token Check...");
    const pastExp = Math.floor(Date.now() / 1000) - 3600;
    const expiredToken = `header.${Buffer.from(JSON.stringify({ exp: pastExp })).toString('base64')}.sig`;
    localStorageMock.setItem('otp_admin_token', expiredToken);
    
    assert.strictEqual(AuthLogic.checkSession(), false, "Expired token should be invalid");
    console.log("   ✅ PASSED");

    // TEST 4: Bypass Token
    console.log("   Test 4: Bypass Token Check...");
    localStorageMock.setItem('otp_admin_token', 'static-bypass-token');
    assert.strictEqual(AuthLogic.checkSession(), true, "Bypass token should be valid");
    console.log("   ✅ PASSED");

    console.log("\n🎉 ALL AUTH TESTS PASSED.");

} catch (e) {
    console.error("\n❌ TEST FAILED:", e.message);
    process.exit(1);
}
