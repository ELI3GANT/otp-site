/* eslint-disable no-console */

const { chromium } = require('playwright');

function short(text, n = 240) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

function isJwtLike(token) {
  const t = String(token || '').trim();
  const parts = t.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function hasUsableAdminToken(token) {
  return Boolean(String(token || '').trim()) && isJwtLike(token);
}

function envFlagEnabled(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

function firstEnvValue(names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return { value, source: name };
  }
  return { value: '', source: '' };
}

function adminSweepPasscodeEnv() {
  return firstEnvValue([
    'OTP_SWEEP_ADMIN_PASSCODE',
    'OTP_ADMIN_PASSCODE',
    'OTP_SITE_ADMIN_PASSCODE',
    'ADMIN_PASSCODE'
  ]);
}

function adminSweepTokenEnv(token = '') {
  const explicit = String(token || '').trim();
  if (explicit) return { value: explicit, source: 'provided_token' };
  return firstEnvValue([
    'OTP_SWEEP_ADMIN_TOKEN',
    'OTP_ADMIN_TOKEN'
  ]);
}

async function loginForAdminToken(baseUrl) {
  const passcode = adminSweepPasscodeEnv();
  if (!passcode.value) return { token: '', source: '', attempted: false, warning: 'No admin passcode env available for authenticated sweep login.' };

  try {
    const { response, text } = await fetchText(normalizePath(baseUrl, '/api/auth/login'), {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ passcode: passcode.value })
    });
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_) {
      return {
        token: '',
        source: '',
        attempted: true,
        error: `Admin sweep login returned invalid JSON (${response.status}).`
      };
    }
    const token = String(payload.token || payload.data?.token || '').trim();
    if (response.ok && hasUsableAdminToken(token)) {
      return { token, source: passcode.source, attempted: true, method: 'login' };
    }
    return {
      token: '',
      source: '',
      attempted: true,
      error: response.ok
        ? 'Admin sweep login response did not include a usable JWT.'
        : `Admin sweep login failed (${response.status}).`
    };
  } catch (error) {
    return {
      token: '',
      source: '',
      attempted: true,
      error: `Admin sweep login failed: ${short(error?.message || error)}`
    };
  }
}

async function resolveAdminToken(baseUrl, token = '') {
  const passcode = adminSweepPasscodeEnv();
  if (passcode.value) {
    const login = await loginForAdminToken(baseUrl);
    if (login.token) return login;
    return {
      token: '',
      source: '',
      attempted: true,
      error: login.error || 'Admin sweep login failed.'
    };
  }

  const provided = adminSweepTokenEnv(token);
  if (provided.value) {
    if (!hasUsableAdminToken(provided.value)) {
      return {
        token: '',
        source: '',
        attempted: true,
        error: `${provided.source} is not a usable admin JWT.`
      };
    }
    return { token: provided.value, source: provided.source, attempted: true, method: 'token' };
  }

  return {
    token: '',
    source: '',
    attempted: false,
    warning: `No OTP_SWEEP_ADMIN_PASSCODE or OTP_SWEEP_ADMIN_TOKEN provided; skipping admin-authenticated checks. ${tokenSetupHelp()}`
  };
}

function tokenSetupHelp() {
  return [
    'Set OTP_SWEEP_ADMIN_PASSCODE to run admin-authenticated checks through /api/auth/login.',
    'Optional fallback: OTP_SWEEP_ADMIN_TOKEN may be a real admin JWT (three dot-separated parts).',
    'Legacy env names OTP_ADMIN_PASSCODE and OTP_ADMIN_TOKEN are still accepted, but sweep-specific env names are preferred.',
    'Do not paste placeholders, static bypass tokens, passcodes, or JWTs into logs.'
  ].join(' ');
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== 'object') return undefined;
  const keys = Object.keys(payload).slice(0, 12);
  return { type: Array.isArray(payload) ? 'array' : 'object', keys };
}

