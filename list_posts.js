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
        .select('*');

    if (error) {
        console.error(error);
        return;
    }

    console.log(JSON.stringify(posts, null, 2));
}

listAllPosts();
