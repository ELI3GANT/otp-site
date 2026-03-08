require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanDB() {
    console.log("Cleaning up E2E Integrity Test posts...");
    const { data, error } = await supabase
        .from('posts')
        .delete()
        .eq('title', 'E2E Integrity Test');

    if (error) {
        console.error("Error deleting posts:", error);
    } else {
        console.log("Cleanup successful!");
    }
}

cleanDB();