function contentTypeLooksReasonable(kind, contentType) {
  const ct = String(contentType || '').toLowerCase();
  if (kind === 'json') return ct.includes('json');
  if (kind === 'png') return ct.includes('image/png');
  if (kind === 'gif') return ct.includes('image/gif');
  if (kind === 'jpg' || kind === 'jpeg') return ct.includes('image/jpeg');
  if (kind === 'image') return ct.startsWith('image/');
  if (kind === 'css') return ct.includes('text/css') || ct.includes('text/plain') || ct.includes('css');
  if (kind === 'js') return ct.includes('javascript') || ct.includes('text/plain') || ct.includes('ecmascript');
  if (kind === 'html') return ct.includes('text/html') || ct.includes('application/xhtml+xml');
  return Boolean(ct);
}

function normalizePath(baseUrl, routePath) {
  return new URL(routePath, baseUrl).toString();
}

async function fetchText(url, init = {}) {
  const response = await fetch(url, { redirect: 'manual', ...init });
  const text = await response.text().catch(() => '');
  return { response, text };
}

async function fetchBinary(url, init = {}) {
  const response = await fetch(url, { redirect: 'manual', ...init });
  const bytes = Buffer.from(await response.arrayBuffer().catch(() => new ArrayBuffer(0)));
  return { response, bytes };
}

function checkResult({ name, url, kind, response, text = '', bytes = null, required = true, markers = [] }) {
  const status = Number(response?.status || 0);
  const contentType = String(response?.headers?.get?.('content-type') || '');
  const location = String(response?.headers?.get?.('location') || '');
  const bodyText = String(text || '');
  const bodyBytes = bytes ? bytes.length : Buffer.byteLength(bodyText);
  const redirect = status === 301 || status === 302;
  const okStatus = status === 200 || status === 204 || redirect;
  const checks = [];

  if (!okStatus) {
    checks.push(`unexpected status ${status || 'network-error'}`);
  }
  if (redirect && !location) {
    checks.push('redirect missing location');
  }
  if (!redirect && required) {
    if (kind === 'html' && bodyBytes === 0) checks.push('empty html body');
    if (kind === 'json' && bodyBytes === 0) checks.push('empty json body');
    if (kind === 'css' && bodyBytes === 0) checks.push('empty css body');
    if (kind === 'js' && bodyBytes === 0) checks.push('empty js body');
    if (kind === 'png' && bodyBytes === 0) checks.push('empty asset body');
  }
  if (!redirect && kind && !contentTypeLooksReasonable(kind, contentType)) {
    checks.push(`unexpected content-type ${contentType || '(missing)'}`);
  }
  if (!redirect) {
    for (const marker of markers) {
      if (marker instanceof RegExp) {
        if (!marker.test(bodyText)) checks.push(`missing marker ${marker}`);
      } else if (marker && !bodyText.includes(String(marker))) {
        checks.push(`missing marker ${String(marker)}`);
      }
    }
  }

  return {
    name,
    url,
    kind,
    status,
    contentType,
    bytes: bodyBytes,
    ok: checks.length === 0,
    redirect,
    location: redirect ? location : undefined,
    checks
  };
}

async function checkHtml(baseUrl, target) {
  const url = normalizePath(baseUrl, target.path);
  try {
    const { response, text } = await fetchText(url);
    return checkResult({
      name: target.name,
      url,
      kind: 'html',
      response,
      text,
      required: target.required !== false,
      markers: target.markers || []
    });
  } catch (error) {
    return {
      name: target.name,
      url,
      kind: 'html',
      status: 0,
      contentType: '',
      bytes: 0,
      ok: false,
      error: short(error?.message || error),
      checks: [short(error?.message || error)]
    };
  }
}

async function checkTextAsset(baseUrl, target) {
  const url = normalizePath(baseUrl, target.path);
  try {
    const { response, text } = await fetchText(url);
    return checkResult({
      name: target.name,
      url,
      kind: target.kind || 'js',
      response,
      text,
      required: target.required !== false,
      markers: target.markers || []
    });
  } catch (error) {
    return {
      name: target.name,
      url,
      kind: target.kind || 'js',
      status: 0,
      contentType: '',
      bytes: 0,
      ok: false,
      error: short(error?.message || error),
      checks: [short(error?.message || error)]
    };
  }
}

