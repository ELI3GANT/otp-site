
// tests/menu_logic_test.js

// Mock DOM Elements
class MockElement {
    constructor(name) {
        this.name = name;
        this.classList = new Set();
        this.attributes = {};
        this.listeners = {};
    }

    addEventListener(event, callback) {
        this.listeners[event] = callback;
    }

    click() {
        if (this.listeners['click']) this.listeners['click']();
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }

    getAttribute(name) {
        return this.attributes[name];
    }
}

// Custom ClassList for the mock
class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    contains(cls) { return this.classes.has(cls); }
    add(cls) { this.classes.add(cls); }
    remove(cls) { this.classes.delete(cls); }
    toggle(cls) {
        if (this.classes.has(cls)) {
            this.classes.delete(cls);
            return false;
        } else {
            this.classes.add(cls);
            return true;
        }
    }
}

const navToggle = new MockElement('navToggle');
const navDrawer = new MockElement('navDrawer');
navDrawer.classList = new MockClassList();

// Mock document
const document = {
    querySelector: (selector) => {
        if (selector === '.nav-toggle') return navToggle;
        if (selector === '.nav-drawer') return navDrawer;
        return null;
    },
    querySelectorAll: () => [] // Ignore links for this specific test
};

// --- SIMULATE THE LOGIC FROM site-init.js ---
// We copy the exact logic we modified
if (navToggle && navDrawer) {
    navToggle.addEventListener('click', () => {
        const isOpen = navDrawer.classList.contains('open');
        navDrawer.classList.toggle('open');
        navToggle.setAttribute('aria-expanded', (!isOpen).toString());
    });
}

// --- RUN TESTS ---
console.log("Running Menu Logic Tests...");

// Test 1: Initial State
// Assuming starts closed
navToggle.setAttribute('aria-expanded', 'false');

// Test 2: Click to Open
navToggle.click();

if (navDrawer.classList.contains('open')) {
    console.log("PASS: Drawer has 'open' class after click.");
} else {
    console.error("FAIL: Drawer missing 'open' class.");
}

if (navToggle.getAttribute('aria-expanded') === 'true') {
    console.log("PASS: aria-expanded is 'true' (string).");
} else {
    console.error(`FAIL: aria-expanded is ${navToggle.getAttribute('aria-expanded')} (type: ${typeof navToggle.getAttribute('aria-expanded')})`);
}

// Test 3: Click to Close
navToggle.click();

if (!navDrawer.classList.contains('open')) {
    console.log("PASS: Drawer removed 'open' class after second click.");
} else {
    console.error("FAIL: Drawer still has 'open' class.");
}

if (navToggle.getAttribute('aria-expanded') === 'false') {
    console.log("PASS: aria-expanded is 'false' (string).");
} else {
    console.error(`FAIL: aria-expanded is ${navToggle.getAttribute('aria-expanded')}`);
}
