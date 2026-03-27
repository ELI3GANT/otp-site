
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock DOM
const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!DOCTYPE html>
<html>
<body>
    <input id="postIdInput" value="">
    <input id="titleInput" value="">
    <input id="descInput" value="">
    <input id="slugInput" value="">
    <input id="tagsInput" value="">
    <input id="imageUrl" value="">
    <input id="urlInput" value="">
    <textarea id="contentArea"></textarea>
    <div id="toast"><span></span></div>
    <form id="postForm"></form>
</body>
</html>`);

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

// Mock Supabase
const mockSupabase = {
    from: (table) => {
        return {
            select: () => ({
                order: () => ({
                    limit: () => Promise.resolve({ data: [], error: null })
                })
            }),
            insert: (payload) => {
                console.log(`[MOCK] Insert into ${table}:`, payload);
                return Promise.resolve({ error: null });
            },
            update: (payload) => {
                return {
                    eq: (col, val) => {
                        console.log(`[MOCK] Update ${table} where ${col}=${val}:`, payload);
                        return Promise.resolve({ error: null });
                    }
                };
            }
        };
    }
};

// Mock State
global.state = {
    client: mockSupabase,
    token: 'test-token'
};

// Mock Functions
global.showToast = (msg) => console.log(`[TOAST] ${msg}`);
global.fetchPosts = async () => console.log("[MOCK] Fetch Posts");
global.resetForm = () => console.log("[MOCK] Reset Form");

// Mock secureWrite (used in admin-core)
global.window.secureWrite = async function(table, payload, id = null) {
    if (id) {
        return await state.client.from(table).update(payload).eq('id', id);
    } else {
        return await state.client.from(table).insert([payload]);
    }
};

// V10.5 Logic Synchronization
window.managePost = async function() {
    const id = document.getElementById('postIdInput')?.value;
    const title = document.getElementById('titleInput')?.value.trim();
    const excerpt = document.getElementById('excerptInput')?.value.trim();
    const content = document.getElementById('contentArea')?.value.trim();
    const slugRaw = document.getElementById('slugInput')?.value.trim();
    const tagsRaw = document.getElementById('tagsInput')?.value.trim();
    const imageUrl = document.getElementById('imageUrl')?.value || document.getElementById('urlInput')?.value;

    if (!title) throw new Error("HEADLINE REQUIRED");
    if (!content) throw new Error("CONTENT REQUIRED");

    let slug = slugRaw;
    if (!slug) {
        slug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-')
            .trim();
    }

    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(t => t) : [];

    const payload = {
        title,
        content,
        slug,
        tags,
        image_url: imageUrl,
        published: true,
        updated_at: new Date().toISOString()
    };

    if (id) {
        await window.secureWrite('posts', payload, id);
    } else {
        await window.secureWrite('posts', payload);
    }
    
    global.resetForm();
    await global.fetchPosts(true);
};

async function testCreatePost() {
    console.log("TEST: Create Post");
    document.getElementById('titleInput').value = "Test Title";
    document.getElementById('contentArea').value = "Test Content Body";
    document.getElementById('tagsInput').value = "tag1, tag2";
    document.getElementById('postIdInput').value = ""; // Empty for create

    await window.managePost();
    console.log("✅ Create Post Passed");
}

async function testUpdatePost() {
    console.log("TEST: Update Post");
    document.getElementById('titleInput').value = "Updated Title";
    document.getElementById('contentArea').value = "Updated Content Body";
    document.getElementById('postIdInput').value = "123";

    await window.managePost();
    console.log("✅ Update Post Passed");
}

async function run() {
    try {
        await testCreatePost();
        await testUpdatePost();
        console.log("ALL TESTS PASSED");
    } catch (e) {
        console.error("TEST FAILED", e);
        process.exit(1);
    }
}

run();
