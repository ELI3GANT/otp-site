// tests/settings_persistence_test.js
// Unit tests for Settings Persistence (Mocking Browser Environment)

const assert = require('assert');

// 1. MOCK BROWSER ENVIRONMENT
const localStorageStore = {};
const localStorageMock = {
    getItem: (key) => localStorageStore[key] || null,
    setItem: (key, val) => { localStorageStore[key] = val.toString(); },
    removeItem: (key) => { delete localStorageStore[key]; }
};

const documentMock = {
    elements: {},
    getElementById: function(id) {
        if (!this.elements[id]) {
            this.elements[id] = {
                id: id,
                value: '',
                listeners: {},
                addEventListener: function(event, callback) {
                    this.listeners[event] = callback;
                },
                dispatchEvent: function(event) {
                    if (this.listeners[event.type]) {
                        this.listeners[event.type]({ target: this });
                    }
                }
            };
        }
        return this.elements[id];
    }
};

// 2. LOGIC TO TEST (Extracted from admin-core.js)
const SettingsLogic = {
    bindPersist: function(el, key, onUpdate) {
        if(el) {
            el.value = localStorageMock.getItem(key) || '';
            el.addEventListener('input', (e) => {
                localStorageMock.setItem(key, e.target.value.trim());
                if (onUpdate) onUpdate();
            });
        }
    }
};

// 3. TEST SUITE
console.log("🧪 STARTING SETTINGS PERSISTENCE UNIT TESTS...");

try {
    // TEST 1: Load from localStorage
    console.log("   Test 1: Load from localStorage...");
    localStorageMock.setItem('test_key', 'stored_value');
    const mockEl = documentMock.getElementById('testInput');
    SettingsLogic.bindPersist(mockEl, 'test_key');
    
    assert.strictEqual(mockEl.value, 'stored_value', "Element value should be loaded from localStorage");
    console.log("   ✅ PASSED");

    // TEST 2: Save to localStorage on input
    console.log("   Test 2: Save to localStorage on input...");
    mockEl.value = '  new_value  ';
    mockEl.dispatchEvent({ type: 'input' });
    
    assert.strictEqual(localStorageMock.getItem('test_key'), 'new_value', "Value should be trimmed and saved to localStorage");
    console.log("   ✅ PASSED");

    // TEST 3: Callback execution
    console.log("   Test 3: Callback execution...");
    let callbackCalled = false;
    SettingsLogic.bindPersist(mockEl, 'test_key', () => { callbackCalled = true; });
    mockEl.value = 'trigger_callback';
    mockEl.dispatchEvent({ type: 'input' });
    
    assert.strictEqual(callbackCalled, true, "Callback should be executed on input");
    console.log("   ✅ PASSED");

    console.log("\n🎉 ALL SETTINGS PERSISTENCE TESTS PASSED.");

} catch (e) {
    console.error("\n❌ TEST FAILED:", e.message);
    process.exit(1);
}
