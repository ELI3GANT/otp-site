/**
 * Early fail-closed sandbox/preview isolation for otp-site.
 *
 * Must run BEFORE dotenv.config(), Stripe client init, and Supabase Admin init
 * so shared Vercel Preview/Production environment variables cannot leak
 * production credentials, email/AI keys, admin/portal signing secrets, E2E
 * fixtures, or production upstream origins into Preview or QA/sandbox runs.
 */

const APPROVED_QA_SUPABASE_REF = 'tybgpykqaqaeoghdvpet';
const FORBIDDEN_PROD_SUPABASE_REF = 'ckumhowhucbbmpdeqkrl';

const FORBIDDEN_PROD_OS_HOSTS = new Set([
    'otp-os.vercel.app',
    'otp-floorops.vercel.app'
]);

const FORBIDDEN_PROD_SITE_HOSTS = new Set([
    'onlytrueperspective.tech',
    'www.onlytrueperspective.tech',
    'otp-site.vercel.app'
]);

const DIRECT_STRIPE_ENV_KEYS = [
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_FAST_LANE_DEPOSIT_LINK',
    'STRIPE_ENGINE_DEPOSIT_LINK',
    'STRIPE_SYSTEM_DEPOSIT_LINK'
];

const DIRECT_SUPABASE_ENV_KEYS = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

const INHERITED_SECRET_ENV_KEYS = [
    // Transactional email
    'RESEND_API_KEY',
    'INVOICE_FROM_EMAIL',
    'EMAIL_FROM',
    // AI providers
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GROQ_API_KEY',
    // Admin & portal signing credentials (isolated sandbox-* overrides may still be promoted below)
    'ADMIN_PASSCODE',
    'ADMIN_PASSWORD',
    'OTP_ADMIN_PASSCODE',
    'OTP_SITE_ADMIN_PASSCODE',
    'OTP_ADMIN_TOKEN',
    'JWT_SECRET',
    'CLIENT_PORTAL_SECRET',
    // E2E fixtures
    'E2E_TEST_MODE',
    'E2E_TEST_PORTAL_TOKEN',
    'E2E_TEST_CLIENT_EMAIL',
    // Production portal / deploy flags
    'CLIENT_PORTAL_BASE_URL',
    'PUBLIC_CLIENT_BASE_URL',
    'OTP_ALLOW_VERCEL_GIT_PRODUCTION_DEPLOY'
];

const UPSTREAM_AND_ORIGIN_KEYS = [
    'OTP_OS_UPSTREAM_URL',
    'OTP_OS_UPSTREAM',
    'OTP_BOOKINGS_UPSTREAM_URL',
    'OTP_BOOKINGS_API_BASE',
    'OTP_CLIENT_PORTAL_UPSTREAM_URL',
    'OTP_OS_PUBLIC_BASE',
    'OTP_OS_JOB_MUTATION_UPSTREAM_URL',
    'OTP_OS_JOB_ARCHIVE_UPSTREAM_URL',
    'FLOOROPS_UPSTREAM_ORIGIN',
    'OTP_PUBLIC_SITE_ORIGIN',
    'OTP_CHECKOUT_ORIGIN'
];

function isSandboxOrPreviewEnv(env = process.env) {
    const isVercelPreview = (
        String(env.VERCEL || '').trim() === '1'
        && String(env.VERCEL_ENV || '').trim().toLowerCase() === 'preview'
    );
    const otpEnv = String(env.OTP_ENV || '').trim().toLowerCase();
    return isVercelPreview || otpEnv === 'qa' || otpEnv === 'sandbox';
}

function isApprovedQaSupabaseUrl(rawUrl) {
    const raw = String(rawUrl || '').trim();
    if (!raw || raw.includes(FORBIDDEN_PROD_SUPABASE_REF)) return false;
    try {
        const parsed = new URL(raw);
        return parsed.protocol === 'https:' && parsed.hostname.toLowerCase() === `${APPROVED_QA_SUPABASE_REF}.supabase.co`;
    } catch (_) {
        return false;
    }
}

function isTestStripeKey(rawKey) {
    const raw = String(rawKey || '').trim();
    return /^(?:sk|rk)_test_/i.test(raw);
}

function isForbiddenProdHost(rawUrl, extraForbiddenSet = null) {
    const raw = String(rawUrl || '').trim();
    if (!raw) return false;
    try {
        const parsed = new URL(raw);
        const host = parsed.hostname.toLowerCase();
        if (FORBIDDEN_PROD_OS_HOSTS.has(host) || FORBIDDEN_PROD_SITE_HOSTS.has(host)) return true;
        if (extraForbiddenSet && extraForbiddenSet.has(host)) return true;
        return false;
    } catch (_) {
        const lower = raw.toLowerCase();
        for (const host of FORBIDDEN_PROD_OS_HOSTS) {
            if (lower.includes(host)) return true;
        }
        for (const host of FORBIDDEN_PROD_SITE_HOSTS) {
            if (lower.includes(host)) return true;
        }
        return false;
    }
}

function resolveSandboxSafeUpstream(rawValue, { isSandbox = false, fallbackProd = '' } = {}) {
    const raw = String(rawValue || '').trim().replace(/\/+$/, '');
    if (!isSandbox) {
        return raw || String(fallbackProd || '').trim().replace(/\/+$/, '');
    }
    if (!raw) return '';
    try {
        const parsed = new URL(raw);
        const host = parsed.hostname.toLowerCase();
        const isLocalHttp = parsed.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1');
        if (parsed.protocol !== 'https:' && !isLocalHttp) return '';
        if (FORBIDDEN_PROD_OS_HOSTS.has(host) || FORBIDDEN_PROD_SITE_HOSTS.has(host)) return '';
        return raw;
    } catch (_) {
        return '';
    }
}

