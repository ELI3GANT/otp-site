const fallbackConfig = {
  ok: true,
  packages: [
    {
      id: 'the-signal',
      internal_key: 'The Signal',
      name: 'The Signal',
      price: 'Starting at $500',
      purpose: 'Entry-level creative service for a clean, focused deliverable.',
      description: 'The Signal is for focused creative work that gives your brand a sharper first impression.',
      best_for: ['Logo refresh', 'Simple flyer/design', 'Short video edit', 'Content cleanup', 'Landing page section', 'Brand starter work', 'Basic creative direction'],
      examples: ['Video/content', 'Logo refresh', 'Starter design', 'Landing page section'],
      cta: 'Start with The Signal'
    },
    {
      id: 'the-engine',
      internal_key: 'The Engine',
      name: 'The Engine',
      price: '$1,200 to $2,000',
      purpose: 'A stronger package for brands that need multiple connected assets.',
      description: 'The Engine builds the moving parts your brand needs to look real, move faster, and convert better.',
      best_for: ['Logo + brand kit', 'Video campaign', 'Website/landing page', 'Content rollout', 'Social media visuals', 'Business presentation', 'Client-facing brand upgrade'],
      examples: ['Brand kit', 'Video campaign', 'Landing page', 'Content rollout'],
      cta: 'Build with The Engine',
      recommended: true
    },
    {
      id: 'the-system',
      internal_key: 'The System',
      name: 'The System',
      price: 'Starting at $3,500+',
      purpose: 'Full creative and business system.',
      description: 'The System is for serious brands that need the full structure: visuals, website, automation, documents, and workflow.',
      best_for: ['Full website', 'Brand identity', 'Content system', 'AI/automation setup', 'Booking/payment workflow', 'Client portal', 'Document/invoice workflow', 'Business content system'],
      examples: ['Full website', 'AI automation', 'Client portal', 'Document workflow'],
      cta: 'Build The System'
    },
  ],
  serviceTypes: ['Video / Content', 'Website / Digital System', 'Brand Launch', 'Fast Lane', 'Custom Build', 'Same-Day Reel', 'Event Promo', 'Website Cleanup', 'Business Content Pack', 'Brand Launch Assets', 'Emergency Booking/Client Flow Fix', 'Logo / Brand Identity', 'AI / Automation', 'Business System', 'Music / Artist Rollout', 'Event Coverage', 'Custom Request'],
  fastLaneMappings: {
    'Same-Day Reel': 'The Signal',
    'Event Promo': 'The Signal',
    'Website Cleanup': 'The Signal',
    'Business Content Pack': 'The Engine',
    'Brand Launch Assets': 'The Engine',
    'Emergency Booking/Client Flow Fix': 'The System'
  },
  fastLaneOffers: [
    {
      id: 'same_day_reel',
      label: 'Same-Day Reel',
      package_fit: 'The Signal',
      recommended_package: 'The Signal',
      urgency: 'Urgent',
      priority: 'High',
      next_action: 'Confirm deadline, platform, references, and delivery format; then send The Signal quote.',
      description: 'Same-day reel requests need a fast Signal lane and quick scope confirmation.'
    },
    {
      id: 'event_promo',
      label: 'Event Promo',
      package_fit: 'The Signal / The Engine',
      recommended_package: 'The Signal',
      urgency: 'Time-sensitive',
      priority: 'High',
      next_action: 'Confirm event date, location, run of show, and delivery deadline; then send The Signal quote.',
      description: 'Event promos are time-sensitive and need date/location before quoting cleanly.'
    },
    {
      id: 'business_content_pack',
      label: 'Business Content Pack',
      package_fit: 'The Engine',
      recommended_package: 'The Engine',
      urgency: 'Planning needed',
      priority: 'Medium-High',
      next_action: 'Confirm deliverables, platforms, posting cadence, and timeline; then scope The Engine.',
      description: 'Business content packs need planning details across deliverables and channels.'
    },
    {
      id: 'website_cleanup',
      label: 'Website Cleanup',
      package_fit: 'The Signal',
      recommended_package: 'The Signal',
      urgency: 'Time-sensitive',
      priority: 'Medium-High',
      next_action: 'Confirm site link, issue list, access needs, and deadline; then send The Signal quote.',
      description: 'Website cleanup is a fast fix when the work is focused on one visible output.'
    },
    {
      id: 'brand_launch_pack',
      label: 'Brand Launch Assets',
      package_fit: 'The Engine',
      recommended_package: 'The Engine',
      urgency: 'Strategic planning',
      priority: 'High',
      next_action: 'Confirm scope, brand goals, launch timeline, and budget range; then scope The Engine.',
      description: 'Brand launch assets need a connected Engine plan across identity, launch content, and rollout pieces.'
    },
    {
      id: 'emergency_booking_flow_fix',
      label: 'Emergency Booking/Client Flow Fix',
      package_fit: 'The Signal / The System',
      recommended_package: 'The System',
      urgency: 'Urgent',
      priority: 'High',
      next_action: 'Confirm the broken flow, access needs, user impact, and deadline; then route the fix into The Signal or The System.',
      description: 'Emergency flow fixes move fast, but the package depth depends on whether it is one visible fix or an operating-layer repair.'
    }
  ],
  packageOptions: ['The Signal', 'The Engine', 'The System', 'Not Sure Yet'],
  budgetRanges: ['Under $500', '$500 to $1,200', '$1,200 to $2,000', '$2,000 to $3,500', '$3,500+', 'Not sure yet'],
  urgencyLevels: ['Flexible', 'Soon', 'Rush', 'Launch deadline'],
  depositReadiness: ['Ready if scope is clear', 'Need quote first', 'Not ready yet'],
  preferredContactMethods: ['Email', 'Text message', 'Phone call', 'Instagram DM', 'No preference'],
  projectTypes: ['Brand identity', 'Website / landing page', 'Video / content', 'AI / automation', 'Event / launch', 'Business system', 'Custom / mixed', 'Not sure yet'],
  referralSources: ['Instagram', 'Referral', 'Google / search', 'YouTube', 'Live event', 'Returning client', 'Other'],
  preferredNextSteps: ['Send me the best next step', 'Send a quote first', 'Book a scope call', 'Open secure project intake', 'Not sure yet']
};

const PACKAGE_THEMES = {
  default: {
    slug: 'default',
    accent: '#35e5ff',
    accent2: '#b88cff',
    glow: 'rgba(53, 229, 255, 0.2)',
    glow2: 'rgba(184, 140, 255, 0.14)',
    surface: 'rgba(53, 229, 255, 0.08)',
    meta: '#070707',
    message: 'Pick a system module to tune the booking flow, colors, and review summary.'
  },
  'the-signal': {
    slug: 'the-signal',
    accent: '#35e5ff',
    accent2: '#77a7ff',
    glow: 'rgba(53, 229, 255, 0.28)',
    glow2: 'rgba(119, 167, 255, 0.16)',
    surface: 'rgba(53, 229, 255, 0.1)',
    meta: '#061216',
    message: 'The Signal is selected for focused creative work.'
  },
  'the-engine': {
    slug: 'the-engine',
    accent: '#b88cff',
    accent2: '#7b61ff',
    glow: 'rgba(184, 140, 255, 0.28)',
    glow2: 'rgba(123, 97, 255, 0.18)',
    surface: 'rgba(184, 140, 255, 0.1)',
    meta: '#0f0a17',
    message: 'The Engine is selected for connected brand assets.'
  },
  'the-system': {
    slug: 'the-system',
    accent: '#f4cc6a',
    accent2: '#fff4ce',
    glow: 'rgba(244, 204, 106, 0.28)',
    glow2: 'rgba(255, 244, 206, 0.13)',
    surface: 'rgba(244, 204, 106, 0.1)',
    meta: '#151106',
    message: 'The System is selected for full creative/business structure.'
  },
  'custom-build': {
    slug: 'the-system',
    accent: '#f4cc6a',
    accent2: '#fff4ce',
    glow: 'rgba(244, 204, 106, 0.28)',
    glow2: 'rgba(255, 244, 206, 0.13)',
    surface: 'rgba(244, 204, 106, 0.1)',
    meta: '#151106',
    message: 'Custom Build routes into The System or manual OTP scoping.'
  }
};

