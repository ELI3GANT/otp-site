const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'site-config.js');
const content = fs.readFileSync(configPath, 'utf8');
const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = content.match(/supabaseKey:\s*['"]([^'"]+)['"]/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function listAllPosts() {
    const { data: posts, error } = await supabase
        .from('posts')
        .select('title, slug, content');

    if (error) {
        console.error(error);
        return;
    }

    posts.forEach(p => {
        console.log(`--- ${p.title} (${p.slug}) ---`);
        console.log(p.content);
        console.log('----------------------------');
    });
}

listAllPosts();
