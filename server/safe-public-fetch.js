'use strict';

const dns = require('dns');
const http = require('http');
const https = require('https');
const net = require('net');

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_BYTES = 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;

class PublicFetchError extends Error {
    constructor(code, message, statusCode = 400) {
        super(message);
        this.name = 'PublicFetchError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

function normalizeHostname(hostname) {
    return String(hostname || '')
        .trim()
        .toLowerCase()
        .replace(/^\[|\]$/g, '')
        .replace(/\.$/, '')
        .split('%')[0];
}

function ipv4Parts(address) {
    if (net.isIP(address) !== 4) return null;
    return address.split('.').map((part) => Number(part));
}

function isBlockedIpv4(address) {
    const parts = ipv4Parts(address);
    if (!parts) return false;
    const [a, b, c] = parts;
    return a === 0
        || a === 10
        || a === 127
        || (a === 100 && b >= 64 && b <= 127)
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 0 && c === 0)
        || (a === 192 && b === 0 && c === 2)
        || (a === 192 && b === 88 && c === 99)
        || (a === 192 && b === 168)
        || (a === 198 && (b === 18 || b === 19))
        || (a === 198 && b === 51 && c === 100)
        || (a === 203 && b === 0 && c === 113)
        || a >= 224;
}

function expandIpv6(address) {
    let input = normalizeHostname(address);
    if (net.isIP(input) !== 6) return null;

    if (input.includes('.')) {
        const lastColon = input.lastIndexOf(':');
        const embedded = ipv4Parts(input.slice(lastColon + 1));
        if (!embedded) return null;
        const high = ((embedded[0] << 8) | embedded[1]).toString(16);
        const low = ((embedded[2] << 8) | embedded[3]).toString(16);
        input = `${input.slice(0, lastColon)}:${high}:${low}`;
    }

    const halves = input.split('::');
    if (halves.length > 2) return null;
    const left = halves[0] ? halves[0].split(':') : [];
    const right = halves[1] ? halves[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;
    const groups = halves.length === 2
        ? [...left, ...Array(missing).fill('0'), ...right]
        : left;
    if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/i.test(group))) return null;
    return groups.map((group) => parseInt(group, 16));
}

function isBlockedIpv6(address) {
    const groups = expandIpv6(address);
    if (!groups) return false;
    const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;
    const allZero = groups.every((group) => group === 0);
    const loopback = groups.slice(0, 7).every((group) => group === 0) && g7 === 1;
    const uniqueLocal = (g0 & 0xfe00) === 0xfc00;
    const linkLocal = (g0 & 0xffc0) === 0xfe80;
    const deprecatedSiteLocal = (g0 & 0xffc0) === 0xfec0;
    const multicast = (g0 & 0xff00) === 0xff00;
    const documentation = g0 === 0x2001 && g1 === 0x0db8;
    const ipv4Translation = (g0 === 0x0064 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0)
        || (g0 === 0x0064 && g1 === 0xff9b && g2 === 0x0001);
    const discardOnly = g0 === 0x0100 && g1 === 0 && g2 === 0 && g3 === 0;
    const ietfSpecial = g0 === 0x2001 && g1 <= 0x01ff;
    const sixToFour = g0 === 0x2002;
    const ipv4Mapped = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff;
    const ipv4Compatible = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0;
    return allZero || loopback || uniqueLocal || linkLocal || deprecatedSiteLocal
        || multicast || documentation || ipv4Translation || discardOnly || ietfSpecial
        || sixToFour || ipv4Mapped || ipv4Compatible;
}

function isBlockedIp(address) {
    const normalized = normalizeHostname(address);
    const family = net.isIP(normalized);
    return family === 4 ? isBlockedIpv4(normalized) : family === 6 ? isBlockedIpv6(normalized) : true;
}

function isBlockedHostname(hostname) {
    const host = normalizeHostname(hostname);
    if (!host) return true;
    if (net.isIP(host)) return isBlockedIp(host);
    return host === 'localhost'
        || host.endsWith('.localhost')
        || host === 'metadata.google.internal'
        || host.endsWith('.metadata.google.internal')
        || host === 'instance-data.ec2.internal'
        || host.endsWith('.internal')
        || host.endsWith('.local')
        || host.endsWith('.lan')
        || host.endsWith('.home');
}

function validatePublicHttpUrl(rawUrl, baseUrl) {
    const raw = String(rawUrl || '').trim();
    if (!raw || raw.length > 2048) throw new PublicFetchError('invalid_url', 'Invalid URL');
    let url;
    try {
        url = baseUrl ? new URL(raw, baseUrl) : new URL(raw);
    } catch (_) {
        throw new PublicFetchError('invalid_url', 'Invalid URL');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new PublicFetchError('invalid_protocol', 'Only HTTP and HTTPS are supported');
    }
    if (url.username || url.password) {
        throw new PublicFetchError('credentials_not_allowed', 'URL credentials are not allowed');
    }
    const defaultPort = url.protocol === 'https:' ? '443' : '80';
    if (url.port && url.port !== defaultPort) {
        throw new PublicFetchError('port_not_allowed', 'Only standard HTTP and HTTPS ports are supported');
    }
    if (isBlockedHostname(url.hostname)) {
        throw new PublicFetchError('destination_not_allowed', 'Destination is not publicly routable');
    }
    return url;
}

