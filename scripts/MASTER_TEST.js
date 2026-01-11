/**
 * OTP MASTER TEST SUITE [V1.1.0]
 * This script verifies the entire ecosystem:
 * 1. Database Connectivity & RLS
 * 2. Contact Form Pipeline
 * 3. Analytics View Tracking (RPC)
 * 4. Admin Auth Context
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Load Site Config
const configPath = path.join(__dirname, '../site-config.js');
const configContent = fs.readFileSync(configPath, 'utf8');
const urlMatch = configContent.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = configContent.match(/supabaseKey:\s*['"]([^'"]+)['"]/);
const supabaseUrl = urlMatch[1];
const supabaseKey = keyMatch[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMasterTest() {
    console.log("🚀 STARTING OTP MASTER TEST...");
    console.log("----------------------------------");

    let failures = 0;

    // TEST 1: DB CONNECTION
    try {
        const { data, error } = await supabase.from('posts').select('id').limit(1);
        if (error) throw error;
        console.log("✅ TEST 1: Database Connectivity [PASSED]");
    } catch (e) {
        console.error("❌ TEST 1: Database Connectivity [FAILED]", e.message);
        failures++;
    }

    // TEST 2: CONTACT FORM RLS (Insert Only)
    try {
        const { error } = await supabase.from('contacts').insert([{
            name: 'Master Test Bot',
            email: 'master@otp.tech',
            message: 'Diagnostic run @ ' + new Date().toISOString(),
            service: 'Diagnostic',
            budget: 'Diagnostic',
            timeline: 'Diagnostic'
        }]);
        if (error) throw error;
        console.log("✅ TEST 2: Contact Form RLS (Public Insert) [PASSED]");
    } catch (e) {
        console.error("❌ TEST 2: Contact Form RLS (Public Insert) [FAILED]", e.message);
        failures++;
    }

    // TEST 3: ANALYTICS RPC (Increment View)
    try {
        // We use a dummy slug or the system-global-state to test the RPC
        const { error } = await supabase.rpc('increment_view_count', { post_slug: 'system-global-state' });
        if (error) throw error;
        console.log("✅ TEST 3: Analytics View Pulse (RPC) [PASSED]");
    } catch (e) {
        // If it fails with 'function not found', the RPC isn't deployed
        console.error("❌ TEST 3: Analytics View Pulse (RPC) [FAILED]", e.message);
        failures++;
    }

    // TEST 4: ADMIN PASSCODE VERIFICATION (Local Check)
    const adminPasscode = process.env.ADMIN_PASSCODE;
    if (adminPasscode && adminPasscode.length > 4) {
        console.log("✅ TEST 4: Admin Security Config [PASSED]");
    } else {
        console.error("❌ TEST 4: Admin Security Config (ADMIN_PASSCODE weak or missing) [FAILED]");
        failures++;
    }

    // TEST 5: SITE CONFIG SYNC
    if (supabaseUrl.includes('supabase.co') && supabaseKey.length > 20) {
        console.log("✅ TEST 5: Site Config Internal Sync [PASSED]");
    } else {
        console.error("❌ TEST 5: Site Config Internal Sync [FAILED]");
        failures++;
    }

    console.log("----------------------------------");
    if (failures === 0) {
        console.log("🎊 MASTER TEST COMPLETE: ALL SYSTEMS NOMINAL.");
        console.log("👉 LIVE SITE: http://localhost:8080");
        console.log("👉 ADMIN: http://localhost:8080/otp-terminal.html");
    } else {
        console.log(`⚠️ MASTER TEST COMPLETE: ${failures} ERRORS DETECTED.`);
    }
}

runMasterTest();
