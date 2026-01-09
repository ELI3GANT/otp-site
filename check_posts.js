const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ckumhowhucbbmpdeqkrl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrdW1ob3dodWNiYm1wZGVxa3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NzQ3NjcsImV4cCI6MjA4MzQ1MDc2N30.yIJ1diGLWjtLWm8P2D5flF2nd0xPKn_8x2RR3DlIrag';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkPosts() {
    const { data, error } = await supabase.from('posts').select('slug, title, published, created_at');
    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }
    console.log('Posts in database:');
    console.log(JSON.stringify(data, null, 2));
}

checkPosts();
