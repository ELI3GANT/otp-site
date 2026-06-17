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
      best_for: ['Full website', 'Brand identity', 'Content system', 'AI/automation setup', 'Booking/payment workflow', 'Client portal', 'Document/invoice workflow', 'Business workflow system'],
      examples: ['Full website', 'AI automation', 'Client portal', 'Document workflow'],
      cta: 'Build The System'
    },
    {
      id: 'custom-build',
      internal_key: 'Custom',
      name: 'Custom Build',
      price: 'Scope based',
      purpose: 'For anything unique, advanced, or mixed.',
      description: 'Custom Build is for projects that do not fit inside a box. OTP scopes the work and builds around the real goal.',
      best_for: ['Custom app', 'AI tool', 'Artist rollout', 'Product launch', 'Event coverage', 'Long-term creative support', 'Mixed video/logo/site/automation project'],
      examples: ['Custom app', 'AI tool', 'Artist rollout', 'Event coverage'],
      cta: 'Request Custom Build'
    }
  ],
  serviceTypes: ['Video / Content', 'Logo / Brand Identity', 'Website / Landing Page', 'AI / Automation', 'Business System', 'Music / Artist Rollout', 'Event Coverage', 'Custom Request'],
  packageOptions: ['The Signal', 'The Engine', 'The System', 'Custom Build', 'Not Sure Yet'],
  budgetRanges: ['Under $500', '$500 to $1,200', '$1,200 to $2,000', '$2,000 to $3,500', '$3,500+', 'Not sure yet'],
  urgencyLevels: ['Flexible', 'Soon', 'Rush', 'Launch deadline'],
  depositReadiness: ['Ready if scope is clear', 'Need quote first', 'Not ready yet']
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
    slug: 'custom-build',
    accent: '#49ead6',
    accent2: '#ff76d7',
    glow: 'rgba(73, 234, 214, 0.24)',
    glow2: 'rgba(255, 118, 215, 0.15)',
    surface: 'rgba(73, 234, 214, 0.09)',
    meta: '#061312',
    message: 'Custom Build is selected for a scoped custom project.'
  }
};

const state = {
  config: fallbackConfig,
  step: 1,
  submitting: false,
  submitted: false,
  selectedPackage: '',
  bookingToken: makeBookingToken()
};

const stepNames = ['Pick Package', 'Project Details', 'Budget + Timeline', 'Review + Submit'];
const $ = (id) => document.getElementById(id);

const els = {
  packageGrid: $('package-grid'),
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
  service: $('booking-service'),
  package: $('booking-package'),
  name: $('booking-name'),
  email: $('booking-email'),
  phone: $('booking-phone'),
  business: $('booking-business'),
  social: $('booking-social'),
  description: $('booking-description'),
  reference: $('booking-reference'),
  budget: $('booking-budget'),
  deadline: $('booking-deadline'),
  urgency: $('booking-urgency'),
  deposit: $('booking-deposit'),
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
  els.error.textContent = message;
  els.error.classList.toggle('hidden', !message);
}

function showStatus(message = '') {
  els.status.textContent = message;
  els.status.classList.toggle('hidden', !message);
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
    opt.value = value;
    opt.textContent = value;
    select.append(opt);
  });
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
      || String(pkg.internal_key || '').toLowerCase() === wanted
      || String(pkg.id || '').toLowerCase() === wanted;
  }) || null;
}

function themeFor(packageName) {
  return PACKAGE_THEMES[packageSlug(packageName)] || PACKAGE_THEMES.default;
}

function applyActiveTheme(packageName = '') {
  const theme = themeFor(packageName);
  const root = document.documentElement;
  root.dataset.activePackage = theme.slug;
  root.style.setProperty('--active-accent', theme.accent);
  root.style.setProperty('--active-accent-2', theme.accent2);
  root.style.setProperty('--active-glow', theme.glow);
  root.style.setProperty('--active-glow-2', theme.glow2);
  root.style.setProperty('--active-surface', theme.surface);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.meta);
}

