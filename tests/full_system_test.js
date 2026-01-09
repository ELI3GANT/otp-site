
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load Config
const configPath = path.join(__dirname, '../site-config.js');
const content = fs.readFileSync(configPath, 'utf8');
const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = content.match(/supabaseKey:\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
    console.error("❌ FAILED TO LOAD CONFIG");
    process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);
const TEST_SLUG = `e2e-test-${Date.now()}`;

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
                published: true,
                views: 0
            }
        ]);
        if (createErr) throw createErr;
        console.log("✅ Create Successful");

        // STEP 2: TRACK VIEW (RPC)
        console.log("2️⃣ Testing view tracking (RPC)...");
        const { error: rpcErr } = await supabase.rpc('increment_view_count', { post_slug: TEST_SLUG });
        if (rpcErr) throw rpcErr;
        console.log("✅ View Increment Successful");

        // STEP 3: VERIFY
        console.log("3️⃣ Verifying data integrity...");
        const { data: post, error: fetchErr } = await supabase.from('posts').select('views').eq('slug', TEST_SLUG).single();
        if (fetchErr) throw fetchErr;
        if (post.views !== 1) throw new Error(`Integrity Failure: Expected 1 view, got ${post.views}`);
        console.log("✅ Data Integrity Verified");

        // STEP 4: DELETE
        console.log("4️⃣ Cleaning up database...");
        const { error: deleteErr } = await supabase.from('posts').delete().eq('slug', TEST_SLUG);
        if (deleteErr) throw deleteErr;
        console.log("✅ Cleanup Successful");

        console.log("\n🎊 ALL SYSTEMS PASS. VERSION 3.5 PRO IS STABLE.");

    } catch (e) {
        console.error("\n❌ E2E TEST FAILED:", e.message);
        process.exit(1);
    }
}

runE2ETest();
