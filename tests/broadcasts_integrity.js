/**
 * BROADCASTS INTEGRITY TEST
 * Verifies the lifecycle of a broadcast entry.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error("❌ FAILED TO LOAD CONFIG: Ensure .env is present with SERVICE_KEY");
    process.exit(1);
}

// SECURE: Use service role to bypass RLS for system testing and cleanup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const TEST_SLUG = `broadcast-test-${Date.now()}`;

async function runBroadcastTest() {
    console.log("🏁 STARTING BROADCAST INTEGRITY TEST...");

    try {
        // 1. CREATE
        console.log("1️⃣ Creating test broadcast...");
        const { data: bData, error: createErr } = await supabase.from('broadcasts').insert([
            {
                title: 'Integrity Test Broadcast',
                slug: TEST_SLUG,
                content: 'Testing broadcasts table lifecycle.',
                status: 'active',
                views: 0
            }
        ]).select().single();
        
        if (createErr) throw createErr;
        console.log(`✅ Create Successful (ID: ${bData.id})`);

        // 2. READ & FILTER
        console.log("2️⃣ Verifying active status filter...");
        const { data: list, error: readErr } = await supabase.from('broadcasts')
            .select('*')
            .eq('status', 'active')
            .eq('slug', TEST_SLUG);
        
        if (readErr) throw readErr;
        if (list.length !== 1) throw new Error("Broadcast not found in filtered list");
        console.log("✅ Filter Integrity Verified");

        // 3. UPDATE (Simulate view increment)
        console.log("3️⃣ Testing view increment...");
        const { error: updateErr } = await supabase.from('broadcasts')
            .update({ views: 1 })
            .eq('id', bData.id);
        
        if (updateErr) throw updateErr;
        
        const { data: updated, error: fetchErr } = await supabase.from('broadcasts').select('views').eq('id', bData.id).single();
        if (fetchErr) throw fetchErr;
        if (updated.views !== 1) throw new Error(`View mismatch: ${updated.views}`);
        console.log("✅ Update Integrity Verified");

        // 4. DELETE
        console.log("4️⃣ Cleaning up...");
        const { error: deleteErr } = await supabase.from('broadcasts').delete().eq('id', bData.id);
        if (deleteErr) throw deleteErr;
        console.log("✅ Cleanup Successful");

        console.log("\n🎊 BROADCASTS SYSTEM IS 100% OPERATIONAL.");

    } catch (e) {
        console.error("\n❌ TEST FAILED:", e.message);
        process.exit(1);
    }
}

runBroadcastTest();
