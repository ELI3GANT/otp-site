const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Config
const configPath = path.join(__dirname, 'site-config.js');
const content = fs.readFileSync(configPath, 'utf8');
const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = content.match(/supabaseKey:\s*['"]([^'"]+)['"]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function checkPosts() {
    console.log("🕵️ CHECKING POSTS...");
    
    // Check connection
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*');

    if (error) {
        console.error("❌ Error fetching posts:", error);
        return;
    }

    console.log(`✅ Found ${posts.length} total posts.`);
    
    posts.forEach(p => {
        console.log(`- [${p.id}] "${p.title}" | Published: ${p.published} | Slug: ${p.slug}`);
    });

    // Check if published=true works
    const published = posts.filter(p => p.published);
    console.log(`\n✅ Published count: ${published.length}`);
}

checkPosts();
