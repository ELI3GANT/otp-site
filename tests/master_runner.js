/**
 * OTP MASTER TEST RUNNER [V10.5]
 * Aggregates all system tests into a detailed XML report.
 * Supports: --scope, --mode, --report, --output
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const outputArg = args.find(a => a.startsWith('--output='));
const outputPath = outputArg ? outputArg.split('=')[1] : './test-report.xml';

const tests = [
    { name: 'Full System Integrity', path: 'tests/full_system_test.js' },
    { name: 'Admin Health & Schema', path: 'tests/admin_health.js' },
    { name: 'User Flow Validation', path: 'tests/user_flow_validation.js' },
    { name: 'Client Journey (public intake)', path: 'tests/client_journey_contract.test.js' },
    { name: 'Client Portal Route Contract', path: 'tests/portal_route_contract.test.js' },
    { name: 'Client Portal Logic', path: 'tests/client_portal_logic.test.js' },
    { name: 'OTP Bookings Contract', path: 'tests/bookings_contract.test.js' },
    { name: 'Authentication Logic', path: 'tests/auth_flow_test.js' },
    { name: 'Post Management Logic', path: 'tests/manage_post_test.js' },
    { name: 'Email Link Logic', path: 'tests/email_link_test.js' },
    { name: 'Ops Jobs Contract', path: 'tests/ops_jobs_contract.test.js' },
    { name: 'Ops Docs Generation', path: 'tests/ops_docs_generation.test.js' },
    { name: 'Quick Deal Mode Contract', path: 'tests/quick_deal_mode_contract.test.js' },
    { name: 'Ops Packets Contract', path: 'tests/ops_packets_contract.test.js' },
    { name: 'Doc Packet Logic', path: 'tests/doc_packet_logic.test.js' },
    { name: 'Oracle + Terminal Contract', path: 'tests/oracle_terminal_contract.test.js' },
    { name: 'OTP Oracle Master (stack)', path: 'tests/oracle_master.test.js' },
    { name: 'Marketing Site + Theme Contract', path: 'tests/marketing_site_contract.test.js' },
    { name: 'SEO Indexing Contract', path: 'tests/seo_indexing_contract.test.js' },
    { name: 'PageSpeed Delivery Contract', path: 'tests/pagespeed_delivery_contract.test.js' },
    { name: 'Homepage Visual Contract', path: 'tests/homepage_visual_contract.test.js' },
    { name: 'YouTube Video Contract', path: 'tests/youtube_video_contract.test.js' },
    { name: 'Theme Logic', path: 'tests/theme.test.js' },
    { name: 'Menu Logic', path: 'tests/menu_logic_test.js' },
    { name: 'Live API Analytics Slug', path: 'tests/live_analytics_slug.test.js' },
    { name: 'API Surface + RLS Contract', path: 'tests/api_surface_security_contract.test.js' },
    { name: 'Admin Sweep Auth Contract', path: 'tests/admin_sweep_auth_contract.test.js' },
    { name: 'Vercel Route Precedence', path: 'tests/vercel_route_precedence.test.js' },
    { name: 'Release Guardrails Contract', path: 'tests/release_guardrails_contract.test.js' },
    { name: 'Security & Performance', path: 'tests/security_perf_audit.js' },
    // Stress test is excluded from default run due to duration/load
    // { name: 'Stress Test', path: 'tests/stress_test.js' } 
];

async function runAll() {
    console.log("🏁 INITIATING MASTER TEST SUITE...");
    console.log(`📡 SCOPE: ALL | MODE: FULL | OUTPUT: ${outputPath}\n`);

    let results = [];
    let startTime = Date.now();

    for (const test of tests) {
        console.log(`🚀 Running: ${test.name}...`);
        let start = Date.now();
        let status = 'passed';
        let error = null;
        let output = '';

        try {
            output = execSync(`"${process.execPath}" ${test.path}`).toString();
            console.log(`   ✅ PASSED (${Date.now() - start}ms)`);
        } catch (e) {
            status = 'failed';
            error = e.message;
            output = e.stdout ? e.stdout.toString() : e.message;
            console.error(`   ❌ FAILED (${Date.now() - start}ms)`);
        }

        results.push({ ...test, status, duration: Date.now() - start, output, error });
    }

    const totalDuration = Date.now() - startTime;
    const failures = results.filter(r => r.status === 'failed').length;

    // GENERATE XML (JUnit Style)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="OTP Master Suite" tests="${tests.length}" failures="${failures}" time="${(totalDuration/1000).toFixed(2)}">
    <testsuite name="System Tests" tests="${tests.length}" failures="${failures}" time="${(totalDuration/1000).toFixed(2)}">
        ${results.map(r => `
        <testcase name="${r.name}" classname="${r.path}" time="${(r.duration/1000).toFixed(2)}">
            ${r.status === 'failed' ? `<failure message="Test Failed">${r.error}</failure>` : ''}
            <system-out><![CDATA[${r.output}]]></system-out>
        </testcase>`).join('')}
    </testsuite>
</testsuites>`;

    // Ensure Dir exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, xml);
    console.log(`\n🎊 MASTER TEST COMPLETE. REPORT GENERATED: ${outputPath}`);
    
    if (failures > 0) process.exit(1);
}

runAll();
