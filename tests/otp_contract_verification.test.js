const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
    BOOKING_CONTRACT_DIGEST,
    BOOKING_CONTRACT_VERSION,
    LINEAGE_CONTRACT_DIGEST,
    LINEAGE_CONTRACT_VERSION
} = require('../server/booking-handoff.js');
const {
    JOB_ADMIN_MUTATION_CONTRACT_DIGEST,
    JOB_ADMIN_MUTATION_CONTRACT_VERSION
} = require('../server/job-admin-handoff.js');

console.log('OTP CONTRACT VERIFICATION...');

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'otp-site-contracts-'));
    fs.cpSync(path.join(__dirname, '..', 'contracts'), path.join(root, 'contracts'), { recursive: true });
    return root;
}

function mutateJson(root, file, mutate) {
    const location = path.join(root, 'contracts', file);
    const value = JSON.parse(fs.readFileSync(location, 'utf8'));
    mutate(value);
    fs.writeFileSync(location, `${JSON.stringify(value, null, 2)}\n`);
}

(async () => {
    const { verifyPinnedContracts } = await import('../scripts/otp-contracts.mjs');
    const repositoryRoot = path.join(__dirname, '..');
    assert.equal(verifyPinnedContracts(repositoryRoot).contracts, 3);
    assert.match(BOOKING_CONTRACT_DIGEST, /^sha256:[a-f0-9]{64}$/);
    assert.match(LINEAGE_CONTRACT_DIGEST, /^sha256:[a-f0-9]{64}$/);
    assert.equal(BOOKING_CONTRACT_VERSION, 'otp-booking-intake-v1');
    assert.equal(LINEAGE_CONTRACT_VERSION, 'otp-lineage-v1');
    assert.match(JOB_ADMIN_MUTATION_CONTRACT_DIGEST, /^sha256:[a-f0-9]{64}$/);
    assert.equal(JOB_ADMIN_MUTATION_CONTRACT_VERSION, 'otp-job-admin-mutation-v1');

    const bookingFile = 'otp-booking-intake-v1.json';
    const driftCases = [
        ['changed required field', (value) => value.definition.schema.required.push('new_required_field')],
        ['removed required field', (value) => value.definition.schema.required.splice(0, 1)],
        ['type change', (value) => { value.definition.schema.properties.booking_id.type = 'number'; }],
        ['enum mismatch', (value) => { value.definition.schema.properties.schema_version.enum = ['otp-booking-intake-v2']; }],
        ['stale digest', (value) => { value.digest = `sha256:${'0'.repeat(64)}`; }],
        ['wrong version', (value) => { value.version = '2'; }],
        ['manually edited consumer copy', (value) => { value.definition.schema.properties.manual_field = { type: 'string' }; }]
    ];
    for (const [name, mutate] of driftCases) {
        const root = fixture();
        try {
            mutateJson(root, bookingFile, mutate);
            assert.throws(() => verifyPinnedContracts(root), undefined, name);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }

    const malformedRoot = fixture();
    try {
        fs.writeFileSync(path.join(malformedRoot, 'contracts', bookingFile), '{');
        assert.throws(() => verifyPinnedContracts(malformedRoot), undefined, 'malformed artifact');
    } finally {
        fs.rmSync(malformedRoot, { recursive: true, force: true });
    }

    const unknownRoot = fixture();
    try {
        mutateJson(unknownRoot, 'otp-contract-pins.json', (value) => { value.contracts[0].contract = 'otp-unknown-v1'; });
        assert.throws(() => verifyPinnedContracts(unknownRoot), undefined, 'unknown contract name');
    } finally {
        fs.rmSync(unknownRoot, { recursive: true, force: true });
    }

    console.log('OTP CONTRACT VERIFICATION OK: 10 checks');
})().catch((error) => {
    console.error(error);
    process.exit(1);
});