function selectedDisplay() {
  const raw = state.selectedPackage || els.package.value || '';
  const pkg = packageByName(raw);
  const isOracle = raw === 'Not Sure Yet';
  const theme = themeFor(raw);
  if (pkg) {
    return {
      name: text(pkg.name, 'Selected package'),
      price: text(pkg.price, 'Scope based'),
      message: theme.message,
      formTitle: `${text(pkg.name, 'Package')} request details.`,
      pill: `${text(pkg.name, 'Package')} - ${text(pkg.price, 'Scope based')}`
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
    message: PACKAGE_THEMES.default.message,
    formTitle: 'Start with the real project details.',
    pill: 'No package selected'
  };
}

function updateSummaries() {
  const selected = selectedDisplay();
  els.selectedPackageName.textContent = selected.name;
  els.selectedPackageMessage.textContent = selected.message;
  els.selectedPackagePrice.textContent = selected.price;
  els.oraclePackageName.textContent = selected.name === 'No package selected' ? 'Package system standing by' : selected.name;
  els.oraclePackageMessage.textContent = selected.name === 'No package selected'
    ? 'OTP Oracle reviews your request and helps recommend the right package, documents, and next action.'
    : `${selected.message} OTP Oracle will use that scope to route documents and next actions.`;
  els.miniPackage.textContent = selected.name;
  els.miniService.textContent = text(els.service.value, 'Not selected');
  els.miniBudget.textContent = text(els.budget.value, 'Not selected');
  els.miniTimeline.textContent = formatDeadline(els.deadline.value);
  els.formTitle.textContent = selected.formTitle;
  els.formPackageNote.textContent = selected.message;
  const pillName = els.activePackagePill.querySelector('strong');
  if (pillName) pillName.textContent = selected.pill;
}

function selectPackage(packageName, options = {}) {
  const pkg = packageByName(packageName);
  state.selectedPackage = pkg ? pkg.name : text(packageName, '');
  if (els.package) els.package.value = state.selectedPackage;
  applyActiveTheme(state.selectedPackage);
  renderPackages();
  updateSummaries();
  showError('');
  if (options.advance) {
    setStep(2);
    window.requestAnimationFrame(() => {
      els.form.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
    });
  }
}

function renderPackages() {
  const packages = state.config.packages || [];
  els.packageGrid.replaceChildren();
  packages.forEach((pkg) => {
    const selected = state.selectedPackage === pkg.name;
    const cardTheme = themeFor(pkg.name);
    const card = document.createElement('article');
    card.className = `package-card${selected ? ' active' : ''}`;
    card.dataset.packageTheme = cardTheme.slug;
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', selected ? 'true' : 'false');
    card.setAttribute('aria-label', `${text(pkg.name, 'Package')} ${selected ? 'selected' : 'select package'}`);

    const moduleLabel = document.createElement('span');
    moduleLabel.className = 'module-label';
    moduleLabel.textContent = 'System module';

    const head = document.createElement('div');
    head.className = 'package-card-head';
    const headCopy = document.createElement('div');
    appendText(headCopy, 'h3', pkg.name, 'Package');
    appendText(headCopy, 'strong', pkg.price, 'Scope based');
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

    const handleSelect = () => selectPackage(pkg.name, { advance: true });
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
  optionList(els.service, state.config.serviceTypes || state.config.services || fallbackConfig.serviceTypes, 'Choose service type');
  optionList(els.package, state.config.packageOptions || fallbackConfig.packageOptions, 'Choose package');
  optionList(els.budget, state.config.budgetRanges || fallbackConfig.budgetRanges, 'Select budget range');
  optionList(els.urgency, state.config.urgencyLevels || fallbackConfig.urgencyLevels, 'Select urgency');
  optionList(els.deposit, state.config.depositReadiness || fallbackConfig.depositReadiness, 'Select readiness');
}

function payload() {
  return {
    booking_token: state.bookingToken,
    otp_company_website: els.honeypot ? els.honeypot.value.trim() : '',
    name: els.name.value.trim(),
    email: els.email.value.trim(),
    phone: els.phone.value.trim(),
    business_name: els.business.value.trim(),
    social_link: els.social.value.trim(),
    service_type: els.service.value.trim(),
    package_interest: els.package.value.trim(),
    project_description: els.description.value.trim(),
    reference_link: els.reference.value.trim(),
    budget_range: els.budget.value.trim(),
    ideal_deadline: els.deadline.value.trim(),
    urgency_level: els.urgency.value.trim(),
    deposit_readiness: els.deposit.value.trim()
  };
}

function missingForStep(step) {
  const p = payload();
  if (step === 1) {
    const missing = [];
    if (!p.name) missing.push('name');
    if (!p.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) missing.push('valid email');
    return missing;
  }
  if (step === 2) {
    const missing = [];
    if (!p.service_type) missing.push('service type');
    if (!p.package_interest) missing.push('package interest');
    if (!p.project_description) missing.push('project description');
    return missing;
  }
  return [];
}

function validateStep(step) {
  const missing = missingForStep(step);
  if (!missing.length) {
    showError('');
    return true;
  }
  showError(`Please add ${missing.join(', ')} before continuing.`);
  return false;
}

function renderReview() {
  const p = payload();
  const selected = packageByName(p.package_interest);
  const selectedSummary = selectedDisplay();
  const rows = [
    ['Client', `${text(p.name)}${p.business_name ? ` / ${p.business_name}` : ''}`],
    ['Contact', `${text(p.email)}${p.phone ? ` / ${p.phone}` : ''}`],
    ['Service', text(p.service_type)],
    ['Selected Package', text(p.package_interest)],
    ['Package Range', text(selected?.price, p.package_interest === 'Not Sure Yet' ? 'Oracle recommendation requested' : 'Not provided yet')],
    ['Package Fit', selectedSummary.message],
    ['Project Description', text(p.project_description)],
    ['Budget / Timeline', `${text(p.budget_range)} / ${formatDeadline(p.ideal_deadline)}`],
    ['Urgency', text(p.urgency_level)],
    ['Reference', text(p.reference_link)]
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

function renderSuccess(data) {
  const recommendation = data.recommendation && typeof data.recommendation === 'object' ? data.recommendation : null;
  state.submitted = true;
  els.success.classList.remove('hidden');
  els.success.classList.toggle('partial', !recommendation);
  els.form.classList.add('submitted');
  els.successTitle.textContent = 'Your request is in. OTP will review the scope and prepare the cleanest next step.';
  els.successCopy.textContent = 'After review, you may receive a private OTP Client Portal link where you can view project status, documents, payment steps, and approvals.';
  els.successMeta.replaceChildren();
  els.successActions.replaceChildren();

  const rows = [
    ['Status', recommendation ? 'Booking saved with OTP Oracle guidance' : 'Booking saved. OTP Oracle recommendation is pending review.'],
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

  const portalHref = safePortalHref(data);
  const portalLink = document.createElement('a');
  portalLink.href = portalHref || '/portal';
  portalLink.textContent = portalHref ? 'Open Client Portal' : 'Client Portal';
  els.successActions.append(portalLink);

  const newBooking = document.createElement('button');
  newBooking.type = 'button';
  newBooking.textContent = 'Start Another Booking';
  newBooking.addEventListener('click', () => window.location.reload());
  els.successActions.append(newBooking);
  els.submit.disabled = true;
  els.submit.textContent = 'Request Submitted';
  els.success.scrollIntoView({ behavior: motionBehavior(), block: 'start' });
}

async function submitBooking(event) {
  event.preventDefault();
  if (state.submitting || state.submitted) return;
  if (!validateStep(1) || !validateStep(2)) {
    setStep(missingForStep(1).length ? 1 : 2);
    return;
  }

  state.submitting = true;
  els.submit.disabled = true;
  els.submit.classList.add('is-loading');
  els.submit.textContent = 'Submitting';
  showError('');
  showStatus('Saving booking request for OTP review...');

  try {
    const response = await fetch('/api/bookings/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload())
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false || data.error) {
      throw new Error(text(data.message, 'We could not submit the booking yet. Please check the required fields and try again.'));
    }
    renderSuccess(data);
    showStatus('');
  } catch (error) {
    showStatus('');
    showError(text(error?.message, 'We could not submit the booking yet. Please check the required fields and try again.'));
  } finally {
    state.submitting = false;
    els.submit.classList.remove('is-loading');
    if (!state.submitted) {
      els.submit.disabled = false;
      els.submit.textContent = 'Submit Booking Request';
    }
  }
}

async function init() {
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
  renderPackages();
  setStep(1);
  if (offlineMode) showStatus('Booking options loaded in offline mode.');
}

els.next.addEventListener('click', () => {
  if (!validateStep(state.step)) return;
  setStep(state.step + 1);
});
els.prev.addEventListener('click', () => setStep(state.step - 1));
els.package.addEventListener('change', () => selectPackage(els.package.value, { advance: false }));
els.form.addEventListener('input', updateSummaries);
els.form.addEventListener('change', (event) => {
  if (event.target !== els.package) updateSummaries();
});
els.form.addEventListener('submit', submitBooking);

init();
