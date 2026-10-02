const express = require('express');

const ACCESS_COOKIE = '__Host-otp_client_access';
const REFRESH_COOKIE = '__Host-otp_client_refresh';
const PROJECT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,119}$/;

function error(res, status, errorCode, message) {
    return res.status(status).json({ ok: false, errorCode, message });
}

function cookie(req, name) {
    const raw = String(req.headers.cookie || '');
    const entry = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
    if (!entry) return '';
    try { return decodeURIComponent(entry.slice(name.length + 1)); } catch { return ''; }
}

function cookieLine(name, value, seconds) {
    return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}

function clearCookies(res) {
    res.setHeader('Set-Cookie', [cookieLine(ACCESS_COOKIE, '', 0), cookieLine(REFRESH_COOKIE, '', 0)]);
}

function setCookies(res, session) {
    const accessSeconds = Math.max(60, Math.min(Number(session.expires_in) || 3600, 3600));
    res.setHeader('Set-Cookie', [
        cookieLine(ACCESS_COOKIE, session.access_token, accessSeconds),
        cookieLine(REFRESH_COOKIE, session.refresh_token, 60 * 60 * 24 * 30)
    ]);
}

function sameOrigin(req) {
    const origin = req.get('origin');
    if (!origin) return false;
    try {
        const source = new URL(origin);
        const host = String(req.get('host') || '').toLowerCase();
        const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
        return source.host.toLowerCase() === host && source.protocol === (local ? 'http:' : 'https:');
    } catch { return false; }
}

function verifiedUser(user) {
    return Boolean(user?.id && user.email_confirmed_at && !user.is_anonymous);
}

function tokenShape(value, maxLength, minLength = 21) {
    return typeof value === 'string' && value.length >= minLength && value.length <= maxLength && !/\s/.test(value);
}

function publicText(value, maxLength = 240) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function publicProject(project) {
    if (!project || typeof project !== 'object' || !PROJECT_ID_PATTERN.test(project.id)) return null;
    return {
        id: project.id,
        title: publicText(project.title, 180),
        service: publicText(project.service, 140),
        status: publicText(project.status, 80),
        summary: publicText(project.summary, 2200),
        nextAction: publicText(project.nextAction, 600),
        updatedAt: publicText(project.updatedAt, 60),
        deliverables: (Array.isArray(project.deliverables) ? project.deliverables : []).slice(0, 100).map((item) => ({
            name: publicText(item?.name, 180),
            status: publicText(item?.status, 80),
            clientNotes: publicText(item?.clientNotes, 600),
            assetUrl: publicText(item?.assetUrl, 2048)
        })),
        documents: (Array.isArray(project.documents) ? project.documents : []).slice(0, 100).map((item) => ({
            label: publicText(item?.label, 180),
            url: publicText(item?.url, 2048)
        }))
    };
}

function safeUpstreamData(data, kind) {
    if (!data || data.ok !== true) return null;
    if (kind === 'me' && data.profile && Array.isArray(data.organizations)) {
        return {
            ok: true,
            profile: { email: publicText(data.profile.email, 254) },
            organizations: data.organizations.slice(0, 100).map((item) => ({
                name: publicText(item?.name, 160),
                role: item?.role === 'client_owner' ? 'client_owner' : 'client_member'
            }))
        };
    }
    if (kind === 'projects' && Array.isArray(data.projects)) {
        return { ok: true, projects: data.projects.map(publicProject).filter(Boolean) };
    }
    if (kind === 'project') {
        const project = publicProject(data.project);
        if (project) return { ok: true, project };
    }
    return null;
}

