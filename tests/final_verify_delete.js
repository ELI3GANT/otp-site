
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 1. Load Config
const configPath = path.join(__dirname, '../site-config.js');
const content = fs.readFileSync(configPath, 'utf8');
const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = content.match(/supabaseKey:\s*['"]([^'"]+)['"]/);

const supabase = createClient(urlMatch[1], keyMatch[1]);
const TARGET_SLUG = 'whats-so-elegant-about-eli3gant';

async function verify() {
    console.log(`🧐 VERIFYING removal of slug: ${TARGET_SLUG}`);
    const { data, error } = await supabase.from('posts').select('id, title').eq('slug', TARGET_SLUG);
    
    if (data && data.length > 0) {
        console.log(`❌ STILL EXISTS: Post "${data[0].title}" (ID: ${data[0].id}) is still in the database.`);
    } else {
        console.log("✅ CONFIRMED: No post with that slug exists in the database.");
    }
}
verify();