const FAST_LANE_DETAILS = {
  'Same-Day Reel': {
    turnaround: 'Same day',
    ideal: 'Creators, artists, restaurants, and brands with footage ready',
    description: 'A focused short-form edit built for momentum, clarity, and a clean public drop.'
  },
  'Event Promo': {
    turnaround: '24-48 hours',
    ideal: 'Nightlife, launches, pop-ups, performances, and local events',
    description: 'A promo lane for getting the event, date, location, and vibe moving fast.'
  },
  'Website Cleanup': {
    turnaround: 'Fast fix',
    ideal: 'Sites, landing pages, booking flows, and content sections that need focused polish',
    description: 'A time-sensitive Signal lane for one visible website or content fix.'
  },
  'Business Content Pack': {
    turnaround: '2-5 days',
    ideal: 'Local businesses that need sharper web, social, and sales assets',
    description: 'A connected content lane for cleaner presence across posts, pages, and offers.'
  },
  'Brand Launch Assets': {
    turnaround: 'Scoped after review',
    ideal: 'New brands, artist rollouts, product drops, and custom launches',
    description: 'A connected Engine lane for launch identity, content, and rollout pieces.'
  },
  'Emergency Booking/Client Flow Fix': {
    turnaround: 'Urgent',
    ideal: 'Broken booking, checkout, portal, or client-flow issues',
    description: 'A speed layer for urgent client-flow repairs that may route to The Signal or The System.'
  }
};

const QUICK_SERVICE_OPTIONS = [
  { value: 'Website / Digital System', label: 'Website & Digital' },
  { value: 'Video / Content', label: 'Video & Content' },
  { value: 'Brand Launch', label: 'Branding & Design' },
  { value: 'AI / Automation', label: 'Custom Systems' },
  { value: 'Same-Day Reel', label: 'Fast Lane' },
  { value: 'Custom Request', label: 'Not sure yet — help me choose' }
];

const SERVICE_GUIDANCE = {
  'website / digital system': {
    label: 'Website & Digital',
    package: 'The Signal for a focused page fix; The Engine for connected pages. Larger client workflows may need The System.',
    next: 'Share your site link and the page or booking step you want to improve.'
  },
  'video / content': {
    label: 'Video & Content',
    package: 'A single focused edit may fit The Signal; a connected campaign may fit The Engine.',
    next: 'Mention the deliverable, where it will be used, and whether footage is ready.'
  },
  'brand launch': {
    label: 'Branding & Design',
    package: 'A focused design piece may fit The Signal; connected launch assets may fit The Engine.',
    next: 'Share what exists today and what you want people to see at launch.'
  },
  'ai / automation': {
    label: 'Custom Systems',
    package: 'A focused workflow fix may need a smaller scope; connected systems may fit The System.',
    next: 'Describe the current process, who uses it, and what should be easier.'
  },
  'custom build': {
    label: 'Custom Systems',
    package: 'A focused workflow fix may need a smaller scope; connected systems may fit The System.',
    next: 'Describe the current process, who uses it, and what should be easier.'
  },
  'custom request': {
    label: 'Custom project',
    package: 'OTP can recommend a fit after reviewing the goal and scope.',
    next: 'Tell us what you want to make or improve. You can leave the service choice open.'
  },
  'same-day reel': {
    label: 'Fast Lane',
    package: 'A focused request may fit The Signal. OTP confirms scope and availability first.',
    next: 'Share the deadline and whether footage or references are ready. Availability is confirmed after review.'
  }
};

const state = {
  config: fallbackConfig,
  step: 1,
  submitting: false,
  submitted: false,
  quickStarted: false,
  detailedStarted: false,
  selectedPackage: '',
  bookingToken: makeBookingToken(),
  sourceTracking: {}
};

const stepNames = ['Pick Package', 'Project Details', 'Budget + Timeline', 'Review + Submit'];
const $ = (id) => document.getElementById(id);

const els = {
  packageGrid: $('package-grid'),
  fastLaneGrid: $('fast-lane-grid'),
  selectedPackageName: $('selected-package-name'),
  selectedPackageMessage: $('selected-package-message'),
  selectedPackagePrice: $('selected-package-price'),
  oraclePackageName: $('oracle-package-name'),
  oraclePackageMessage: $('oracle-package-message'),
  miniPackage: $('mini-package'),
  miniService: $('mini-service'),
  miniBudget: $('mini-budget'),
  miniTimeline: $('mini-timeline'),
  activePackagePill: $('active-package-pill'),
  formPackageNote: $('form-package-note'),
  formTitle: $('form-title'),
  form: $('booking-form'),
  stepLabel: $('step-label'),
  stepDots: [...document.querySelectorAll('[data-step-dot]')],
  steps: [...document.querySelectorAll('[data-step]')],
  prev: $('prev-step'),
  next: $('next-step'),
  submit: $('submit-booking'),
  status: $('booking-status'),
  error: $('booking-error'),
  review: $('review-summary'),
  success: $('booking-success'),
  successTitle: $('success-title'),
  successCopy: $('success-copy'),
  successMeta: $('success-meta'),
  successActions: $('success-actions'),
  quickSelectors: [...document.querySelectorAll('[data-quick-service]')],
  quickForm: $('quick-inquiry-form'),
  quickService: $('quick-service'),
  quickName: $('quick-name'),
  quickEmail: $('quick-email'),
  quickPhone: $('quick-phone'),
  quickDescription: $('quick-description'),
  quickLink: $('quick-link'),
  quickBudget: $('quick-budget'),
  quickConsent: $('quick-consent'),
  quickHoneypot: $('quick-otp-company-website'),
  quickSubmit: $('submit-quick-inquiry'),
  quickStatus: $('quick-status'),
  quickError: $('quick-error'),
  detailedBrief: $('detailed-brief'),
  openDetailedButtons: [...document.querySelectorAll('[data-open-detailed]')],
  service: $('booking-service'),
  package: $('booking-package'),
  name: $('booking-name'),
  email: $('booking-email'),
  phone: $('booking-phone'),
  business: $('booking-business'),
  contactMethod: $('booking-contact-method'),
  social: $('booking-social'),
  description: $('booking-description'),
  deliverables: $('booking-deliverables'),
  projectType: $('booking-project-type'),
  reference: $('booking-reference'),
  budget: $('booking-budget'),
  deadline: $('booking-deadline'),
  urgency: $('booking-urgency'),
  deposit: $('booking-deposit'),
  location: $('booking-location'),
  referralSource: $('booking-referral-source'),
  nextStep: $('booking-next-step'),
  consent: $('booking-consent'),
  honeypot: $('otp-company-website')
};

function makeBookingToken() {
  const key = 'otp_booking_token';
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const token = `WEB-${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
    sessionStorage.setItem(key, token);
    return token;
  } catch (_) {
    return `WEB-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function cleanTrackingValue(value = '', max = 180) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function getAttributionTracking() {
  try {
    if (window.OTPAttribution && typeof window.OTPAttribution.getSourceTrackingPayload === 'function') {
      window.OTPAttribution.captureOnLoad();
      return window.OTPAttribution.getSourceTrackingPayload();
    }
  } catch (_) {
    /* non-blocking — fall through to URL-only fallback */
  }
  return buildSourceTrackingFallback();
}

function buildSourceTrackingFallback() {
  const params = new URLSearchParams(window.location.search || '');
  const source = cleanTrackingValue(
    params.get('source') || params.get('cta_source') || params.get('utm_source') || 'direct',
    120
  );
  return {
    cta_source: source,
    first_touch: source,
    booking_route: cleanTrackingValue(window.location.pathname || '/bookings', 120),
    referrer: cleanTrackingValue(document.referrer || '', 360),
    platform: window.matchMedia && window.matchMedia('(max-width: 720px)').matches ? 'mobile' : 'desktop',
    utm_source: cleanTrackingValue(params.get('utm_source') || '', 120),
    utm_medium: cleanTrackingValue(params.get('utm_medium') || '', 120),
    utm_campaign: cleanTrackingValue(params.get('utm_campaign') || '', 160),
    utm_content: cleanTrackingValue(params.get('utm_content') || '', 160),
    utm_term: cleanTrackingValue(params.get('utm_term') || '', 160),
    ref: cleanTrackingValue(params.get('ref') || '', 120),
    source: cleanTrackingValue(params.get('source') || '', 120),
    campaign: cleanTrackingValue(params.get('campaign') || '', 160),
    landing_page: cleanTrackingValue(`${window.location.pathname || ''}${window.location.search || ''}`, 240),
    captured_at: new Date().toISOString()
  };
}

function text(value, fallback = 'Not provided yet') {
  if (value == null || typeof value === 'object') return fallback;
  const v = String(value).trim();
  if (!v || /^(undefined|null|nan|\[object object\])$/i.test(v)) return fallback;
  return v || fallback;
}

function safePortalHref(data = {}) {
  const raw = text(
    data.clientPortalPath || data.portalPath || data.clientPortalUrl || data.portalUrl || '',
    ''
  );
  if (!raw) return '';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '';
    if (!/^\/client\/[A-Za-z0-9][A-Za-z0-9._~-]{5,512}$/.test(url.pathname)) return '';
    return `${url.pathname}${url.search}`;
  } catch (_) {
    return '';
  }
}

