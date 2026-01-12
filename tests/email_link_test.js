
const assert = require('assert');

// Simple Mock without JSDOM for this specific test to avoid Location strictness
global.document = {
    getElementById: (id) => {
        const data = {
            'replyContactEmail': { value: 'test@example.com' },
            'replyContactName': { value: 'John Doe' },
            'replyDraftContent': { value: 'Hello there!' }
        };
        return data[id];
    }
};

global.window = {
    location: { href: '' },
    open: (url) => { console.log("Opened: " + url); }
};

global.encodeURIComponent = encodeURIComponent;

// Function Under Test
global.window.launchMailClient = function() {
    const email = document.getElementById('replyContactEmail').value;
    const name = document.getElementById('replyContactName').value;
    const content = document.getElementById('replyDraftContent').value;
    
    // Clean and Professional Subject
    const subjectName = name ? ` // ${name}` : '';
    const subject = `Inquiry Reply: Only True Perspective${subjectName}`;
    
    // Ensure content is safe for URL
    const safeSubject = encodeURIComponent(subject);
    const safeBody = encodeURIComponent(content);
    
    const mailto = `mailto:${email}?subject=${safeSubject}&body=${safeBody}`;
    
    try {
        window.location.href = mailto;
    } catch(e) {
        window.open(mailto, '_blank');
    }
    return mailto; 
};

function testEmailFormatting() {
    console.log("TEST: Email Link Formatting");
    const mailto = global.window.launchMailClient();
    
    assert(mailto.includes('mailto:test@example.com'), "Email missing");
    
    // Decode to verify content human-readable
    const decoded = decodeURIComponent(mailto);
    console.log("Generated Link:", decoded);
    
    assert(decoded.includes('subject=Inquiry Reply: Only True Perspective // John Doe'), "Subject malformed");
    assert(decoded.includes('body=Hello there!'), "Body malformed");
    
    console.log("✅ Email Link Formatting Passed");
}

try {
    testEmailFormatting();
} catch (e) {
    console.error(e);
    process.exit(1);
}