function normalizeLookupRecords(records) {
    const list = Array.isArray(records) ? records : [records];
    return list.map((record) => typeof record === 'string'
        ? { address: record, family: net.isIP(record) }
        : { address: record?.address, family: Number(record?.family) || net.isIP(record?.address || '') }
    ).filter((record) => record.address && (record.family === 4 || record.family === 6));
}

async function resolvePublicHttpUrl(rawUrl, { lookup = dns.promises.lookup, baseUrl } = {}) {
    const url = validatePublicHttpUrl(rawUrl, baseUrl);
    const host = normalizeHostname(url.hostname);
    const records = net.isIP(host)
        ? [{ address: host, family: net.isIP(host) }]
        : normalizeLookupRecords(await lookup(host, { all: true, verbatim: true }));
    if (!records.length || records.some((record) => isBlockedIp(record.address))) {
        throw new PublicFetchError('destination_not_allowed', 'Destination is not publicly routable');
    }
    return { url, records };
}

function pinnedLookup(expectedHostname, records) {
    const expected = normalizeHostname(expectedHostname);
    let cursor = 0;
    return (hostname, options, callback) => {
        const cb = typeof options === 'function' ? options : callback;
        const opts = typeof options === 'object' && options ? options : {};
        if (normalizeHostname(hostname) !== expected) {
            return cb(new PublicFetchError('dns_mismatch', 'Unexpected DNS lookup'));
        }
        if (opts.all) return cb(null, records.map((record) => ({ ...record })));
        const record = records[cursor++ % records.length];
        return cb(null, record.address, record.family);
    };
}

function destroyBody(body) {
    if (body && typeof body.destroy === 'function') body.destroy();
}

async function readResponseTextLimited(response, maxBytes = DEFAULT_MAX_BYTES) {
    const declared = Number(response?.headers?.get?.('content-length') || 0);
    if (Number.isFinite(declared) && declared > maxBytes) {
        destroyBody(response.body);
        throw new PublicFetchError('response_too_large', 'Remote response exceeded size limit', 413);
    }

    if (response?.body && typeof response.body[Symbol.asyncIterator] === 'function') {
        const chunks = [];
        let total = 0;
        for await (const rawChunk of response.body) {
            const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
            total += chunk.length;
            if (total > maxBytes) {
                destroyBody(response.body);
                throw new PublicFetchError('response_too_large', 'Remote response exceeded size limit', 413);
            }
            chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString('utf8');
    }

    const buffer = response?.arrayBuffer
        ? Buffer.from(await response.arrayBuffer())
        : Buffer.from(String(await response.text()), 'utf8');
    if (buffer.length > maxBytes) {
        throw new PublicFetchError('response_too_large', 'Remote response exceeded size limit', 413);
    }
    return buffer.toString('utf8');
}

async function fetchPublicText(rawUrl, {
    fetchImpl,
    lookup = dns.promises.lookup,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_BYTES,
    maxRedirects = DEFAULT_MAX_REDIRECTS
} = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required');
    let currentUrl = rawUrl;

    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
        const target = await resolvePublicHttpUrl(currentUrl, { lookup });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const lookupFn = pinnedLookup(target.url.hostname, target.records);
        const agent = target.url.protocol === 'https:'
            ? new https.Agent({ keepAlive: false, lookup: lookupFn })
            : new http.Agent({ keepAlive: false, lookup: lookupFn });
        try {
            const response = await fetchImpl(target.url.href, {
                method: 'GET',
                headers,
                redirect: 'manual',
                signal: controller.signal,
                agent
            });
            if ([301, 302, 303, 307, 308].includes(response.status)) {
                destroyBody(response.body);
                const location = response.headers?.get?.('location');
                if (!location) throw new PublicFetchError('invalid_redirect', 'Redirect location missing');
                if (redirectCount >= maxRedirects) {
                    throw new PublicFetchError('too_many_redirects', 'Too many redirects');
                }
                currentUrl = validatePublicHttpUrl(location, target.url.href).href;
                continue;
            }
            const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
            if (contentType && !/^(text\/|application\/(?:xhtml\+xml|xml))/i.test(contentType)) {
                destroyBody(response.body);
                throw new PublicFetchError('unsupported_content_type', 'Remote response is not text');
            }
            const text = await readResponseTextLimited(response, maxBytes);
            return { response, text, finalUrl: target.url.href, redirects: redirectCount };
        } finally {
            clearTimeout(timer);
            agent.destroy();
        }
    }
    throw new PublicFetchError('too_many_redirects', 'Too many redirects');
}

module.exports = {
    PublicFetchError,
    validatePublicHttpUrl,
    resolvePublicHttpUrl,
    fetchPublicText,
    readResponseTextLimited,
    isBlockedIp,
    isBlockedHostname
};
