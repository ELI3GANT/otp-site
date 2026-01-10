
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// CONFIG
const MAX_REQUESTS = 50; // Total requests
const CONCURRENCY = 5;   // Parallel requests
const TARGET_SLUG = 'stress-test-slug';

// Load Credentials
const configPath = path.join(__dirname, '../site-config.js');
const content = fs.readFileSync(configPath, 'utf8');
const urlMatch = content.match(/supabaseUrl:\s*['"]([^'"]+)['"]/);
const keyMatch = content.match(/supabaseKey:\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
    console.error("❌ STRESS TEST CONFIG MISSING");
    process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function stressTest() {
    console.log(`🔥 STARTING STRESS TEST: ${MAX_REQUESTS} requests (${CONCURRENCY} concurrent)...`);
    
    let completed = 0;
    let errors = 0;
    const startTime = Date.now();

    // 1. Setup Data
    await supabase.from('posts').upsert({ slug: TARGET_SLUG, title: 'Stress Test' });

    // 2. Worker Function
    const worker = async (id) => {
        for (let i = 0; i < MAX_REQUESTS / CONCURRENCY; i++) {
            const start = Date.now();
            // Simulate Read Heavy Load
            const { error } = await supabase.from('posts').select('id').eq('slug', TARGET_SLUG).single();
            const duration = Date.now() - start;

            if (error) {
                errors++;
                process.stdout.write('x');
            } else {
                completed++;
                process.stdout.write('.'); // Progress dot
            }
        }
    };

    // 3. Launch Workers
    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(worker(i));
    }

    await Promise.all(workers);

    const totalTime = (Date.now() - startTime) / 1000;
    console.log(`\n\n✅ TEST COMPLETE in ${totalTime.toFixed(2)}s`);
    console.log(`📊 Throughput: ${(completed / totalTime).toFixed(2)} req/s`);
    console.log(`❌ Errors: ${errors} (${(errors/MAX_REQUESTS*100).toFixed(1)}%)`);

    // 4. Cleanup
    await supabase.from('posts').delete().eq('slug', TARGET_SLUG);
}

stressTest();
