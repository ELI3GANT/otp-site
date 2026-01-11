const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const configPath = path.join(__dirname, '../site-config.js');
const configContent = fs.readFileSync(configPath, 'utf8');

const urlMatch = configContent.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = configContent.match(/supabaseKey:\s*['"]([^'"]+)['"]/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
    console.log("TEST 1: Simple Insert (No Select)...");
    const { error } = await supabase.from('contacts').insert([{
        name: 'Test',
        email: 'test@test.com',
        service: 'Test',
        message: 'Test',
        budget: '500-1500',
        timeline: 'asap'
    }]);

    if (error) {
        console.log("❌ Test 1 Failed:", error.message);
    } else {
        console.log("✅ Test 1 Success (Insert worked!)");
    }
}
run();