function resolveSandboxSafeOrigin(rawValue, { isSandbox = false, vercelUrl = '', fallbackProd = 'https://www.onlytrueperspective.tech' } = {}) {
    if (!isSandbox) {
        try {
            const url = new URL(String(rawValue || fallbackProd).trim());
            if (!/^https?:$/.test(url.protocol)) throw new Error('invalid protocol');
            if (url.hostname.toLowerCase() === 'onlytrueperspective.tech') {
                url.hostname = 'www.onlytrueperspective.tech';
            }
            url.protocol = 'https:';
            url.hash = '';
            url.search = '';
            return url.toString().replace(/\/+$/, '');
        } catch (_) {
            return fallbackProd;
        }
    }

    const candidates = [
        String(rawValue || '').trim(),
        vercelUrl ? `https://${String(vercelUrl).trim().replace(/^https?:\/\//i, '')}` : ''
    ].filter(Boolean);

    for (const candidate of candidates) {
        try {
            const url = new URL(candidate);
            const host = url.hostname.toLowerCase();
            const isLocalHttp = url.protocol === 'http:' && (host === 'localhost' || host === '127.0.0.1');
            if (url.protocol !== 'https:' && !isLocalHttp) continue;
            if (FORBIDDEN_PROD_SITE_HOSTS.has(host) || FORBIDDEN_PROD_OS_HOSTS.has(host)) continue;
            url.pathname = '';
            url.search = '';
            url.hash = '';
            return url.toString().replace(/\/+$/, '');
        } catch (_) {
            // Try next candidate
        }
    }

    return '';
}

/**
 * Strip inherited production credentials and origins in Vercel Preview / sandbox mode.
 * Mutates `env` in place and returns an audit summary without secret values.
 */
function applySiteSandboxIsolation(env = process.env) {
    if (!isSandboxOrPreviewEnv(env)) {
        return {
            active: false,
            allowDirectStripe: true,
            allowDirectSupabase: true,
            stripped: [],
            blocked: []
        };
    }

    const stripped = [];
    const blocked = [];

    const stripKey = (key, reason = '') => {
        if (Object.prototype.hasOwnProperty.call(env, key) && String(env[key] || '') !== '') {
            stripped.push(key);
        }
        delete env[key];
        if (reason) blocked.push(`${key}:${reason}`);
    };

    const allowDirectStripe = (
        String(env.OTP_SITE_DIRECT_STRIPE_SANDBOX || '').trim().toLowerCase() === 'true'
        && isTestStripeKey(env.STRIPE_SECRET_KEY)
    );
    if (!allowDirectStripe) {
        for (const key of DIRECT_STRIPE_ENV_KEYS) {
            stripKey(key, env[key] ? 'direct_stripe_disabled_in_sandbox' : '');
        }
    }

    const rawSupabaseUrl = String(env.SUPABASE_URL || '').trim();
    const hasForbiddenSupabaseRef = rawSupabaseUrl.includes(FORBIDDEN_PROD_SUPABASE_REF);
    const allowDirectSupabase = (
        !hasForbiddenSupabaseRef
        && String(env.OTP_SITE_DIRECT_SUPABASE_QA || '').trim().toLowerCase() === 'true'
        && isApprovedQaSupabaseUrl(rawSupabaseUrl)
    );
    if (!allowDirectSupabase) {
        const reason = hasForbiddenSupabaseRef ? 'forbidden_prod_supabase_ref' : 'direct_supabase_disabled_in_sandbox';
        for (const key of DIRECT_SUPABASE_ENV_KEYS) {
            stripKey(key, env[key] ? reason : '');
        }
    }

    for (const key of INHERITED_SECRET_ENV_KEYS) {
        stripKey(key);
    }
    env.E2E_TEST_MODE = '0';

    // Promote explicitly isolated sandbox-only signing/admin secrets if configured.
    const isolatedPromotions = [
        ['OTP_SANDBOX_JWT_SECRET', 'JWT_SECRET'],
        ['OTP_SANDBOX_CLIENT_PORTAL_SECRET', 'CLIENT_PORTAL_SECRET'],
        ['OTP_SANDBOX_ADMIN_PASSCODE', 'ADMIN_PASSCODE']
    ];
    for (const [srcKey, targetKey] of isolatedPromotions) {
        const val = String(env[srcKey] || '').trim();
        if (val) {
            env[targetKey] = val;
        }
    }

    for (const key of UPSTREAM_AND_ORIGIN_KEYS) {
        if (env[key] && isForbiddenProdHost(env[key])) {
            stripKey(key, 'forbidden_prod_host');
        }
    }

    return {
        active: true,
        allowDirectStripe,
        allowDirectSupabase,
        stripped,
        blocked
    };
}

module.exports = {
    APPROVED_QA_SUPABASE_REF,
    FORBIDDEN_PROD_SUPABASE_REF,
    FORBIDDEN_PROD_OS_HOSTS,
    FORBIDDEN_PROD_SITE_HOSTS,
    isSandboxOrPreviewEnv,
    isApprovedQaSupabaseUrl,
    isTestStripeKey,
    isForbiddenProdHost,
    resolveSandboxSafeUpstream,
    resolveSandboxSafeOrigin,
    applySiteSandboxIsolation
};
