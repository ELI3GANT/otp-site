const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules', '.vercel', 'tmp', 'qa-screens', 'qa-artifacts', 'output']);
const ignoredExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.lock']);

function isGitRepo() {
    try {
        execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, stdio: 'ignore' });
        return true;
    } catch (_) {
        return false;
    }
}

function trackedFiles() {
    const out = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' });
    return out.split('\0').filter(Boolean);
}

function walkFiles(dir = root, files = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        const rel = path.relative(root, abs);
        if (entry.isDirectory()) {
            if (!ignoredDirs.has(entry.name)) walkFiles(abs, files);
            continue;
        }
        if (!entry.isFile()) continue;
        if (ignoredExtensions.has(path.extname(entry.name).toLowerCase())) continue;
        files.push(rel);
    }
    return files;
}

function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch (_) {
        return null;
    }
}

function lineFindings(line) {
    const findings = [];
    const google = line.match(/AIza[0-9A-Za-z_-]{20,}/);
    if (google) findings.push('Google API key');

    const openAi = line.match(/(?:sk|sk-proj|sk-ant|gsk)_[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9_-]{20,}/);
    if (openAi) findings.push('Provider API key');

    const jwtMatches = line.match(/eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}/g) || [];
    for (const token of jwtMatches) {
        const payload = decodeJwt(token);
        if (payload?.role === 'service_role') {
            findings.push('Supabase service-role JWT');
        }
    }

    return findings;
}

function scanFile(rel) {
    let content = '';
    try {
        content = fs.readFileSync(path.join(root, rel), 'utf8');
    } catch (_) {
        return [];
    }

    return content.split(/\r?\n/).flatMap((line, idx) => {
        return lineFindings(line).map((rule) => ({ file: rel, line: idx + 1, rule }));
    });
}

const files = isGitRepo() ? trackedFiles() : walkFiles();
const findings = files.flatMap(scanFile);

if (findings.length) {
    console.error('Potential secrets found. Values are intentionally hidden.');
    for (const finding of findings) {
        console.error(`${finding.file}:${finding.line} ${finding.rule}`);
    }
    process.exit(1);
}

console.log(`Secret scan passed across ${files.length} files.`);
