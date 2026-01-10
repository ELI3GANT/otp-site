/**
 * COMPLETE SYSTEM STRESS TEST
 * Targeted at: Static Assets, API Health, and Auth Proxy.
 */
const autocannon = require('autocannon');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const DURATION = parseInt(process.env.DURATION) || 30; // 30 seconds for quick report

async function runStressTest() {
    console.log(`
🔥 INITIATING STRESS TEST ON: ${TARGET_URL}`);
    console.log(`⏱️ Duration: ${DURATION}s | Concurrency: 50 | Connections: 10`);

    const instance = autocannon({
        url: TARGET_URL,
        connections: 10,
        pipelining: 1,
        duration: DURATION,
        workers: 4,
        requests: [
            { method: 'GET', path: '/' }, // Static
            { method: 'GET', path: '/api/health' }, // API
            {
                method: 'POST',
                path: '/api/auth/login',
                body: JSON.stringify({ passcode: 'wrong' }),
                headers: { 'Content-Type': 'application/json' }
            } // Auth Logic
        ]
    }, (err, result) => {
        if (err) {
            console.error('❌ Test failed:', err);
            process.exit(1);
        }
        processReport(result);
    });

    autocannon.track(instance, { renderProgressBar: true });
}

function processReport(result) {
    console.log('\n--- 📊 STRESS TEST REPORT ---');
    console.log(`Total Requests: ${result.requests.sent}`);
    console.log(`Average Latency: ${result.latency.average} ms`);
    console.log(`99th Percentile: ${result.latency.p99} ms`);
    console.log(`Throughput: ${result.throughput.average / 1024 / 1024} MB/sec`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Non-2xx Responses: ${result.non2xx}`);
    
    const successRate = ((result.requests.sent - result.non2xx) / result.requests.sent) * 100;
    console.log(`Success Rate: ${successRate.toFixed(2)}%`);

    if (successRate > 99 && result.latency.average < 200) {
        console.log('\n✅ SUCCESS: System stable under load.');
    } else {
        console.warn('\n⚠️ WARNING: Performance bottlenecks detected.');
    }
}

runStressTest();
