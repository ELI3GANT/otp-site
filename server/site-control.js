'use strict';

const SITE_COMMAND_SCHEMA = 'otp-site-command-v1';

const PUBLIC_SITE_CONTENT_KEYS = Object.freeze([
    'hero-subtitle',
    'studio-text-1',
    'studio-text-2',
    'services-desc'
]);

const PUBLIC_SITE_CONTENT_KEY_SET = new Set(PUBLIC_SITE_CONTENT_KEYS);

const SITE_COMMAND_VALUES = Object.freeze({
    maintenance: new Set(['on', 'off']),
    visuals: new Set(['high', 'low']),
    theme: new Set(['light', 'dark']),
    kursor: new Set(['on', 'off'])
});

function siteContentAccessScope(key) {
    return PUBLIC_SITE_CONTENT_KEY_SET.has(String(key || '').trim()) ? 'public' : 'private';
}

function cleanStatusText(value) {
    const normalized = String(value == null ? '' : value)
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!normalized || normalized.length > 120 || /[<>]/.test(normalized)) return '';
    return normalized;
}

function normalizeSiteCommand(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return { ok: false, reason: 'malformed_payload' };
    }
    const keys = Object.keys(input).sort();
    if (keys.some((key) => !['schema', 'type', 'value'].includes(key))) {
        return { ok: false, reason: 'malformed_payload' };
    }
    if (input.schema !== SITE_COMMAND_SCHEMA) {
        return { ok: false, reason: 'invalid_schema' };
    }

    const type = String(input.type || '').trim().toLowerCase();
    if (type === 'status') {
        const value = cleanStatusText(input.value);
        return value
            ? { ok: true, command: { schema: SITE_COMMAND_SCHEMA, type, value } }
            : { ok: false, reason: 'invalid_value' };
    }

    const allowedValues = SITE_COMMAND_VALUES[type];
    const value = String(input.value == null ? '' : input.value).trim().toLowerCase();
    if (!allowedValues || !allowedValues.has(value)) {
        return { ok: false, reason: allowedValues ? 'invalid_value' : 'unsupported_command' };
    }
    return { ok: true, command: { schema: SITE_COMMAND_SCHEMA, type, value } };
}

function applySiteCommandToState(currentState, command) {
    const base = currentState && typeof currentState === 'object' && !Array.isArray(currentState)
        ? { ...currentState }
        : {};
    base[command.type] = command.value;
    return base;
}

module.exports = {
    SITE_COMMAND_SCHEMA,
    PUBLIC_SITE_CONTENT_KEYS,
    siteContentAccessScope,
    normalizeSiteCommand,
    applySiteCommandToState
};
