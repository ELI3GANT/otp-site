import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EXPECTED_CONTRACTS = Object.freeze(['otp-booking-intake-v1', 'otp-job-admin-mutation-v1', 'otp-lineage-v1']);
const ARTIFACT_FORMAT = 'otp-contract-artifact-v1';
const PINS_FORMAT = 'otp-contract-pins-v1';
const SORTABLE_ARRAY_KEYS = new Set(['enum', 'required']);

export class OtpContractVerificationError extends Error {}

function canonicalize(value, parentKey = '') {
    if (Array.isArray(value)) {
        const entries = value.map((entry) => canonicalize(entry));
        return SORTABLE_ARRAY_KEYS.has(parentKey)
            ? entries.toSorted((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
            : entries;
    }
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key], key)]));
    }
    return value;
}

function digest(value) {
    return `sha256:${createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')}`;
}

function readJson(location, label) {
    try {
        return JSON.parse(fs.readFileSync(location, 'utf8'));
    } catch (error) {
        throw new OtpContractVerificationError(`${label} is missing or malformed: ${error.message}`);
    }
}

function contractVersion(contract) {
    const match = contract.match(/-v(\d+)$/);
    if (!match) throw new OtpContractVerificationError(`Unknown or unversioned contract name: ${contract}`);
    return match[1];
}

export function verifyArtifact(artifact, expected = {}) {
    if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) throw new OtpContractVerificationError('Contract artifact must be an object');
    if (artifact.artifact_format !== ARTIFACT_FORMAT) throw new OtpContractVerificationError('Malformed artifact format');
    if (!EXPECTED_CONTRACTS.includes(artifact.contract)) throw new OtpContractVerificationError(`Unknown contract name: ${artifact.contract}`);
    if (expected.contract && artifact.contract !== expected.contract) throw new OtpContractVerificationError('Contract name mismatch');
    if (artifact.version !== contractVersion(artifact.contract)) throw new OtpContractVerificationError('Contract version mismatch');
    if (expected.version && artifact.version !== expected.version) throw new OtpContractVerificationError('Pinned version mismatch');
    if (!artifact.definition || typeof artifact.definition !== 'object') throw new OtpContractVerificationError('Malformed contract definition');
    const actualDigest = digest({ artifact_format: artifact.artifact_format, contract: artifact.contract, version: artifact.version, definition: artifact.definition });
    if (artifact.digest !== actualDigest) throw new OtpContractVerificationError('Contract artifact digest is stale');
    if (expected.digest && actualDigest !== expected.digest) throw new OtpContractVerificationError('Pinned contract digest mismatch');
    return artifact;
}

export function verifyPinnedContracts(rootDirectory) {
    const contractsDirectory = path.join(rootDirectory, 'contracts');
    const pins = readJson(path.join(contractsDirectory, 'otp-contract-pins.json'), 'Contract pins');
    if (pins.pins_format !== PINS_FORMAT || pins.consumer !== 'otp-site' || !Array.isArray(pins.contracts)) throw new OtpContractVerificationError('Malformed contract pins');
    const actualNames = pins.contracts.map(({ contract }) => contract);
    if (new Set(actualNames).size !== actualNames.length || JSON.stringify(actualNames) !== JSON.stringify(EXPECTED_CONTRACTS)) throw new OtpContractVerificationError('Pinned contract set is missing, duplicated, or unknown');
    for (const pin of pins.contracts) {
        if (pin.file !== `${pin.contract}.json`) throw new OtpContractVerificationError(`Unsafe artifact filename for ${pin.contract}`);
        verifyArtifact(readJson(path.join(contractsDirectory, pin.file), pin.contract), pin);
    }
    return { contracts: pins.contracts.length };
}

export function syncPinnedContracts(rootDirectory, sourceDirectory) {
    const sourceManifest = readJson(path.join(sourceDirectory, 'otp-contract-manifest.json'), 'CORE contract manifest');
    if (sourceManifest.manifest_format !== 'otp-contract-manifest-v1' || !Array.isArray(sourceManifest.contracts)) throw new OtpContractVerificationError('Malformed CORE contract manifest');
    const sourceEntries = new Map(sourceManifest.contracts.map((entry) => [entry.contract, entry]));
    const targetDirectory = path.join(rootDirectory, 'contracts');
    fs.mkdirSync(targetDirectory, { recursive: true });
    const pins = [];
    for (const contract of EXPECTED_CONTRACTS) {
        const sourceEntry = sourceEntries.get(contract);
        if (!sourceEntry) throw new OtpContractVerificationError(`CORE artifact is missing: ${contract}`);
        const artifact = readJson(path.join(sourceDirectory, sourceEntry.file), contract);
        verifyArtifact(artifact, sourceEntry);
        fs.writeFileSync(path.join(targetDirectory, sourceEntry.file), `${JSON.stringify(canonicalize(artifact), null, 2)}\n`);
        pins.push({ contract, digest: artifact.digest, file: sourceEntry.file, version: artifact.version });
    }
    fs.writeFileSync(path.join(targetDirectory, 'otp-contract-pins.json'), `${JSON.stringify(canonicalize({
        $comment: 'Generated from OTP CORE by npm run contracts:sync; do not edit by hand.', consumer: 'otp-site', contracts: pins, pins_format: PINS_FORMAT
    }), null, 2)}\n`);
    return verifyPinnedContracts(rootDirectory);
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
const thisFile = fileURLToPath(import.meta.url);
if (invokedFile === thisFile) {
    const rootDirectory = path.resolve(path.dirname(thisFile), '..');
    const command = process.argv[2] || 'verify';
    if (command === 'sync') {
        const source = path.resolve(process.env.OTP_CORE_CONTRACT_SOURCE || path.join(rootDirectory, '..', 'otp-core', 'contracts', 'generated'));
        const result = syncPinnedContracts(rootDirectory, source);
        console.log(`Synchronized and verified ${result.contracts} OTP contracts from CORE.`);
    } else if (command === 'verify') {
        const result = verifyPinnedContracts(rootDirectory);
        console.log(`Verified ${result.contracts} pinned OTP contracts offline.`);
    } else {
        throw new OtpContractVerificationError(`Unknown command: ${command}`);
    }
}
