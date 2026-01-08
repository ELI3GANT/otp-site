
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load Config from file directly
const configPath = path.join(__dirname, '../site-config.js');
let CONFIG = {};

try {
    const content = fs.readFileSync(configPath, 'utf8');
    // Simple regex parse to avoid eval or complex parsing
    const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
    const keyMatch = content.match(/supabaseKey:\s*['"]([^'"]+)['"]/);
    
    if (urlMatch && keyMatch) {
        CONFIG.supabaseUrl = urlMatch[1];
        CONFIG.supabaseKey = keyMatch[1];
    } else {
        throw new Error("Could not parse config");
    }
} catch (e) {
    console.error("❌ FAILED TO LOAD CONFIG:", e.message);
    process.exit(1);
}

async function runHealthCheck() {
    console.log("🏥 STARTING SYSTEM HEALTH CHECK...");
    console.log(`📡 Endpoint: ${CONFIG.supabaseUrl}`);

    const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
    const testId = `health-check-${Date.now()}`;

    try {
        // 1. CONNECTION CHECK
        const { count, error: connError } = await supabase.from('posts').select('*', { count: 'exact', head: true });
        if (connError) throw new Error(`Connection Failed: ${connError.message}`);
        console.log(`✅ DATABASE ONLINE (${count} records)`);

        // 2. WRITE CHECK
        const { data: insertData, error: insertError } = await supabase.from('posts').insert([{
            title: 'Health Check',
            slug: testId,
            content: '<p>System check.</p>',
            excerpt: 'Status: Healthy',
            published: false
        }]).select();

        if (insertError) {
            // Handle Schema Error Fallback Simulation
            if (insertError.code === 'PGRST204') {
                console.warn("⚠️ SCHEMA MISMATCH DETECTED (PGRST204). Run 'Copy DB Upgrade SQL'.");
            }
            throw new Error(`Write Failed: ${insertError.message}`);
        }
        
        const rowId = insertData[0].id;
        console.log(`✅ WRITE OPERATION SUCCESS (ID: ${rowId})`);

        // 3. READ CHECK
        const { data: readData, error: readError } = await supabase.from('posts').select('*').eq('slug', testId).single();
        if (readError || !readData) throw new Error(`Read Failed: ${readError ? readError.message : 'No data'}`);
        console.log("✅ READ OPERATION SUCCESS");

        // 4. DELETE CHECK
        const { error: deleteError } = await supabase.from('posts').delete().eq('id', rowId);
        if (deleteError) throw new Error(`Delete Failed: ${deleteError.message}`);
        console.log("✅ DELETE OPERATION SUCCESS");

        console.log("\n🎉 ALL SYSTEMS OPERATIONAL.");
        
    } catch (err) {
        console.error("\n❌ HEALTH CHECK FAILED:", err.message);
        process.exit(1);
    }
}

runHealthCheck();
