/**
 * OTP lead attribution — first/last touch UTM capture (no third-party analytics).
 */
(function initOtpAttribution(global) {
  const STORAGE_FIRST = 'otp_attribution_first';
  const STORAGE_LAST = 'otp_attribution_last';
  const ALLOWED_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'utm_term',
    'ref',
    'source',
    'campaign'
  ];
  const MAX_VALUE = 160;
  const MAX_LANDING = 240;
  const TRACKING_PAYLOAD_KEYS = [
    ...ALLOWED_KEYS,
    'cta_source',
    'first_touch',
    'booking_route',
    'platform',
    'captured_at'
  ];

  function cleanValue(value, max = MAX_VALUE) {
    return String(value || '')
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, max);
  }

  function hasAttributionSignal(record = {}) {
    return ALLOWED_KEYS.some((key) => Boolean(record[key]));
  }

  function getAttributionFromUrl(urlLike) {
    let params;
    try {
      const base = typeof urlLike === 'string' && urlLike
        ? urlLike
        : (global.location ? global.location.href : '');
      params = new URL(base, global.location?.origin || 'https://www.onlytrueperspective.tech').searchParams;
    } catch (_) {
      return {};
    }
    const snapshot = {};
    ALLOWED_KEYS.forEach((key) => {
      const value = cleanValue(params.get(key) || '');
      if (value) snapshot[key] = value;
    });
    if (params.get('cta_source')) {
      snapshot.source = cleanValue(params.get('cta_source'));
    }
    return snapshot;
  }

  function sanitizeAttribution(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const out = {};
    ALLOWED_KEYS.forEach((key) => {
      const value = cleanValue(input[key]);
      if (value) out[key] = value;
    });
    if (input.landing_page) out.landing_page = cleanValue(input.landing_page, MAX_LANDING);
    if (input.referrer) out.referrer = cleanValue(input.referrer, MAX_LANDING);
    if (input.first_seen_at) out.first_seen_at = cleanValue(input.first_seen_at, 40);
    if (input.last_seen_at) out.last_seen_at = cleanValue(input.last_seen_at, 40);
    return out;
  }

  function sanitizeTrackingPayload(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const out = {};
    TRACKING_PAYLOAD_KEYS.forEach((key) => {
      const value = cleanValue(input[key], key === 'booking_route' ? MAX_LANDING : MAX_VALUE);
      if (value) out[key] = value;
    });
    if (input.landing_page) out.landing_page = cleanValue(input.landing_page, MAX_LANDING);
    if (input.referrer) out.referrer = cleanValue(input.referrer, MAX_LANDING);
    if (input.first_seen_at) out.first_seen_at = cleanValue(input.first_seen_at, 40);
    if (input.last_seen_at) out.last_seen_at = cleanValue(input.last_seen_at, 40);
    if (input.attribution_first && typeof input.attribution_first === 'object' && !Array.isArray(input.attribution_first)) {
      const first = sanitizeAttribution(input.attribution_first);
      if (Object.keys(first).length) out.attribution_first = first;
    }
    if (input.attribution_last && typeof input.attribution_last === 'object' && !Array.isArray(input.attribution_last)) {
      const last = sanitizeAttribution(input.attribution_last);
      if (Object.keys(last).length) out.attribution_last = last;
    }
    return out;
  }

  function readStorage(key) {
    try {
      const raw = global.localStorage?.getItem(key) || global.sessionStorage?.getItem(key);
      if (!raw) return null;
      return sanitizeAttribution(JSON.parse(raw));
    } catch (_) {
      return null;
    }
  }

  function writeStorage(key, value) {
    const payload = JSON.stringify(value);
    try {
      global.sessionStorage?.setItem(key, payload);
      global.localStorage?.setItem(key, payload);
    } catch (_) {
      /* storage blocked */
    }
  }

  function buildSnapshotFromPage(urlParams = {}) {
    const now = new Date().toISOString();
    const landing = cleanValue(
      (global.location?.pathname || '/') + (global.location?.search || ''),
      MAX_LANDING
    );
    const referrer = cleanValue(global.document?.referrer || '', MAX_LANDING);
    const snapshot = sanitizeAttribution({
      ...urlParams,
      landing_page: landing,
      referrer,
      first_seen_at: now,
      last_seen_at: now
    });
    if (!snapshot.utm_source && snapshot.source) snapshot.utm_source = snapshot.source;
    if (!snapshot.utm_source && snapshot.ref) snapshot.utm_source = snapshot.ref;
    return snapshot;
  }

  function saveAttribution(urlLike) {
    const urlParams = getAttributionFromUrl(urlLike);
    if (!hasAttributionSignal(urlParams)) {
      const existing = readStorage(STORAGE_FIRST);
      if (existing) {
        const touched = sanitizeAttribution({
          ...existing,
          landing_page: cleanValue(
            (global.location?.pathname || '/') + (global.location?.search || ''),
            MAX_LANDING
          ),
          last_seen_at: new Date().toISOString()
        });
        writeStorage(STORAGE_LAST, touched);
      }
      return getStoredAttribution();
    }

    const snapshot = buildSnapshotFromPage(urlParams);
    const first = readStorage(STORAGE_FIRST);
    if (!first) {
      writeStorage(STORAGE_FIRST, snapshot);
    }
    writeStorage(STORAGE_LAST, snapshot);
    return getStoredAttribution();
  }

  function getStoredAttribution() {
    const first = readStorage(STORAGE_FIRST) || {};
    const last = readStorage(STORAGE_LAST) || first;
    const merged = sanitizeAttribution({
      ...first,
      ...last,
      first_touch: first,
      last_touch: last
    });
    return { first, last, merged };
  }

  function getSourceTrackingPayload() {
    const { first, last, merged } = getStoredAttribution();
    const active = last.utm_source || last.source ? last : first;
    const platform = global.matchMedia?.('(max-width: 768px)').matches ? 'mobile' : 'desktop';
    return sanitizeTrackingPayload({
      cta_source: active.utm_source || active.source || active.ref || 'direct',
      first_touch: first.utm_source || first.source || first.ref || 'direct',
      booking_route: cleanValue(global.location?.pathname || '/bookings', MAX_LANDING),
      referrer: active.referrer || first.referrer || '',
      platform,
      utm_source: active.utm_source || '',
      utm_medium: active.utm_medium || '',
      utm_campaign: active.utm_campaign || '',
      utm_content: active.utm_content || '',
      utm_term: active.utm_term || '',
      ref: active.ref || '',
      source: active.source || '',
      campaign: active.campaign || active.utm_campaign || '',
      landing_page: active.landing_page || first.landing_page || '',
      first_seen_at: first.first_seen_at || '',
      last_seen_at: active.last_seen_at || first.last_seen_at || '',
      attribution_first: first,
      attribution_last: last
    });
  }

  function buildUrlWithAttribution(baseUrl, touch = 'last') {
    const base = String(baseUrl || '').trim();
    if (!base) return '';
    let url;
    try {
      url = new URL(base, global.location?.origin || undefined);
    } catch (_) {
      return base;
    }
    const { first, last } = getStoredAttribution();
    const record = touch === 'first' ? first : last;
    if (!hasAttributionSignal(record)) return url.toString();
    ALLOWED_KEYS.forEach((key) => {
      if (record[key]) url.searchParams.set(key, record[key]);
    });
    return url.toString();
  }

  function captureOnLoad() {
    return saveAttribution();
  }

  global.OTPAttribution = {
    getAttributionFromUrl,
    sanitizeAttribution,
    sanitizeTrackingPayload,
    saveAttribution,
    getStoredAttribution,
    getSourceTrackingPayload,
    buildUrlWithAttribution,
    captureOnLoad
  };
})(typeof window !== 'undefined' ? window : globalThis);
