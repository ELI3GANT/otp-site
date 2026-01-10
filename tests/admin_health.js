const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Config
const configPath = path.join(__dirname, '../site-config.js');
const content = fs.readFileSync(configPath, 'utf8');
const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = content.match(/supabaseKey:\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
    console.error("❌ ADMIN CONFIG LOAD FAILED");
    process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function verifyAdminState() {
    console.log("👮 STARTING ADMIN SYSTEM VERIFICATION...");

    try {
        // 1. Verify Global State (The "Brain" of the Admin)
        const { data: globalState, error: stateErr } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', 'system-global-state')
            .single();

        if (stateErr || !globalState) throw new Error("Missing 'system-global-state'. Did you run DEPLOY_V1.3.sql?");
        console.log("✅ Global State Entity Found");

        // 2. Verify CMS Table (New Feature)
        // We try to select from it. If it doesn't exist, Supabase throws an error.
        const { error: cmsErr } = await supabase.from('site_content').select('id').limit(1);
        if (cmsErr) throw new Error("CMS Table 'site_content' missing: " + cmsErr.message);
        console.log("✅ CMS Table 'site_content' Verified");

        // 3. Verify Broadcasts Schema Upgrade
        const { data: bData, error: bErr } = await supabase.from('broadcasts').select('tags, views').limit(1);
        if (bErr) throw new Error("Broadcasts Upgrade Check Failed: " + bErr.message);
        console.log("✅ Broadcasts Schema Verified (Tags & Views columns exist)");

        // 4. Admin File Integrity
        const adminPath = path.join(__dirname, '../otp-terminal.html');
        const corePath = path.join(__dirname, '../admin-core.js');
        if (!fs.existsSync(adminPath)) throw new Error("otp-terminal.html missing");
        if (!fs.existsSync(corePath)) throw new Error("admin-core.js missing");
        console.log("✅ Admin File Integrity Verified");

        console.log("\n🔐 ADMIN SYSTEM SAFE & READY.");

    } catch (e) {
        console.error("\n❌ ADMIN VERIFICATION FAILED:", e.message);
        process.exit(1);
    }
}

verifyAdminState();
