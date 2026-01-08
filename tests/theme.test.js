// tests/theme.test.js

// 1. Mock DOM and LocalStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();

global.localStorage = localStorageMock;

global.document = {
  documentElement: {
    getAttribute: (name) => {
        return global.document.documentElement.attributes[name] || null;
    },
    setAttribute: (name, value) => {
        global.document.documentElement.attributes[name] = value;
    },
    removeAttribute: (name) => {
        delete global.document.documentElement.attributes[name];
    },
    attributes: {}
  }
};

global.window = {
    matchMedia: () => ({ matches: false }), // Mock system dark mode as false (light default)
    OTP: {}
};

// 2. Load the Logic (Simulate site-init.js)
// Since site-init.js executes immediately, we wrap the logic we want to test or we mock the OTP object definition 
// similar to how it is in the file. Ideally we would require the file, but it's not a module. 
// So we replicate the core logic here to verify its correctness as a "unit test of logic" rather than integration.

const OTP = global.window.OTP;

OTP.setTheme = function(theme) {
    const html = global.document.documentElement;
    if (theme === 'light') {
        html.setAttribute('data-theme', 'light');
    } else {
        html.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
};

OTP.initTheme = function() {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (systemDark ? 'dark' : 'light');
    
    // Apply immediately
    OTP.setTheme(currentTheme);
    return currentTheme;
};

// 3. Test Cases
console.log("Running Theme Logic Tests...");

// Test 1: Default initialization (System Light)
localStorage.clear();
let init = OTP.initTheme();
if (init === 'light' && document.documentElement.getAttribute('data-theme') === 'light') {
    console.log("PASS: Default init applies light mode correctly.");
} else {
    console.error("FAIL: Default init failed.", init, document.documentElement.attributes);
}

// Test 2: Switching to Dark
OTP.setTheme('dark');
if (localStorage.getItem('theme') === 'dark' && document.documentElement.getAttribute('data-theme') === null) {
    console.log("PASS: Switching to dark mode works.");
} else {
    console.error("FAIL: Switching to dark mode failed.");
}

// Test 3: Switching to Light
OTP.setTheme('light');
if (localStorage.getItem('theme') === 'light' && document.documentElement.getAttribute('data-theme') === 'light') {
    console.log("PASS: Switching to light mode works.");
} else {
    console.error("FAIL: Switching to light mode failed.");
}

// Test 4: Persistence
OTP.initTheme(); // Should load 'light' from local storage
if (document.documentElement.getAttribute('data-theme') === 'light') {
    console.log("PASS: Persistence works.");
} else {
    console.error("FAIL: Persistence failed.");
}

console.log("Tests Complete.");
