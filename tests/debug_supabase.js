/**
 * DEBUG SCRIPT: Verify Supabase Access
 * Run this with `node check_posts.js` to see if the server environment can access the DB.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ckumhowhucbbmpdeqkrl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdW1ob3dodWNiYm1wZGVxa3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzQ3NjcsImV4cCI6MjA4MzQ1MDc2N30.yIJ1diGLWjtLWm8P2D5flF2nd0xPKn_8x2RR3DlIrag';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    console.log("Testing Supabase Connection...");
    
    // 1. Check Public Access
    const { data, error, count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("❌ CONNECTION FAILED:", JSON.stringify(error, null, 2));
    } else {
        console.log("✅ ACCESS GRANTED. Total Posts:", count);
    }
}

async function rawFetchTest() {
    console.log("Testing Raw Fetch...");
    const url = `${SUPABASE_URL}/rest/v1/posts?select=*&head=true`;
    try {
        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        console.log("Raw Status:", res.status, res.statusText);
        const text = await res.text();
        console.log("Raw Body:", text);
    } catch(e) {
        console.error("Raw Fetch Error:", e);
    }
}

async function checkStorage() {
    console.log("Checking Storage Buckets...");
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error("❌ STORAGE CHECK FAILED:", JSON.stringify(error, null, 2));
    } else {
        console.log("✅ BUCKETS FOUND:", data.map(b => b.name).join(', '));
        const hasUploads = data.some(b => b.name === 'uploads');
        if (!hasUploads) {
            console.log("⚠️ 'uploads' bucket is MISSING. Attempting to create...");
            const { data: createData, error: createError } = await supabase.storage.createBucket('uploads', {
                public: true,
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif'],
                fileSizeLimit: 5242880 // 5MB
            });
            if (createError) {
                console.error("❌ BUCKET CREATION FAILED (Permissions?):", JSON.stringify(createError, null, 2));
                console.log("👉 ACTION REQUIRED: Run the SQL in admin-core.js to create the bucket manually.");
            } else {
                console.log("✅ BUCKET 'uploads' CREATED SUCCESSFULLY.");
            }
        }
    }
}

testConnection().then(() => rawFetchTest()).then(() => checkStorage());
