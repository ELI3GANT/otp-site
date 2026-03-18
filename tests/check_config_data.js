
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load config
const configContent = fs.readFileSync('site-config.js', 'utf8');
const urlMatch = configContent.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = configContent.match(/supabaseKey:\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
    console.error("❌ Could not parse Supabase credentials from site-config.js");
    process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function runDiagnostics() {
    console.log("🔍 DIAGNOSING CATEGORIES & ARCHETYPES...");

    // 1. Check Categories
    console.log("\n--- [1] CATEGORIES TABLE ---");
    const { data: cats, error: catErr } = await supabase.from('categories').select('*').order('id');
    if (catErr) {
        console.error("❌ ERROR fetching categories:", catErr.message);
    } else {
        console.log(`✅ SUCCESS: Found ${cats.length} categories.`);
        console.table(cats.map(c => ({ id: c.id, name: c.name, slug: c.slug })));
    }

    // 2. Check Archetypes
    console.log("\n--- [2] AI_ARCHETYPES TABLE ---");
    const { data: archs, error: archErr } = await supabase.from('ai_archetypes').select('*').order('id');
    if (archErr) {
        console.error("❌ ERROR fetching archetypes:", archErr.message);
    } else {
        console.log(`✅ SUCCESS: Found ${archs.length} archetypes.`);
        console.table(archs.map(a => ({ 
            id: a.id, 
            name: a.name, 
            cat_id: a.category_id,
            config: JSON.stringify(a.model_config).substring(0, 20) + "..."
        })));
    }

    // 3. Check UI Select Elements in HTML (Static check)
    console.log("\n--- [3] UI INTEGRATION CHECK ---");
    const adminCore = fs.readFileSync('admin-core.js', 'utf8');
    if (adminCore.includes('fetchCategories()') && adminCore.includes('syncCategoryDropdowns()')) {
        console.log("✅ admin-core.js is configured to fetch and sync data.");
    } else {
        console.warn("⚠️ admin-core.js might be missing the sync logic.");
    }
}

runDiagnostics();