function formatDeadline(value) {
  const raw = text(value, '');
  if (!raw) return 'Not selected';
  const parsed = new Date(`${raw}T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString();
  }
  return raw;
}

function appendText(parent, tag, value, fallback = '') {
  const el = document.createElement(tag);
  el.textContent = text(value, fallback);
  parent.append(el);
  return el;
}

function motionBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function showError(message = '') {
  if (!els.error) return;
  els.error.textContent = message;
  els.error.classList.toggle('hidden', !message);
}

function showStatus(message = '') {
  if (!els.status) return;
  els.status.textContent = message;
  els.status.classList.toggle('hidden', !message);
}

function showQuickError(message = '') {
  if (!els.quickError) return;
  els.quickError.textContent = message;
  els.quickError.classList.toggle('hidden', !message);
}

function showQuickStatus(message = '') {
  if (!els.quickStatus) return;
  els.quickStatus.textContent = message;
  els.quickStatus.classList.toggle('hidden', !message);
}

function optionList(select, values, placeholder) {
  select.replaceChildren();
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    select.append(opt);
  }
  values.forEach((value) => {
    const opt = document.createElement('option');
    if (value && typeof value === 'object') {
      opt.value = String(value.value || value.label || '');
      opt.textContent = String(value.label || value.value || '');
    } else {
      opt.value = value;
      opt.textContent = value;
    }
    select.append(opt);
  });
}

function fillQuickSelects() {
  optionList(els.quickService, QUICK_SERVICE_OPTIONS, 'Choose a service');
  optionList(els.quickBudget, state.config.budgetRanges || fallbackConfig.budgetRanges, 'Select if known');
}

function packageLabel(pkg = {}) {
  return text(pkg.name || pkg.label || pkg.internal_key, 'Package');
}

function packagePrice(pkg = {}) {
  return text(pkg.price || pkg.position || pkg.pricing_label, 'Scope based');
}

function packageSlug(name) {
  const lower = String(name || '').toLowerCase();
  if (lower.includes('signal')) return 'the-signal';
  if (lower.includes('engine')) return 'the-engine';
  if (lower.includes('system')) return 'the-system';
  if (lower.includes('custom')) return 'custom-build';
  return 'default';
}

function packageByName(name) {
  const wanted = String(name || '').toLowerCase();
  return (state.config.packages || []).find((pkg) => {
    return String(pkg.name || '').toLowerCase() === wanted
      || String(pkg.label || '').toLowerCase() === wanted
      || String(pkg.internal_key || '').toLowerCase() === wanted
      || String(pkg.id || '').toLowerCase() === wanted;
  }) || null;
}

function normalizeFastLaneOffer(offer = {}) {
  return {
    id: text(offer.id, '').trim(),
    label: text(offer.label, '').trim(),
    package_fit: text(offer.package_fit || offer.packageFit || offer.package, '').trim(),
    recommended_package: text(offer.recommended_package || offer.recommendedPackage || offer.package, '').trim(),
    urgency: text(offer.urgency, 'Scoped after review'),
    priority: text(offer.priority, ''),
    next_action: text(offer.next_action || offer.nextAction, ''),
    description: text(offer.description || offer.reason, ''),
    missing: Array.isArray(offer.missing) ? offer.missing.filter(Boolean) : []
  };
}

function fastLaneOffers() {
  const source = state.config.fast_lane_offers || state.config.fastLaneOffers || fallbackConfig.fastLaneOffers || [];
  return source
    .map(normalizeFastLaneOffer)
    .filter((offer) => offer.id && offer.label && packageByName(offer.recommended_package));
}

function fastLaneOfferForService(serviceType) {
  const service = text(serviceType, '').trim().toLowerCase();
  if (!service) return null;
  return fastLaneOffers().find((offer) => {
    return offer.label.toLowerCase() === service || offer.id.toLowerCase() === service;
  }) || null;
}

function fastLanePackageFor(serviceType) {
  const service = text(serviceType, '').trim();
  const offer = fastLaneOfferForService(service);
  if (offer) return offer.recommended_package;
  const mappings = state.config.fastLaneMappings || fallbackConfig.fastLaneMappings || {};
  return typeof mappings[service] === 'string' ? mappings[service] : '';
}

function fastLanePackageFitFor(serviceType) {
  const offer = fastLaneOfferForService(serviceType);
  return offer?.package_fit || '';
}

function serviceOptions() {
  const configured = state.config.serviceTypes || fallbackConfig.serviceTypes || [];
  const labels = configured.map((entry) => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object') return entry.label || entry.name || entry.stored_label || '';
    return '';
  });
  const serviceObjects = Array.isArray(state.config.services) ? state.config.services.map((entry) => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry === 'object') return entry.label || entry.name || entry.stored_label || '';
    return '';
  }) : [];
  return [...new Set([...labels, ...serviceObjects, ...fastLaneOffers().map((offer) => offer.label)].map((value) => text(value, '').trim()).filter(Boolean))];
}

function packageOptions() {
  const labels = (state.config.packages || []).map(packageLabel).filter((value) => value !== 'Package');
  return [...new Set([...labels, 'Not Sure Yet'])];
}

function themeFor(packageName) {
  return PACKAGE_THEMES[packageSlug(packageName)] || PACKAGE_THEMES.default;
}

function applyActiveTheme(packageName = '') {
  const theme = themeFor(packageName);
  const root = document.documentElement;
  const siteAccent = getComputedStyle(root).getPropertyValue('--accent2').trim();
  const sharedAccent = siteAccent || theme.accent;
  root.dataset.activePackage = theme.slug;
  root.style.setProperty('--active-accent', sharedAccent);
  root.style.setProperty('--active-accent-2', sharedAccent);
  root.style.setProperty('--active-glow', `color-mix(in srgb, ${sharedAccent} 20%, transparent)`);
  root.style.setProperty('--active-glow-2', `color-mix(in srgb, ${sharedAccent} 11%, transparent)`);
  root.style.setProperty('--active-surface', `color-mix(in srgb, ${sharedAccent} 8%, transparent)`);
}

function selectedDisplay() {
  const raw = state.selectedPackage || els.package.value || '';
  const pkg = packageByName(raw);
  const isOracle = raw === 'Not Sure Yet';
  const theme = themeFor(raw);
  if (pkg) {
    const name = packageLabel(pkg);
    return {
      name,
      price: packagePrice(pkg),
      message: theme.message,
      formTitle: `${name} request details.`,
      pill: `${name} - ${packagePrice(pkg)}`
    };
  }
  if (isOracle) {
    return {
      name: 'OTP Oracle recommendation',
      price: 'Package will be recommended',
      message: 'OTP Oracle will recommend the cleanest package from your project details.',
      formTitle: 'Let OTP Oracle route the request.',
      pill: 'Not Sure Yet - Oracle recommendation'
    };
  }
  return {
    name: 'No package selected',
    price: 'Scope will appear here',
    message: 'A package is optional. OTP can recommend a fit after reviewing your project.',
    formTitle: 'Send OTP the full project brief.',
    pill: 'No package selected'
  };
}

function guidanceForService(serviceType = '') {
  const key = String(serviceType || '').trim().toLowerCase();
  if (SERVICE_GUIDANCE[key]) return SERVICE_GUIDANCE[key];
  if (/website|digital|landing|booking|portal/.test(key)) return SERVICE_GUIDANCE['website / digital system'];
  if (/video|content|reel|event promo/.test(key)) return SERVICE_GUIDANCE['video / content'];
  if (/brand|logo|identity|launch/.test(key)) return SERVICE_GUIDANCE['brand launch'];
  if (/automation|system|software|custom/.test(key)) return SERVICE_GUIDANCE['custom build'];
  if (/fast|urgent|emergency/.test(key)) return SERVICE_GUIDANCE['same-day reel'];
  return null;
}

function updateSummaries() {
  const selected = selectedDisplay();
  const serviceName = (els.quickService && els.quickService.value) || (els.service && els.service.value) || '';
  const guidance = guidanceForService(serviceName);
  els.selectedPackageName.textContent = selected.name;
  els.selectedPackageMessage.textContent = selected.message;
  els.selectedPackagePrice.textContent = selected.price;
  els.oraclePackageName.textContent = guidance
    ? (state.selectedPackage && state.selectedPackage !== 'Not Sure Yet' ? `${state.selectedPackage} · ${guidance.label}` : guidance.label)
    : (selected.name === 'No package selected' ? 'Scope guidance' : selected.name);
  els.oraclePackageMessage.textContent = guidance
    ? `${guidance.package} ${guidance.next}`
    : (selected.name === 'No package selected'
      ? 'Choose a service to see what details will help OTP recommend a next step.'
      : `${selected.message} OTP will confirm the right scope after review.`);
  els.miniPackage.textContent = selected.name;
  els.miniService.textContent = text(serviceName, 'Not selected');
  els.miniBudget.textContent = text((els.quickBudget && els.quickBudget.value) || (els.budget && els.budget.value), 'Not selected');
  els.miniTimeline.textContent = formatDeadline(els.deadline.value || els.urgency.value);
  els.formTitle.textContent = selected.formTitle;
  els.formPackageNote.textContent = selected.message;
  const pillName = els.activePackagePill.querySelector('strong');
  if (pillName) pillName.textContent = selected.pill;
  updateQuickSelectorState();
  try { wireProjectIntakeAttribution(); } catch (_) { /* Display preferences never block the form. */ }
}

function selectPackage(packageName, options = {}) {
  const pkg = packageByName(packageName);
  state.selectedPackage = pkg ? packageLabel(pkg) : text(packageName, '');
  if (els.package) els.package.value = state.selectedPackage;
  if (!options.preserveService) {
    const currentFastLanePackage = fastLanePackageFor(els.service.value);
    if (currentFastLanePackage && currentFastLanePackage !== state.selectedPackage) {
      els.service.value = '';
    }
  }
  applyActiveTheme(state.selectedPackage);
  renderPackages();
  renderFastLanes();
  updateSummaries();
  showError('');
  if (options.advance) {
    setStep(2);
    window.requestAnimationFrame(() => {
      els.form.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
    });
  }
}

function applyFastLaneServiceSelection() {
  const mappedPackage = fastLanePackageFor(els.service.value);
  if (!mappedPackage) {
    renderFastLanes();
    updateSummaries();
    return;
  }
  selectPackage(mappedPackage, { advance: false, preserveService: true });
  renderFastLanes();
}

function fastLaneServices() {
  return fastLaneOffers().map((offer) => offer.label);
}

function selectFastLane(service) {
  const offer = typeof service === 'object' ? normalizeFastLaneOffer(service) : fastLaneOfferForService(service);
  const mappedPackage = offer?.recommended_package || fastLanePackageFor(service);
  if (!mappedPackage) return;
  setSelectIfAvailable(els.service, offer?.label || service);
  setQuickServiceIfAvailable(offer?.label || service);
  selectPackage(mappedPackage, { advance: false, preserveService: true });
  renderFastLanes();
  showError('');
  window.requestAnimationFrame(() => {
    openDetailedBrief({ scroll: false });
    if (els.detailedBrief) els.detailedBrief.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
  });
}

function setSelectIfAvailable(select, value) {
  if (!select || !value) return false;
  const exists = [...select.options].some((option) => option.value === value);
  if (!exists) return false;
  select.value = value;
  return true;
}

function setQuickServiceIfAvailable(value) {
  if (!els.quickService) return false;
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return false;
  const direct = QUICK_SERVICE_OPTIONS.find((option) => option.value.toLowerCase() === normalized);
  if (direct) return setSelectIfAvailable(els.quickService, direct.value);

  let mapped = '';
  if (/same-day|fast lane|urgent/.test(normalized)) mapped = 'Same-Day Reel';
  else if (/website|digital|landing|booking|portal|client flow/.test(normalized)) mapped = 'Website / Digital System';
  else if (/video|content|reel|event|film|edit|music|artist|campaign|coverage/.test(normalized)) mapped = 'Video / Content';
  else if (/brand|logo|identity|design|launch/.test(normalized)) mapped = 'Brand Launch';
  else if (/automation|software|system|custom/.test(normalized)) mapped = 'AI / Automation';
  return mapped ? setSelectIfAvailable(els.quickService, mapped) : false;
}

function updateQuickSelectorState() {
  if (!els.quickSelectors.length) return;
  els.quickSelectors.forEach((control) => {
    const service = control.dataset.quickService || '';
    const packageName = control.dataset.quickPackage || '';
    const selected = service
      ? ((els.quickService && els.quickService.value) || els.service.value) === service
      : Boolean(packageName && state.selectedPackage === packageName);
    control.classList.toggle('active', selected);
    control.setAttribute('aria-pressed', selected ? 'true' : 'false');
    const stateLabel = control.querySelector('.service-card-state');
    if (stateLabel) stateLabel.textContent = selected ? 'Selected' : 'Select';
  });
}

function selectQuickService(control) {
  if (!control) return;
  const service = cleanTrackingValue(control.dataset.quickService || '', 160);
  if (service) {
    setSelectIfAvailable(els.service, service);
    setQuickServiceIfAvailable(service);
    markQuickInquiryStarted();
    trackBookingEvent('booking_service_selected', { service, intake_path: 'service_guide' });
  }
  renderFastLanes();
  updateSummaries();
  updateQuickSelectorState();
  showError('');
  window.requestAnimationFrame(() => {
    if (els.quickForm) els.quickForm.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
  });
}

function wireQuickSelectors() {
  if (!els.quickSelectors.length) return;
  els.quickSelectors.forEach((control) => {
    control.setAttribute('aria-pressed', 'false');
    control.addEventListener('click', () => selectQuickService(control));
  });
}

function renderFastLanes() {
  if (!els.fastLaneGrid) return;
  const lanes = fastLaneOffers();
  els.fastLaneGrid.replaceChildren();
  if (!lanes.length) {
    const empty = document.createElement('article');
    empty.className = 'fast-lane-card loading-card';
    empty.textContent = 'Fast Lane options are loading.';
    els.fastLaneGrid.append(empty);
    return;
  }
  lanes.forEach((offer) => {
    const service = offer.label;
    const mappedPackage = offer.recommended_package;
    const pkg = packageByName(mappedPackage);
    const cardTheme = themeFor(mappedPackage);
    const details = FAST_LANE_DETAILS[service] || {};
    const selected = els.service.value === service && state.selectedPackage === mappedPackage;
    const card = document.createElement('article');
    card.className = `fast-lane-card${selected ? ' active' : ''}`;
    card.dataset.fastLane = service;
    card.dataset.packageTheme = cardTheme.slug;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', selected ? 'true' : 'false');
    card.setAttribute('aria-label', `${service} maps to ${offer.package_fit || mappedPackage}${selected ? ' selected' : ''}`);

    const visuals = {
      'Same-Day Reel': ['M4 7h24v20H4z M4 13h24 M9 7l4 6 M18 7l4 6 M14 17l7 4-7 4z', 'Footage ready. One focused edit.'],
      'Event Promo': ['M5 8h22v20H5z M10 4v8 M22 4v8 M5 16h22 M11 21h10', 'A clear promo for your next event.'],
      'Business Content Pack': ['M5 6h16v19H5z M11 11h16v18H11 M9 11h8 M9 16h8', 'Connected assets for your business.'],
      'Website Cleanup': ['M4 5h24v22H4z M4 11h24 M10 17l-4 3 4 3 M22 17l4 3-4 3', 'Polish a page. Clear the friction.'],
      'Brand Launch Assets': ['M11 21c-2-8 3-15 15-16 0 12-7 17-15 16z M11 21l-5 5 M8 17H4l5-7 M15 24v4l7-7', 'The essentials for your next launch.'],
      'Emergency Booking/Client Flow Fix': ['M5 5h8v8H5z M19 19h8v8h-8z M9 13v10h10 M13 9h10v10', 'Get the client path moving again.']
    };
    const [path, summary] = visuals[service] || ['M16 4l-9 14h8l-1 10 11-16h-9z', 'Focused work. Scope confirmed first.'];
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 32 32');
    icon.setAttribute('aria-hidden', 'true');
    icon.classList.add('fast-lane-icon');
    const stroke = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    stroke.setAttribute('d', path); icon.append(stroke);
    const head = document.createElement('div'); head.className = 'fast-lane-head';
    appendText(head, 'h3', service, 'Fast Lane');
    const status = document.createElement('span');
    status.className = selected ? 'selected-indicator selected' : 'selected-indicator';
    status.textContent = selected ? '✓ Selected' : '↗'; head.append(status);
    const description = document.createElement('p');
    description.className = 'fast-lane-description'; description.textContent = summary;
    const meta = document.createElement('div'); meta.className = 'fast-lane-meta';
    appendText(meta, 'span', offer.urgency || details.turnaround || 'Scope reviewed first', 'Scoped timing');
    appendText(meta, 'span', mappedPackage, 'Mapped package');
    const cta = document.createElement('span'); cta.className = 'fast-lane-cta';
    cta.textContent = selected ? 'Lane selected ✓' : 'Use this lane ↗';

    const handleSelect = () => selectFastLane(offer);
    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handleSelect();
    });

    card.append(icon, head, description, meta, cta);
    els.fastLaneGrid.append(card);
  });
}

function renderPackages() {
  const packages = state.config.packages || [];
  els.packageGrid.replaceChildren();
  packages.forEach((pkg) => {
    const name = packageLabel(pkg);
    const selected = state.selectedPackage === name;
    const cardTheme = themeFor(name);
    const card = document.createElement('article');
    card.className = `package-card${selected ? ' active' : ''}`;
    card.dataset.packageTheme = cardTheme.slug;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', selected ? 'true' : 'false');
    card.setAttribute('aria-label', `${name} ${selected ? 'selected' : 'select package'}`);

    const moduleLabel = document.createElement('span');
    moduleLabel.className = 'module-label';
    moduleLabel.textContent = 'System module';

    const pkgIcon = name.includes('Signal') ? '⚡ ' : name.includes('Engine') ? '⚙️ ' : name.includes('System') ? '🏛️ ' : '🎨 ';
    const head = document.createElement('div');
    head.className = 'package-card-head';
    const headCopy = document.createElement('div');
    appendText(headCopy, 'h3', pkgIcon + name, 'Package');
    appendText(headCopy, 'strong', packagePrice(pkg), 'Scope based');
    head.append(headCopy);

    const status = document.createElement('span');
    status.className = selected ? 'selected-indicator selected' : 'selected-indicator';
    status.textContent = selected ? 'Selected' : 'Select';
    head.append(status);

    if (pkg.recommended) {
      const badge = document.createElement('span');
      badge.className = 'recommended';
      badge.textContent = 'Recommended';
      card.append(badge);
    }

    const purpose = document.createElement('p');
    purpose.className = 'package-purpose';
    purpose.textContent = text(pkg.purpose || pkg.description, '');

    const description = document.createElement('p');
    description.className = 'package-description';
    description.textContent = text(pkg.description, '');

    const bestFor = document.createElement('div');
    bestFor.className = 'best-for';
    appendText(bestFor, 'span', 'Best for');
    const list = document.createElement('ul');
    (Array.isArray(pkg.best_for) ? pkg.best_for : []).slice(0, 6).forEach((item) => {
      appendText(list, 'li', item, '');
    });
    bestFor.append(list);

    const tags = document.createElement('div');
    tags.className = 'service-tags';
    (Array.isArray(pkg.examples) ? pkg.examples : []).slice(0, 4).forEach((item) => {
      appendText(tags, 'span', item, '');
    });

    const message = document.createElement('p');
    message.className = 'selected-message';
    message.textContent = cardTheme.message;

    const cta = document.createElement('span');
    cta.className = 'package-cta';
    cta.textContent = selected ? 'Selected' : text(pkg.cta, 'Start Booking');

    const handleSelect = () => {
      selectPackage(name);
      trackBookingEvent('booking_package_selected', { package: name });
      window.requestAnimationFrame(() => {
        openDetailedBrief({ scroll: false });
        if (els.form) els.form.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
      });
    };
    card.addEventListener('click', handleSelect);
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handleSelect();
    });

    card.append(moduleLabel, head, purpose, description, bestFor, tags, message, cta);
    els.packageGrid.append(card);
  });
}

function fillSelects() {
  optionList(els.service, serviceOptions(), 'Choose service type');
  optionList(els.package, packageOptions(), 'Choose package');
  optionList(els.budget, state.config.budgetRanges || fallbackConfig.budgetRanges, 'Select budget range');
  optionList(els.urgency, state.config.urgencyLevels || fallbackConfig.urgencyLevels, 'Select urgency');
  optionList(els.deposit, state.config.depositReadiness || fallbackConfig.depositReadiness, 'Select readiness');
  optionList(els.contactMethod, state.config.preferredContactMethods || fallbackConfig.preferredContactMethods, 'Choose contact method');
  optionList(els.projectType, state.config.projectTypes || fallbackConfig.projectTypes, 'Choose project type');
  optionList(els.referralSource, state.config.referralSources || fallbackConfig.referralSources, 'Select source');
  optionList(els.nextStep, state.config.preferredNextSteps || fallbackConfig.preferredNextSteps, 'Choose next step');
}

function openDetailedBrief({ scroll = true } = {}) {
  if (!els.detailedBrief) return;
  const wasHidden = els.detailedBrief.hidden;
  els.detailedBrief.hidden = false;
  syncQuickToDetailed();
  els.openDetailedButtons.forEach((button) => button.setAttribute('aria-expanded', 'true'));
  if (wasHidden && !state.detailedStarted) {
    state.detailedStarted = true;
    trackBookingEvent('detailed_brief_started', {});
  }
  if (scroll) {
    window.requestAnimationFrame(() => els.detailedBrief.scrollIntoView({ behavior: motionBehavior(), block: 'start' }));
  }
}

function syncValue(source, destination, { preferSource = false } = {}) {
  if (!source || !destination || destination.value === source.value) return;
  const sourceHasValue = Boolean(String(source.value || '').trim());
  const destinationHasValue = Boolean(String(destination.value || '').trim());
  // A blank field on one path must never erase details already entered on the other.
  if (!sourceHasValue && destinationHasValue) return;
  // When the visitor edits a field directly, that field is the active source of truth.
  if (sourceHasValue && destinationHasValue && !preferSource) return;
  destination.value = source.value;
}

function syncQuickToDetailed(field = '') {
  if (field === 'consent') {
    els.consent.checked = els.quickConsent.checked;
    return;
  }
  if ((!field || field === 'service') && els.quickService.value && (!els.service.value || field === 'service')) {
    setSelectIfAvailable(els.service, els.quickService.value);
  }
  const pairs = [
    ['name', els.quickName, els.name],
    ['email', els.quickEmail, els.email],
    ['phone', els.quickPhone, els.phone],
    ['description', els.quickDescription, els.description],
    ['link', els.quickLink, els.social],
    ['budget', els.quickBudget, els.budget]
  ];
  pairs.forEach(([key, source, destination]) => {
    if (!field || field === key) syncValue(source, destination, { preferSource: Boolean(field) });
  });
  if (!field && (els.quickConsent.checked || els.consent.checked)) {
    els.quickConsent.checked = true;
    els.consent.checked = true;
  }
}

function syncDetailedToQuick(field = '') {
  if (field === 'consent') {
    els.quickConsent.checked = els.consent.checked;
    return;
  }
  if ((!field || field === 'service') && els.service.value && (!els.quickService.value || field === 'service')) {
    setQuickServiceIfAvailable(els.service.value);
  }
  const pairs = [
    ['name', els.name, els.quickName],
    ['email', els.email, els.quickEmail],
    ['phone', els.phone, els.quickPhone],
    ['description', els.description, els.quickDescription],
    ['link', els.social, els.quickLink],
    ['budget', els.budget, els.quickBudget]
  ];
  pairs.forEach(([key, source, destination]) => {
    if (!field || field === key) syncValue(source, destination, { preferSource: Boolean(field) });
  });
  if (!field && (els.consent.checked || els.quickConsent.checked)) {
    els.quickConsent.checked = true;
    els.consent.checked = true;
  }
}

function wireInquiryFieldSync() {
  const quickFields = [
    ['name', els.quickName], ['email', els.quickEmail], ['phone', els.quickPhone],
    ['description', els.quickDescription], ['link', els.quickLink]
  ];
  quickFields.forEach(([key, field]) => field.addEventListener('input', () => {
    syncQuickToDetailed(key);
    updateSummaries();
    markQuickInquiryStarted();
  }));
  els.quickService.addEventListener('change', () => {
    syncQuickToDetailed('service');
    updateSummaries();
    markQuickInquiryStarted();
  });
  els.quickBudget.addEventListener('change', () => {
    syncQuickToDetailed('budget');
    updateSummaries();
    markQuickInquiryStarted();
  });
  els.quickService.addEventListener('change', () => {
    trackBookingEvent('booking_service_selected', { service: els.quickService.value, intake_path: 'quick_inquiry' });
  });
  const detailedFields = [
    ['name', els.name], ['email', els.email], ['phone', els.phone],
    ['description', els.description], ['link', els.social]
  ];
  detailedFields.forEach(([key, field]) => field.addEventListener('input', () => {
    syncDetailedToQuick(key);
    updateSummaries();
    if (!state.detailedStarted) {
      state.detailedStarted = true;
      trackBookingEvent('detailed_brief_started', {});
    }
  }));
  els.service.addEventListener('change', () => {
    syncDetailedToQuick('service');
    updateSummaries();
  });
  els.budget.addEventListener('change', () => {
    syncDetailedToQuick('budget');
    updateSummaries();
  });
  els.quickConsent.addEventListener('change', () => syncQuickToDetailed('consent'));
  els.consent.addEventListener('change', () => syncDetailedToQuick('consent'));
}

function payload(path = 'detailed_brief') {
  const isQuick = path === 'quick_inquiry';
  const selectedService = isQuick ? els.quickService.value : els.service.value;
  const selectedOffer = fastLaneOfferForService(selectedService);
  const fastLanePackage = selectedOffer ? fastLanePackageFitFor(selectedService) : '';
  const selectedPackage = isQuick ? state.selectedPackage : els.package.value;
  return {
    booking_token: state.bookingToken,
    source_tracking: { ...state.sourceTracking, intake_path: path },
    otp_company_website: isQuick
      ? (els.quickHoneypot ? els.quickHoneypot.value.trim() : '')
      : (els.honeypot ? els.honeypot.value.trim() : ''),
    name: (isQuick ? els.quickName.value : els.name.value).trim(),
    email: (isQuick ? els.quickEmail.value : els.email.value).trim(),
    phone: (isQuick ? els.quickPhone.value : els.phone.value).trim(),
    business_name: isQuick ? '' : els.business.value.trim(),
    preferred_contact_method: isQuick ? '' : els.contactMethod.value.trim(),
    social_link: isQuick ? els.quickLink.value.trim() : els.social.value.trim(),
    service_type: String(selectedService || '').trim(),
    project_type: isQuick ? '' : els.projectType.value.trim(),
    package_interest: String(selectedPackage || (isQuick ? 'Not Sure Yet' : '')).trim(),
    selected_fast_offer: selectedOffer ? selectedOffer.label : '',
    fast_lane_package: fastLanePackage,
    project_description: (isQuick ? els.quickDescription.value : els.description.value).trim(),
    desired_deliverables: isQuick ? '' : els.deliverables.value.trim(),
    reference_link: isQuick ? '' : els.reference.value.trim(),
    budget_range: (isQuick ? els.quickBudget.value : els.budget.value).trim(),
    ideal_deadline: isQuick ? '' : els.deadline.value.trim(),
    urgency_level: isQuick ? (selectedOffer?.urgency || '') : els.urgency.value.trim(),
    deposit_readiness: isQuick ? '' : els.deposit.value.trim(),
    location: isQuick ? '' : els.location.value.trim(),
    referral_source: isQuick ? '' : els.referralSource.value.trim(),
    preferred_next_step: isQuick ? 'Send me the best next step' : els.nextStep.value.trim(),
    contact_consent: Boolean(isQuick ? els.quickConsent.checked : els.consent.checked)
  };
}

function trackBookingEvent(eventName, data = {}) {
  try {
    if (window.OTPAnalytics && typeof window.OTPAnalytics.trackEvent === 'function') {
      window.OTPAnalytics.trackEvent(eventName, data);
    }
  } catch (_) { /* Analytics never blocks the inquiry. */ }
}

function markQuickInquiryStarted() {
  if (state.quickStarted) return;
  state.quickStarted = true;
  trackBookingEvent('quick_inquiry_started', {});
}

function quickInquiryMissing() {
  const p = payload('quick_inquiry');
  const missing = [];
  if (!p.service_type) missing.push('service');
  if (!p.project_description) missing.push('project description');
  else if (p.project_description.length < 12) missing.push('a little more project detail');
  if (!p.name) missing.push('name');
  if (!p.email && !p.phone) missing.push('email or phone');
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) missing.push('valid email');
  if (!p.contact_consent) missing.push('contact consent');
  return missing;
}

function focusQuickInquiryError(missing) {
  const first = missing[0] || '';
  const target = first === 'service' ? els.quickService
    : first === 'project description' || first === 'a little more project detail' ? els.quickDescription
      : first === 'name' ? els.quickName
        : first === 'email or phone' ? (els.quickEmail.value ? els.quickPhone : els.quickEmail)
          : first === 'valid email' ? els.quickEmail
            : first === 'contact consent' ? els.quickConsent : null;
  if (target && typeof target.focus === 'function') target.focus();
}

function validateQuickInquiry() {
  const missing = quickInquiryMissing();
  if (!missing.length) {
    els.quickError.textContent = '';
    els.quickError.classList.add('hidden');
    return true;
  }
  const message = `Please add ${missing.join(', ')} before sending your inquiry.`;
  els.quickError.textContent = message;
  els.quickError.classList.remove('hidden');
  trackBookingEvent('booking_validation_error', { intake_path: 'quick_inquiry', fields: missing });
  focusQuickInquiryError(missing);
  return false;
}

function missingForStep(step) {
  const p = payload();
  if (step === 1) {
    const missing = [];
    const hasEmail = Boolean(p.email);
    const hasPhone = Boolean(p.phone);
    if (!p.name) missing.push('name');
    if (!hasEmail && !hasPhone) missing.push('email or phone');
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) missing.push('valid email');
    return missing;
  }
  if (step === 2) {
    const missing = [];
    if (!p.service_type) missing.push('service type');
    if (!p.package_interest) missing.push('package interest');
    if (!p.project_description) missing.push('project description');
    return missing;
  }
  if (step === 4) {
    return p.contact_consent ? [] : ['contact consent'];
  }
  return [];
}

function focusFirstInvalid(missing) {
  if (!missing || !missing.length) return;
  const first = missing[0];
  let elToFocus = null;
  if (first === 'name') elToFocus = els.name;
  else if (first === 'email or phone' || first === 'valid email') elToFocus = (els.email && !els.email.value) ? els.email : (els.phone || els.email);
  else if (first === 'service type') elToFocus = els.service;
  else if (first === 'package interest') elToFocus = els.package;
  else if (first === 'project description') elToFocus = els.description;
  else if (first === 'contact consent') elToFocus = els.consent;
  if (elToFocus && typeof elToFocus.focus === 'function') {
    try {
      elToFocus.focus();
    } catch (_) {}
  }
}

function validateStep(step, { shouldFocus = true } = {}) {
  const missing = missingForStep(step);
  if (!missing.length) {
    showError('');
    return true;
  }
  showError(`Please add ${missing.join(', ')} before continuing.`);
  if (shouldFocus) {
    focusFirstInvalid(missing);
  }
  return false;
}

function renderReview() {
  const p = payload();
  const selected = packageByName(p.package_interest);
  const selectedSummary = selectedDisplay();
  const rows = [
    ['Client', `${text(p.name)}${p.business_name ? ` / ${p.business_name}` : ''}`],
    ['Contact', `${text(p.email)}${p.phone ? ` / ${p.phone}` : ''}${p.preferred_contact_method ? ` / ${p.preferred_contact_method}` : ''}`],
    ['Service', text(p.service_type)],
    ['Project Type', text(p.project_type)],
    ['Selected Package', text(p.package_interest)],
    ['Package Range', selected ? packagePrice(selected) : (p.package_interest === 'Not Sure Yet' ? 'Oracle recommendation requested' : 'Not provided yet')],
    ['Package Fit', selectedSummary.message],
    ['Project Description', text(p.project_description)],
    ['Deliverables', text(p.desired_deliverables)],
    ['Budget / Timeline', `${text(p.budget_range)} / ${formatDeadline(p.ideal_deadline)}`],
    ['Urgency', text(p.urgency_level)],
    ['Location / Source', `${text(p.location)} / ${text(p.referral_source)}`],
    ['Preferred Next Step', text(p.preferred_next_step)],
    ['Reference', text(p.reference_link)],
    ['Contact Consent', p.contact_consent ? 'Confirmed' : 'Not confirmed yet']
  ];
  els.review.replaceChildren();
  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'review-row';
    const key = document.createElement('strong');
    const val = document.createElement('span');
    key.textContent = label;
    val.textContent = value;
    row.append(key, val);
    els.review.append(row);
  });
}

function setStep(step) {
  state.step = Math.max(1, Math.min(4, Number(step) || 1));
  document.documentElement.dataset.bookingStep = String(state.step);
  els.steps.forEach((section) => {
    section.classList.toggle('active', Number(section.dataset.step) === state.step);
  });
  els.stepDots.forEach((dot) => {
    const n = Number(dot.dataset.stepDot);
    dot.classList.toggle('active', n === state.step);
    dot.classList.toggle('done', n < state.step);
  });
  els.stepLabel.textContent = `${stepNames[state.step - 1]} / Step ${state.step} of 4`;
  els.prev.classList.toggle('hidden', state.step === 1);
  els.next.classList.toggle('hidden', state.step === 4);
  els.submit.classList.toggle('hidden', state.step !== 4);
  if (state.step === 4) renderReview();
  showStatus('');
  updateSummaries();
}

function hasOtpPersistenceEvidence(data = {}) {
  const evidence = data.writerEvidence || data.writer_evidence || {};
  return evidence.writer === 'otp_os' && ['persisted', 'duplicate_replay'].includes(evidence.status);
}

function renderSuccess(data, path = 'detailed_brief') {
  const recommendation = data.recommendation && typeof data.recommendation === 'object' ? data.recommendation : null;
  state.submitted = true;
  els.success.classList.remove('hidden');
  els.success.classList.toggle('partial', !recommendation);
  els.form.classList.add('submitted');
  els.successTitle.textContent = path === 'quick_inquiry'
    ? 'Your inquiry reached OTP.'
    : 'Your full brief reached OTP.';
  els.successCopy.textContent = 'OTP will review the scope and follow up with questions, a package recommendation, or a proposed next step. This inquiry is not a confirmed booking or purchase.';
  els.successMeta.replaceChildren();
  els.successActions.replaceChildren();

  const rows = [
    ['Status', recommendation ? 'Request received with OTP recommendation' : 'Request received. OTP recommendation is pending review.'],
    ['Recommended Package', recommendation ? text(recommendation.recommendedPackage) : 'Recommendation pending review'],
    ['Quote Range', recommendation ? text(recommendation.quoteRange, 'Scope based') : 'Pending review'],
    ['Next Step', text(data.nextStep || recommendation?.nextAction, 'OTP will confirm scope and prepare the next step.')],
    ['Client Portal', 'Private portal access is sent only after OTP reviews and approves the next step.']
  ];

  rows.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'success-row';
    const key = document.createElement('strong');
    const val = document.createElement('span');
    key.textContent = label;
    val.textContent = value;
    row.append(key, val);
    els.successMeta.append(row);
  });

  if (recommendation?.reason) {
    const reason = document.createElement('p');
    reason.className = 'recommendation-reason';
    reason.textContent = recommendation.reason;
    els.successMeta.append(reason);
  }

  const depositInfo = data.depositCheckout || null;
  if (depositInfo && depositInfo.enabled) {
    const depositCard = document.createElement('div');
    depositCard.className = 'fast-lane-deposit-card';

    const badge = document.createElement('div');
    badge.className = 'deposit-badge';
    badge.textContent = depositInfo.headline || '⚡ Lock Priority Build Slot';

    const depositBody = document.createElement('div');
    depositBody.className = 'deposit-body';

    const priceTag = document.createElement('div');
    priceTag.className = 'deposit-price-tag';

    const amountSpan = document.createElement('span');
    amountSpan.className = 'deposit-amount';
    amountSpan.textContent = depositInfo.depositDisplay || '$250 Deposit';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'deposit-label';
    labelSpan.textContent = '100% Credited Priority Deposit';

    priceTag.append(amountSpan, labelSpan);

    const copy = document.createElement('p');
    copy.className = 'deposit-copy';
    copy.textContent = depositInfo.subheadline || `Secure your priority 24/48-hour build slot for ${text(depositInfo.packageName)} immediately.`;

    const depositBtn = document.createElement('button');
    depositBtn.type = 'button';
    depositBtn.className = 'deposit-pay-button';
    depositBtn.textContent = `💳 Lock Fast-Lane Slot (${text(depositInfo.depositDisplay)}) →`;

    depositBtn.addEventListener('click', async () => {
      depositBtn.disabled = true;
      depositBtn.textContent = 'Preparing Secure Checkout...';
      try {
        const res = await fetch('/api/bookings/deposit-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            package_name: depositInfo.packageName,
            booking_token: state.bookingToken || data.booking_token || '',
            selected_fast_offer: depositInfo.selectedFastOffer
          })
        });
        const checkoutData = await res.json().catch(() => ({}));
        if (checkoutData.checkoutUrl) {
          window.location.href = checkoutData.checkoutUrl;
        } else {
          window.location.href = depositInfo.checkoutUrl || '/bookings?status=deposit_ready';
        }
      } catch {
        window.location.href = depositInfo.checkoutUrl || '/bookings?status=deposit_ready';
      }
    });

    depositBody.append(priceTag, copy, depositBtn);
    depositCard.append(badge, depositBody);
    els.successActions.append(depositCard);
  }

  const portalHref = safePortalHref(data);
  const portalLink = document.createElement('a');
  portalLink.href = portalHref || '/portal';
  portalLink.textContent = portalHref ? '🏛️ Open Private Portal Room →' : '🏛️ Access Client Portal →';
  els.successActions.append(portalLink);

  const newBooking = document.createElement('button');
  newBooking.type = 'button';
  newBooking.textContent = 'Start Another Booking';
  newBooking.addEventListener('click', () => window.location.reload());
  els.successActions.append(newBooking);
  els.submit.disabled = true;
  els.submit.textContent = 'Request Submitted';
  els.quickSubmit.disabled = true;
  els.quickSubmit.textContent = 'Inquiry Received';
  try { sessionStorage.removeItem('otp_booking_token'); } catch (_) { /* Keep success state even if storage is unavailable. */ }
  els.success.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
}

async function submitIntake(event, path) {
  event.preventDefault();
  if (state.submitting || state.submitted) return;
  const isQuick = path === 'quick_inquiry';
  state.sourceTracking = getAttributionTracking();

  if (isQuick) {
    if (!validateQuickInquiry()) return;
  } else if (!validateStep(1) || !validateStep(2) || !validateStep(4)) {
    const missing = [...new Set([1, 2, 4].flatMap(missingForStep))];
    trackBookingEvent('booking_validation_error', { intake_path: path, fields: missing });
    setStep(missingForStep(1).length ? 1 : missingForStep(2).length ? 2 : 4);
    return;
  }

  const requestPayload = payload(path);
  const activeButton = isQuick ? els.quickSubmit : els.submit;
  state.submitting = true;
  els.submit.disabled = true;
  els.quickSubmit.disabled = true;
  activeButton.classList.add('is-loading');
  activeButton.textContent = isQuick ? 'Sending…' : 'Submitting';
  showError('');
  showQuickError('');
  showStatus(isQuick ? '' : 'Sending full brief to OTP...');
  showQuickStatus(isQuick ? 'Sending your inquiry to OTP...' : '');
  trackBookingEvent('booking_submission_attempted', { intake_path: path, service: requestPayload.service_type });

  let failureCode = 'request_failed';
  try {
    const response = await fetch('/api/bookings/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Idempotency-Key': requestPayload.booking_token
      },
      body: JSON.stringify(requestPayload)
    });
    const data = await response.json().catch(() => ({}));
    failureCode = String(data.errorCode || data.error_code || `http_${response.status}`);
    if (!response.ok || data.ok === false || data.error) {
      throw new Error(text(data.message, 'OTP could not receive the request. Please try again shortly.'));
    }
    if (!hasOtpPersistenceEvidence(data)) {
      failureCode = 'writer_evidence_missing';
      throw new Error('OTP could not verify that the request reached the lead system. Please try again shortly.');
    }
    trackBookingEvent('booking_submission_persisted', { intake_path: path, writer: 'otp_os' });
    renderSuccess(data, path);
    showStatus('');
    showQuickStatus('');
  } catch (error) {
    trackBookingEvent('booking_submission_failed', { intake_path: path, error_code: failureCode });
    const message = text(error?.message, 'OTP could not receive the request. Please try again shortly.');
    if (isQuick) {
      showQuickStatus('');
      showQuickError(message);
    } else {
      showStatus('');
      showError(message);
    }
  } finally {
    state.submitting = false;
    activeButton.classList.remove('is-loading');
    if (!state.submitted) {
      els.submit.disabled = false;
      els.quickSubmit.disabled = false;
      els.submit.textContent = 'Submit Booking Request';
      els.quickSubmit.textContent = 'Request My Quote ↗';
    }
  }
}

function submitBooking(event) {
  return submitIntake(event, 'detailed_brief');
}

function submitQuickInquiry(event) {
  return submitIntake(event, 'quick_inquiry');
}

function wireProjectIntakeAttribution() {
  const cta = document.querySelector('.project-intake-cta');
  if (!cta) return;
  const base = cta.getAttribute('data-intake-base') || cta.getAttribute('href') || '';
  const href = window.OTPAttribution ? window.OTPAttribution.buildUrlWithAttribution(base) : base;
  if (href) {
    const destination = new URL(href, window.location.origin);
    if (window.OTP && typeof window.OTP.getPublicThemeState === 'function') {
      const preference = window.OTP.getPublicThemeState();
      destination.searchParams.set('otp_palette', preference.palette);
      destination.searchParams.set('otp_theme', preference.theme);
      destination.searchParams.set('otp_theme_mode', preference.mode);
    }
    if (els.service.value) destination.searchParams.set('service', els.service.value);
    if (state.selectedPackage) destination.searchParams.set('package', state.selectedPackage);
    cta.href = destination.href;
    cta.rel = 'noopener noreferrer';
  }
}

async function init() {
  try {
    if (window.OTPAttribution && typeof window.OTPAttribution.captureOnLoad === 'function') {
      window.OTPAttribution.captureOnLoad();
    }
  } catch (_) { /* non-blocking */ }
  state.sourceTracking = getAttributionTracking();
  trackBookingEvent('booking_page_viewed', { route: window.location.pathname || '/start-project' });
  try { wireProjectIntakeAttribution(); } catch (_) { /* non-blocking */ }
  applyActiveTheme('');
  let offlineMode = false;
  try {
    const response = await fetch('/api/bookings/config', { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok !== false) state.config = { ...fallbackConfig, ...data };
  } catch (_) {
    offlineMode = true;
  }
  fillSelects();
  fillQuickSelects();
  wireInquiryFieldSync();
  wireQuickSelectors();
  renderPackages();
  renderFastLanes();
  setStep(1);
  if (offlineMode) showStatus('Booking options loaded in offline mode.');

  const urlParams = new URLSearchParams(window.location.search || '');
  const statusParam = urlParams.get('status');
  const packageParam = urlParams.get('package') || urlParams.get('pkg');
  const fastParam = urlParams.get('fast') || urlParams.get('fast_offer') || urlParams.get('service');
  const clientParam = urlParams.get('client') || urlParams.get('target') || urlParams.get('business');

  if (packageParam) {
    let matchedPkg = 'The Signal';
    const lowerPkg = packageParam.toLowerCase();
    if (lowerPkg.includes('engine')) matchedPkg = 'The Engine';
    else if (lowerPkg.includes('system')) matchedPkg = 'The System';
    else if (lowerPkg.includes('signal')) matchedPkg = 'The Signal';

    selectPackage(matchedPkg, { advance: false });
    openDetailedBrief({ scroll: false });
  }

  if (fastParam && els.service) {
    const cleanFast = fastParam.replace(/_/g, ' ').replace(/-/g, ' ');
    const matchedService = Array.from(els.service.options).find(opt => opt.value.toLowerCase() === cleanFast.toLowerCase() || opt.value.toLowerCase().includes(cleanFast.toLowerCase()));
    if (matchedService) {
      els.service.value = matchedService.value;
      setQuickServiceIfAvailable(matchedService.value);
      updateSummaries();
    }
  }

  if (clientParam && els.business) {
    els.business.value = clientParam;
    if (els.description && !els.description.value) {
      els.description.value = `Conversion & digital experience optimization for ${clientParam}`;
    }
    syncDetailedToQuick();
  }

  if (statusParam === 'deposit_paid') {
    showStatus('⚡ Deposit Received! Your Fast-Lane priority slot is locked. OTP team will confirm scope details with you shortly.');
  } else if (statusParam === 'deposit_ready') {
    showStatus('⚡ Your Fast-Lane booking deposit is ready. Select your preferred payment option.');
  }
}

if (els.next) els.next.addEventListener('click', () => {
  if (!validateStep(state.step)) {
    trackBookingEvent('booking_validation_error', { intake_path: 'detailed_brief', step: state.step });
    return;
  }
  setStep(state.step + 1);
});
if (els.prev) els.prev.addEventListener('click', () => setStep(state.step - 1));
if (els.package) els.package.addEventListener('change', () => {
  selectPackage(els.package.value, { advance: false });
  if (els.package.value) trackBookingEvent('booking_package_selected', { package: els.package.value });
});
if (els.service) els.service.addEventListener('change', () => {
  setQuickServiceIfAvailable(els.service.value);
  applyFastLaneServiceSelection();
  trackBookingEvent('booking_service_selected', { service: els.service.value, intake_path: 'detailed_brief' });
});
if (els.quickForm) els.quickForm.addEventListener('submit', submitQuickInquiry);
els.openDetailedButtons.forEach((button) => {
  button.setAttribute('aria-controls', 'detailed-brief');
  button.setAttribute('aria-expanded', 'false');
  button.addEventListener('click', () => {
    els.openDetailedButtons.forEach((control) => control.setAttribute('aria-expanded', 'true'));
    openDetailedBrief();
  });
});
document.querySelectorAll('.project-intake-cta').forEach((link) => {
  link.addEventListener('click', () => trackBookingEvent('secure_intake_opened', { intake_path: state.detailedStarted ? 'detailed_brief' : 'quick_inquiry' }));
});
document.querySelectorAll('a[href="#quick-inquiry"]').forEach((link) => {
  link.addEventListener('click', () => trackBookingEvent('booking_primary_cta_selected', { route: link.getAttribute('href') }));
});
if (els.form) {
  els.form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target && event.target.tagName !== 'TEXTAREA' && event.target.tagName !== 'BUTTON') {
      if (state.step < 4) {
        event.preventDefault();
        if (validateStep(state.step)) {
          setStep(state.step + 1);
        } else {
          trackBookingEvent('booking_validation_error', { intake_path: 'detailed_brief', step: state.step });
        }
      }
    }
  });
  els.form.addEventListener('input', updateSummaries);
  els.form.addEventListener('change', (event) => {
    if (event.target !== els.package && event.target !== els.service) updateSummaries();
  });
  els.form.addEventListener('submit', submitBooking);
}

const bookingThemeToggle = document.querySelector('[data-booking-theme-toggle]');
window.addEventListener('otp:themechange', wireProjectIntakeAttribution);
if (bookingThemeToggle && window.OTP && typeof window.OTP.applyPaletteForTheme === 'function') {
  const syncBookingThemeToggle = () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    bookingThemeToggle.textContent = isLight ? 'Night mode' : 'Day mode';
    bookingThemeToggle.setAttribute('aria-label', `Switch to ${isLight ? 'night' : 'day'} mode`);
    bookingThemeToggle.setAttribute('aria-pressed', String(isLight));
  };
  bookingThemeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    window.OTP.setTheme(nextTheme);
    applyActiveTheme(state.selectedPackage);
    syncBookingThemeToggle();
  });
  window.addEventListener('otp:themechange', syncBookingThemeToggle);
  syncBookingThemeToggle();
}

init();
