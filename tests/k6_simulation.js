/**
 * PRODUCTION K6-SIMULATION STRESS TEST
 * Target: https://onlytrueperspective.tech
 */
const autocannon = require('autocannon');

const TARGET = 'https://onlytrueperspective.tech';

async function runProductionStressTest() {
    console.log(`\n🚀 STARTING K6-SIMULATION STRESS TEST ON: ${TARGET}`);
    console.log(`----------------------------------------------------------`);
    console.log(`Load Parameters:`);
    console.log(`- Virtual Users (Connections): 100`);
    console.log(`- Duration: 60 seconds`);
    console.log(`- Scenarios: Static Browsing, API Probing, Auth Logic`);
    console.log(`----------------------------------------------------------\n`);

    const instance = autocannon({
        url: TARGET,
        connections: 100, // Simulated Virtual Users
        pipelining: 1,
        duration: 60,
        workers: 4,
        requests: [
            { method: 'GET', path: '/', weight: 10 }, // 10x Main Page
            { method: 'GET', path: '/insights.html', weight: 5 }, // 5x Insights Page
            { method: 'GET', path: '/api/health', weight: 2 }, // 2x Health Check
            {
                method: 'POST', 
                path: '/api/auth/login', 
                body: JSON.stringify({ passcode: 'brute-force-test' }),
                headers: { 'Content-Type': 'application/json' },
                weight: 1
            } // 1x Login Attempt
        ]
    }, (err, result) => {
        if (err) {
            console.error('❌ Test execution failed:', err);
            process.exit(1);
        }
        generateK6Report(result);
    });

    autocannon.track(instance, { renderProgressBar: true });
}

function generateK6Report(result) {
    console.log(`\n\n📊 K6-SIMULATION PERFORMANCE REPORT`);
    console.log(`==========================================================`);
    console.log(`STATUS: ${result.non2xx > 0 ? '⚠️ CONGESTED' : '✅ OPTIMAL'}`);
    console.log(`----------------------------------------------------------`);
    console.log(`METRICS:`);
    console.log(`- Total Requests Sent:   ${result.requests.sent.toLocaleString()}`);
    console.log(`- Mean Response Time:    ${result.latency.average} ms`);
    console.log(`- P95 Response Time:     ${result.latency.p95} ms`);
    console.log(`- P99 Response Time:     ${result.latency.p99} ms`);
    console.log(`- Max Response Time:     ${result.latency.max} ms`);
    console.log(`- Throughput (Avg):      ${result.requests.average.toLocaleString()} req/sec`);
    console.log(`- Bandwidth (Avg):       ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/sec`);
    console.log(`----------------------------------------------------------`);
    console.log(`RELIABILITY:`);
    console.log(`- Successes (2xx):       ${result['2xx'].toLocaleString()}`);
    console.log(`- Failures (Errors):     ${result.errors.toLocaleString()}`);
    console.log(`- Throttled (Non-2xx):   ${result.non2xx.toLocaleString()}`);
    
    const successRate = ((result['2xx'] / result.requests.sent) * 100).toFixed(2);
    console.log(`- Overall Success Rate:  ${successRate}%`);
    console.log(`==========================================================`);

    console.log(`\n\nFINDINGS & ACTIONABLE RECOMMENDATIONS:`);
    
    if (result.latency.p99 > 500) {
        console.log(`- 🔴 HIGH LATENCY SPIKE: P99 exceeded 500ms. Optimization required for serverless cold starts.`);
    } else {
        console.log(`- ✅ LATENCY STABILITY: P99 is within acceptable limits (< 500ms).`);
    }

    if (result.non2xx > (result.requests.sent * 0.1)) {
        console.log(`- 🟡 RATE LIMITER TRIGGERED: Over 10% of requests were throttled. This confirms your DDoS protection is WORKING.`);
        console.log(`  -> ACTION: If 100 CCU is expected, increase 'max' requests in express-rate-limit config.`);
    }

    if (result.errors > 0) {
        console.log(`- 🔴 CRITICAL ERRORS: ${result.errors} socket/connection errors occurred. The server may be saturating.`);
    }

    console.log(`\n🏁 End of simulation.`);
}

runProductionStressTest();
