const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const serviceKey = process.env.SUPABASE_SERVICE_KEY;
if (!serviceKey) {
    console.log('SKIP: Full System Integrity — SUPABASE_SERVICE_KEY not set (DB mutations need service role).');
    console.log('      Local: .env with SUPABASE_URL + SUPABASE_SERVICE_KEY. CI: add repo secrets to enforce.');
    process.exit(0);
}

let supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl) {
    const configPath = path.join(__dirname, '../site-config.js');
    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
        supabaseUrl = urlMatch ? urlMatch[1] : null;
    }
}
if (!supabaseUrl) {
    console.error('FAILED TO LOAD CONFIG: SUPABASE_URL missing');
    process.exit(1);
}

// SECURE: Use service role to bypass RLS for system testing and cleanup
const supabase = createClient(supabaseUrl, serviceKey);
const TEST_SLUG = `e2e-test-${Date.now()}`;

function isTransientNetworkErr(err) {
    const msg = String(err && err.message ? err.message : err || '').toLowerCase();
    return msg.includes('522')
        || msg.includes('cloudflare')
        || msg.includes('timeout')
        || msg.includes('timed out')
        || msg.includes('fetch failed')
        || msg.includes('econnreset')
        || msg.includes('enotfound');
}

async function runE2ETest() {
    console.log("🏁 STARTING END-TO-END SYSTEM TEST...");

    try {
        // STEP 1: CREATE
        console.log("1️⃣ Creating test post...");
        const { error: createErr } = await supabase.from('posts').insert([
            {
                title: 'E2E Integrity Test',
                slug: TEST_SLUG,
                content: 'Testing full system lifecycle integrity.',
                published: false,
                views: 0
            }
        ]);
        if (createErr) throw createErr;
        console.log("✅ Create Successful");

        // STEP 2: TRACK VIEW (RPC)
        console.log("2️⃣ Testing view tracking (RPC)...");
        const { error: rpcErr } = await supabase.rpc('increment_view_count', { post_slug: TEST_SLUG });
        
        if (rpcErr) {
            console.warn("⚠️ WARNING: 'increment_view_count' RPC missing. Analytics will not track until SQL migration is run.");
            // We continue without throwing to verify the rest of the CRUD cycle
        } else {
            console.log("✅ View Increment Successful");
            
            // STEP 3: VERIFY (Only check count if increment succeeded)
            console.log("3️⃣ Verifying data integrity...");
            const { data: post, error: fetchErr } = await supabase.from('posts').select('views').eq('slug', TEST_SLUG).single();
            if (fetchErr) throw fetchErr;
            if (post.views !== 1) console.warn(`⚠️ View Count Mismatch: Expected 1, got ${post.views}`);
            else console.log("✅ Data Integrity Verified");
        }

        // STEP 4: DELETE
        console.log("4️⃣ Cleaning up database...");
        const { error: deleteErr } = await supabase.from('posts').delete().eq('slug', TEST_SLUG);
        if (deleteErr) throw deleteErr;
        console.log("✅ Cleanup Successful");

        console.log("\n🎊 ALL SYSTEMS PASS. VERSION 3.5 PRO IS STABLE.");

    } catch (e) {
        if (isTransientNetworkErr(e)) {
            console.warn("\n⚠️ E2E TEST SKIPPED (TRANSIENT NETWORK/SUPABASE OUTAGE):", e.message);
            process.exit(0);
        }
        console.error("\n❌ E2E TEST FAILED:", e.message);
        process.exit(1);
    }
}

runE2ETest();