function createClientAccountBridge({ enabled = false, authClient, upstreamBase, previewProtectionBypass = '', fetchUpstream = fetch } = {}) {
    const router = express.Router();
    router.use((req, res, next) => {
        if (!/^\/(?:session(?:\/(?:exchange|logout|request))?|projects(?:\/[^/]+)?)\/?$/.test(req.path)) return next();
        res.set('Cache-Control', 'private, no-store');
        if (!enabled) return error(res, 503, 'client_accounts_disabled', 'Client account access is not available yet.');
        if (!authClient || !upstreamBase) {
            return error(res, 503, 'client_access_unavailable', 'Client account access is temporarily unavailable.');
        }
        return next();
    });

    async function upstream(path, accessToken, kind) {
        const upstreamUrl = new URL(upstreamBase);
        const protectionHeaders = previewProtectionBypass && upstreamUrl.protocol === 'https:' && upstreamUrl.hostname.endsWith('.vercel.app')
            ? { 'x-vercel-protection-bypass': previewProtectionBypass } : {};
        const response = await fetchUpstream(`${upstreamBase.replace(/\/+$/, '')}/api/v1/client${path}`, {
            headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}`, ...protectionHeaders },
            redirect: 'error',
            signal: AbortSignal.timeout(8000)
        });
        if (!response.ok) return { status: [401, 403, 404].includes(response.status) ? response.status : 503 };
        const data = safeUpstreamData(await response.json().catch(() => null), kind);
        return data ? { status: 200, data } : { status: 503 };
    }

    async function sessionFor(req, res) {
        const client = authClient();
        let accessToken = cookie(req, ACCESS_COOKIE);
        const refreshToken = cookie(req, REFRESH_COOKIE);
        if (!tokenShape(accessToken, 4096)) return null;
        let { data, error: authError } = await client.auth.getUser(accessToken);
        if (authError || !verifiedUser(data?.user)) {
            if (!tokenShape(refreshToken, 1024, 1)) return null;
            const refreshed = await client.auth.refreshSession({ refresh_token: refreshToken });
            if (refreshed.error || !refreshed.data?.session) return null;
            const session = refreshed.data.session;
            if (!tokenShape(session.access_token, 4096) || !tokenShape(session.refresh_token, 1024, 1)) return null;
            accessToken = session.access_token;
            ({ data, error: authError } = await client.auth.getUser(accessToken));
            if (authError || !verifiedUser(data?.user)) return null;
            setCookies(res, session);
        }
        return accessToken;
    }

    router.post('/session/exchange', async (req, res) => {
        if (!sameOrigin(req)) return error(res, 403, 'origin_required', 'Request origin could not be verified.');
        const accessToken = req.body?.access_token;
        const refreshToken = req.body?.refresh_token;
        if (!tokenShape(accessToken, 4096) || !tokenShape(refreshToken, 1024, 1)) {
            return error(res, 400, 'invalid_client_session', 'The sign-in link is invalid or expired.');
        }
        try {
            const { data, error: authError } = await authClient().auth.getUser(accessToken);
            if (authError || !verifiedUser(data?.user)) {
                return error(res, 401, 'client_auth_required', 'The sign-in link is invalid or expired.');
            }
            const result = await upstream('/me', accessToken, 'me');
            if (result.status !== 200) {
                return error(res, result.status, 'client_access_not_granted', 'Your client workspace is not available yet.');
            }
            setCookies(res, { access_token: accessToken, refresh_token: refreshToken, expires_in: req.body?.expires_in });
            return res.json(result.data);
        } catch {
            return error(res, 503, 'client_access_unavailable', 'Client account access is temporarily unavailable.');
        }
    });

    router.post('/session/request', async (req, res) => {
        if (!sameOrigin(req)) return error(res, 403, 'origin_required', 'Request origin could not be verified.');
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return error(res, 400, 'invalid_email', 'Enter a valid email address.');
        }
        try {
            const result = await authClient().auth.signInWithOtp({
                email,
                options: { shouldCreateUser: false, emailRedirectTo: `${req.get('origin')}/client/login` }
            });
            if (result.error && result.error.code !== 'user_not_found') {
                return error(res, 503, 'client_auth_unavailable', 'Sign-in email is temporarily unavailable.');
            }
        } catch {
            return error(res, 503, 'client_auth_unavailable', 'Sign-in email is temporarily unavailable.');
        }
        return res.json({ ok: true, message: 'If your client account is active, check your email for a sign-in link.' });
    });

    router.post('/session/logout', (req, res) => {
        if (!sameOrigin(req)) return error(res, 403, 'origin_required', 'Request origin could not be verified.');
        clearCookies(res);
        return res.json({ ok: true });
    });

    async function read(req, res, path, kind) {
        try {
            const accessToken = await sessionFor(req, res);
            if (!accessToken) {
                clearCookies(res);
                return error(res, 401, 'client_auth_required', 'Sign in to view your projects.');
            }
            const result = await upstream(path, accessToken, kind);
            if (result.status === 401) clearCookies(res);
            if (result.status !== 200) {
                const code = result.status === 404 ? 'project_not_found' : 'client_access_unavailable';
                const message = result.status === 404 ? 'Project not found.' : 'Client account access is temporarily unavailable.';
                return error(res, result.status, code, message);
            }
            return res.json(result.data);
        } catch {
            return error(res, 503, 'client_access_unavailable', 'Client account access is temporarily unavailable.');
        }
    }

    router.get('/session', (req, res) => read(req, res, '/me', 'me'));
    router.get('/projects', (req, res) => read(req, res, '/projects', 'projects'));
    router.get('/projects/:id', (req, res) => {
        const id = String(req.params.id || '');
        if (!PROJECT_ID_PATTERN.test(id)) return error(res, 404, 'project_not_found', 'Project not found.');
        return read(req, res, `/projects/${encodeURIComponent(id)}`, 'project');
    });
    return router;
}

module.exports = { createClientAccountBridge };