async function checkBinaryAsset(baseUrl, target) {
  const url = normalizePath(baseUrl, target.path);
  try {
    const { response, bytes } = await fetchBinary(url);
    return checkResult({
      name: target.name,
      url,
      kind: target.kind || 'image',
      response,
      bytes,
      required: target.required !== false,
      markers: target.markers || []
    });
  } catch (error) {
    return {
      name: target.name,
      url,
      kind: target.kind || 'image',
      status: 0,
      contentType: '',
      bytes: 0,
      ok: false,
      error: short(error?.message || error),
      checks: [short(error?.message || error)]
    };
  }
}

async function checkText(baseUrl, target) {
  const url = normalizePath(baseUrl, target.path);
  try {
    const { response, text } = await fetchText(url);
    return checkResult({
      name: target.name,
      url,
      kind: 'text',
      response,
      text,
      required: target.required !== false,
      markers: target.markers || []
    });
  } catch (error) {
    return {
      name: target.name,
      url,
      kind: 'text',
      status: 0,
      contentType: '',
      bytes: 0,
      ok: false,
      error: short(error?.message || error),
      checks: [short(error?.message || error)]
    };
  }
}

async function checkJson(baseUrl, target) {
  const url = normalizePath(baseUrl, target.path);
  try {
    const { response, text } = await fetchText(url);
    const result = checkResult({
      name: target.name,
      url,
      kind: 'json',
      response,
      text,
      required: target.required !== false,
      markers: target.markers || []
    });

    if (result.ok) {
      try {
        const payload = text ? JSON.parse(text) : null;
        if (target.shape && !target.shape(payload)) {
          result.ok = false;
          result.checks.push('unexpected json shape');
        }
        result.payload = payload;
      } catch (error) {
        result.ok = false;
        result.checks.push('invalid json');
        result.error = short(error?.message || error);
      }
    }

    return result;
  } catch (error) {
    return {
      name: target.name,
      url,
      kind: 'json',
      status: 0,
      contentType: '',
      bytes: 0,
      ok: false,
      error: short(error?.message || error),
      checks: [short(error?.message || error)]
    };
  }
}

async function runBrowserSmoke({ baseUrl, token, checks = [] }) {
  const result = {
    name: 'terminal-browser-smoke',
    url: `${baseUrl}/otp-terminal`,
    kind: 'browser',
    ok: false,
    checks: [],
    status: null
  };

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.addInitScript(({ key, value }) => {
      try {
        window.localStorage.setItem(key, value);
      } catch (_) {}
    }, { key: 'otp_admin_token', value: token });

    const page = await context.newPage();
    const response = await page.goto(result.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    result.status = response ? response.status() : null;
    const finalUrl = page.url();
    if (finalUrl.includes('portal-gate')) {
      result.checks.push('redirected to portal-gate');
    }

    await page.waitForSelector('#postForm', { timeout: 20000 });
    await page.waitForSelector('#magicBtn', { timeout: 20000 });

    const snapshot = await page.evaluate(() => ({
      hasDraftPostWithAI: typeof window.draftPostWithAI === 'function',
      hasManagePost: typeof window.managePost === 'function',
      hasGenerateOpsDoc: typeof window.generateOpsDoc === 'function',
      hasReplyOracleBtn: Boolean(document.getElementById('replyOracleBtn')),
      hasPostForm: Boolean(document.getElementById('postForm')),
      hasMagicBtn: Boolean(document.getElementById('magicBtn')),
      hasAdminCore: Array.from(document.querySelectorAll('script[src]')).some((node) => String(node.src || '').includes('admin-core.js')),
      hasBlogEnhancements: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((node) => String(node.href || '').includes('blog-enhancements.css')),
      hasOpsJobsBadge: Boolean(document.getElementById('opsJobsBadge')),
      hasTerminalShell: Boolean(document.querySelector('.admin-wrap'))
    }));

    for (const [key, value] of Object.entries(snapshot)) {
      if (!value) result.checks.push(`missing ${key}`);
    }

    result.ok = result.checks.length === 0;
    result.snapshot = snapshot;
    await page.close();
    await context.close();
  } catch (error) {
    result.checks.push(short(error?.message || error));
    result.error = short(error?.message || error);
  } finally {
    await browser.close().catch(() => {});
  }

  return result;
}

