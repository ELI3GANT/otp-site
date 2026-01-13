/**
 * OTP MASTER TEST RUNNER [V1.2.1]
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
    { name: 'Authentication Logic', path: 'tests/auth_flow_test.js' },
    { name: 'Post Management Logic', path: 'tests/manage_post_test.js' },
    { name: 'Email Link Logic', path: 'tests/email_link_test.js' },
    { name: 'Theme Logic', path: 'tests/theme.test.js' },
    { name: 'Menu Logic', path: 'tests/menu_logic_test.js' }
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
            output = execSync(`node ${test.path}`).toString();
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