async function runSweep({
  baseUrl,
  schema,
  publicTargets,
  adminTargets,
  browserSmoke = true,
  token = ''
}) {
  const result = {
    schema,
    ok: true,
    baseUrl,
    e2eTestMode: envFlagEnabled(process.env.E2E_TEST_MODE),
    adminAuth: { configured: false, attempted: false, source: '', method: '' },
    publicChecks: [],
    adminChecks: [],
    warnings: [],
    errors: [],
    skipped: []
  };

  const publicChecks = [];
  for (const target of publicTargets) {
    // eslint-disable-next-line no-await-in-loop
    let check;
    if (target.kind === 'json') check = await checkJson(baseUrl, target);
    else if (target.kind === 'text') check = await checkText(baseUrl, target);
    else if (target.kind === 'css' || target.kind === 'js') check = await checkTextAsset(baseUrl, target);
    else if (['png', 'gif', 'jpg', 'jpeg', 'image'].includes(target.kind)) check = await checkBinaryAsset(baseUrl, target);
    else check = await checkHtml(baseUrl, target.kind === 'html' ? target : { ...target, kind: 'html' });
    publicChecks.push(check);
  }
  result.publicChecks = publicChecks;

  const publicFailures = publicChecks.filter((check) => !check.ok);
  if (publicFailures.length) {
    result.ok = false;
    result.errors.push(...publicFailures.map((check) => `${check.name}: ${check.checks.join('; ')}`));
  }

  const adminAuth = await resolveAdminToken(baseUrl, token);
  result.adminAuth = {
    configured: Boolean(adminAuth.token),
    attempted: Boolean(adminAuth.attempted),
    source: adminAuth.source || '',
    method: adminAuth.method || ''
  };
  if (adminAuth.token && adminAuth.warning) result.warnings.push(adminAuth.warning);

  if (!adminAuth.token) {
    if (adminAuth.attempted) {
      result.ok = false;
      result.errors.push(adminAuth.error || 'Admin sweep authentication failed.');
    } else {
      result.warnings.push(adminAuth.warning || 'No admin sweep credentials provided; skipping admin-authenticated checks.');
    }
    result.skipped.push(...adminTargets.map((target) => target.name));
    if (browserSmoke) result.skipped.push('terminal-browser-smoke');
    return result;
  }

  const adminChecks = [];
  for (const target of adminTargets) {
    const url = normalizePath(baseUrl, target.path);
    try {
      // eslint-disable-next-line no-await-in-loop
      const { response, text } = await fetchText(url, {
        headers: { Authorization: `Bearer ${adminAuth.token}` }
      });
      const check = checkResult({
        name: target.name,
        url,
        kind: target.kind || 'json',
        response,
        text,
        required: true,
        markers: target.markers || []
      });
      if (target.kind === 'json' && check.ok) {
        try {
          const payload = text ? JSON.parse(text) : null;
          if (target.shape && !target.shape(payload)) {
            check.ok = false;
            check.checks.push('unexpected json shape');
          }
          check.payloadSummary = summarizePayload(payload);
        } catch (error) {
          check.ok = false;
          check.checks.push('invalid json');
          check.error = short(error?.message || error);
        }
      }
      adminChecks.push(check);
    } catch (error) {
      adminChecks.push({
        name: target.name,
        url,
        kind: target.kind || 'json',
        status: 0,
        contentType: '',
        bytes: 0,
        ok: false,
        error: short(error?.message || error),
        checks: [short(error?.message || error)]
      });
    }
  }

  if (browserSmoke) {
    const smoke = await runBrowserSmoke({ baseUrl, token: adminAuth.token, checks: [] });
    adminChecks.push(smoke);
  }

  result.adminChecks = adminChecks;
  const adminFailures = adminChecks.filter((check) => !check.ok);
  if (adminFailures.length) {
    result.ok = false;
    result.errors.push(...adminFailures.map((check) => `${check.name}: ${check.checks.join('; ')}`));
  }

  return result;
}

module.exports = {
  runSweep,
  isJwtLike,
  hasUsableAdminToken,
  resolveAdminToken,
  envFlagEnabled,
  adminSweepPasscodeEnv,
  adminSweepTokenEnv,
  tokenSetupHelp,
  short
};
