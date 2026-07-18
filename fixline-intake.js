(function initFixlineIntake(global) {
  'use strict';

  const CATEGORY_GROUPS = [
    { label: 'Web', items: [['website', 'Website'], ['booking-page', 'Booking page'], ['store-product-page', 'Store / product page']] },
    { label: 'Social', items: [['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['youtube', 'YouTube']] },
    { label: 'Local', items: [['google-business', 'Google Business']] },
    { label: 'Brand', items: [['branding', 'Branding'], ['flyer-graphic', 'Flyer / graphic']] },
    { label: 'Campaign', items: [['campaign', 'Campaign'], ['video', 'Video']] },
    { label: 'Full presence', items: [['full-business-presence', 'Full business presence']] },
    { label: 'Other', items: [['other', 'Other']] }
  ];

  const GOALS = [
    ['identify-strongest-fix', 'Identify the strongest first fix'],
    ['convert-more', 'Convert more inquiries or bookings'],
    ['clarify-offer', 'Clarify the offer / message'],
    ['improve-brand', 'Strengthen branding presence'],
    ['fix-specific-asset', 'Fix a specific asset or page'],
    ['other', 'Other']
  ];

  const DEADLINES = [
    ['specific_date', 'Specific date'],
    ['asap', 'ASAP'],
    ['flexible', 'Flexible']
  ];

  const BUDGETS = [
    ['under-500', 'Under $500'],
    ['500-1500', '$500 – $1,500'],
    ['1500-3500', '$1,500 – $3,500'],
    ['3500-7500', '$3,500 – $7,500'],
    ['7500-plus', '$7,500+'],
    ['not-sure', 'Not sure yet']
  ];

  const CONTACT_METHODS = [
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['either', 'Either']
  ];

  const STEPS = [
    ['surfaces', 'Surfaces'],
    ['links', 'Public links'],
    ['details', 'Goal and details'],
    ['timing', 'Timing'],
    ['budget', 'Budget'],
    ['contact', 'Contact'],
    ['review', 'Review']
  ];

  const CATEGORY_LABELS = new Map(CATEGORY_GROUPS.flatMap((group) => group.items));
  const GOAL_LABELS = new Map(GOALS);
  const DEADLINE_LABELS = new Map(DEADLINES);
  const BUDGET_LABELS = new Map(BUDGETS);
  const CONTACT_LABELS = new Map(CONTACT_METHODS);
  const initialState = () => ({
    categories: [],
    otherCategory: '',
    links: [''],
    primaryGoal: '',
    description: '',
    deadlineType: '',
    deadlineDate: '',
    budgetRange: '',
    contactName: '',
    businessName: '',
    email: '',
    phone: '',
    preferredContactMethod: 'email',
    industry: '',
    location: '',
    referralSource: '',
    consentToContact: false,
    companyWebsite: '',
    startedAtMs: Date.now()
  });

  let state = initialState();
  let stepIndex = 0;
  let submitting = false;
  let initialized = false;
  let panel;
  let form;
  let errorNode;
  let liveNode;
  let progressBar;
  let progressTrack;
  let stepCount;
  let stepLabel;
  let controls;
  let backButton;
  let continueButton;

  function schedule(callback) {
    if (typeof global.requestAnimationFrame === 'function') global.requestAnimationFrame(callback);
    else callback();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function safePublicUrl(value) {
    try {
      const url = new URL(String(value || ''));
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
      return url.toString();
    } catch {
      return '';
    }
  }

  function isLikelyPublicUrl(value) {
    try {
      const raw = value.includes('://') ? value : `https://${value}`;
      const url = new URL(raw);
      const hostname = url.hostname.toLowerCase();
      return ['http:', 'https:'].includes(url.protocol)
        && !url.username
        && !url.password
        && hostname.includes('.')
        && hostname !== 'localhost'
        && !hostname.endsWith('.local');
    } catch {
      return false;
    }
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function announce(message) {
    if (!liveNode) return;
    liveNode.textContent = '';
    schedule(() => {
      liveNode.textContent = message;
    });
  }

  function track(event, step) {
    global.OTPFixlineAnalytics?.track?.(event, step);
  }

  function hideError() {
    errorNode.hidden = true;
    errorNode.textContent = '';
    panel.querySelectorAll('[aria-invalid="true"]').forEach((node) => {
      node.removeAttribute('aria-invalid');
      node.removeAttribute('aria-describedby');
    });
  }

  function showError(message, selector) {
    errorNode.textContent = message;
    errorNode.hidden = false;
    announce(message);
    const target = selector ? panel.querySelector(selector) : null;
    if (target) {
      target.setAttribute('aria-invalid', 'true');
      target.setAttribute('aria-describedby', 'form-error');
      target.focus();
    }
  }

  function choiceMarkup(type, name, value, label, checked, field) {
    const checkedAttribute = checked ? ' checked' : '';
    return `<label class="fixline-choice"><input type="${type}" name="${escapeHtml(name)}" value="${escapeHtml(value)}" data-field="${escapeHtml(field)}"${checkedAttribute}><span class="fixline-choice-mark" aria-hidden="true"></span><span>${escapeHtml(label)}</span></label>`;
  }

  function headingMarkup(title, helper, required = true) {
    return `<div class="fixline-step-heading"><div><h2 tabindex="-1">${escapeHtml(title)}</h2><p>${escapeHtml(helper)}</p></div>${required ? '<span class="fixline-required">Required</span>' : ''}</div>`;
  }

  function renderSurfaces() {
    const groups = CATEGORY_GROUPS.map((group) => {
      const items = group.items.map(([value, label]) => choiceMarkup('checkbox', 'categories', value, label, state.categories.includes(value), 'categories')).join('');
      const fullClass = group.label === 'Other' ? ' is-full' : '';
      return `<fieldset class="fixline-surface-group${fullClass}"><legend>${escapeHtml(group.label)}</legend><div class="fixline-choice-grid is-wide">${items}</div></fieldset>`;
    }).join('');
    const other = state.categories.includes('other')
      ? `<div class="fixline-field"><label for="other-category">Describe the other surface</label><input class="fixline-input" id="other-category" data-field="otherCategory" value="${escapeHtml(state.otherCategory)}" maxlength="120" autocomplete="off"><p class="fixline-helper">Use a public-facing name such as pitch deck, directory profile, or marketplace listing.</p></div>`
      : '';
    return `${headingMarkup('Where does your business show up publicly?', 'Select the surfaces connected to the signal you want reviewed. Choose up to six.')}<p class="fixline-selection-count">${state.categories.length} of 6 selected</p><div class="fixline-surface-groups">${groups}</div>${other}`;
  }

  function renderLinks() {
    const rows = state.links.map((link, index) => `<div class="fixline-link-row"><div class="fixline-field"><label class="sr-only" for="review-link-${index}">Public link ${index + 1}</label><input class="fixline-input" id="review-link-${index}" type="url" inputmode="url" autocomplete="url" placeholder="https://" data-link-index="${index}" value="${escapeHtml(link)}"></div><button class="fixline-remove-button" type="button" data-remove-link="${index}" aria-label="Remove public link ${index + 1}">Remove</button></div>`).join('');
    const addButton = state.links.length < 10 ? '<button class="fixline-text-button" type="button" data-add-link>+ Add another public link</button>' : '';
    return `${headingMarkup('Add the public links to review.', 'Include the website, profile, listing, video, booking path, or offer you want OTP to assess.')}<div class="fixline-link-list">${rows}</div>${addButton}<p class="fixline-helper">At least one public HTTP or HTTPS link is required. Never include private dashboards, passwords, tokens, or credentialed URLs.</p>`;
  }

  function renderDetails() {
    const options = GOALS.map(([value, label]) => `<option value="${value}"${state.primaryGoal === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
    return `${headingMarkup('What needs work?', 'Choose the primary outcome, then describe what feels weak, unclear, or costly.')}<div class="fixline-field-stack"><div class="fixline-field"><label for="primary-goal">Primary goal</label><select class="fixline-select" id="primary-goal" data-field="primaryGoal"><option value="">Select a goal</option>${options}</select></div><div class="fixline-field"><label for="description">Business context and concern</label><textarea class="fixline-textarea" id="description" data-field="description" minlength="20" maxlength="5000" placeholder="What are customers seeing, what feels wrong, and what outcome matters most?">${escapeHtml(state.description)}</textarea><p class="fixline-helper">Minimum 20 characters. Be concrete; the sharper the context, the sharper the review.</p></div></div>`;
  }

  function renderTiming() {
    const options = DEADLINES.map(([value, label]) => choiceMarkup('radio', 'deadlineType', value, label, state.deadlineType === value, 'deadlineType')).join('');
    const dateField = state.deadlineType === 'specific_date'
      ? `<div class="fixline-field"><label for="deadline-date">Deadline date</label><input class="fixline-input" id="deadline-date" type="date" data-field="deadlineDate" min="${new Date().toISOString().slice(0, 10)}" value="${escapeHtml(state.deadlineDate)}"></div>`
      : '';
    return `${headingMarkup('When do you need clarity?', 'Choose the timing that best describes the decision in front of you.')}<div class="fixline-choice-list">${options}</div>${dateField}<p class="fixline-helper">The standard FIXLINE response window is usually 2–4 business days. A date is context, not a guaranteed delivery promise.</p>`;
  }

  function renderBudget() {
    const options = BUDGETS.map(([value, label]) => choiceMarkup('radio', 'budgetRange', value, label, state.budgetRange === value, 'budgetRange')).join('');
    return `${headingMarkup('What implementation range feels realistic?', 'The review is diagnostic. This range helps OTP recommend a practical next move if implementation is appropriate.')}<div class="fixline-choice-list">${options}</div>`;
  }

  function renderContact() {
    const methodOptions = CONTACT_METHODS.map(([value, label]) => `<option value="${value}"${state.preferredContactMethod === value ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
    const checked = state.consentToContact ? ' checked' : '';
    return `${headingMarkup('Where should OTP send the findings?', 'Required fields are marked. Optional context helps the consultant understand the business.')}<div class="fixline-field-grid"><div class="fixline-field"><label for="contact-name">Full name</label><input class="fixline-input" id="contact-name" data-field="contactName" autocomplete="name" value="${escapeHtml(state.contactName)}"></div><div class="fixline-field"><label for="business-name">Business or brand</label><input class="fixline-input" id="business-name" data-field="businessName" autocomplete="organization" value="${escapeHtml(state.businessName)}"></div><div class="fixline-field"><label for="email">Email</label><input class="fixline-input" id="email" type="email" data-field="email" autocomplete="email" value="${escapeHtml(state.email)}"></div><div class="fixline-field"><label for="phone">Phone <span class="fixline-optional">(optional)</span></label><input class="fixline-input" id="phone" type="tel" data-field="phone" autocomplete="tel" value="${escapeHtml(state.phone)}"></div><div class="fixline-field"><label for="contact-method">Preferred contact</label><select class="fixline-select" id="contact-method" data-field="preferredContactMethod">${methodOptions}</select></div><div class="fixline-field"><label for="industry">Industry <span class="fixline-optional">(optional)</span></label><input class="fixline-input" id="industry" data-field="industry" value="${escapeHtml(state.industry)}"></div><div class="fixline-field"><label for="location">Location <span class="fixline-optional">(optional)</span></label><input class="fixline-input" id="location" data-field="location" autocomplete="address-level2" value="${escapeHtml(state.location)}"></div><div class="fixline-field"><label for="referral-source">How did you find OTP? <span class="fixline-optional">(optional)</span></label><input class="fixline-input" id="referral-source" data-field="referralSource" value="${escapeHtml(state.referralSource)}"></div></div><label class="fixline-consent"><input id="consent" type="checkbox" data-field="consentToContact"${checked}><span>I consent to OTP contacting me about this FIXLINE Review request.</span></label>`;
  }

  function reviewRow(label, value, editIndex) {
    return `<div class="fixline-review-row"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd><button class="fixline-edit-button" type="button" data-edit-step="${editIndex}" aria-label="Edit ${escapeHtml(label)}">Edit</button></div>`;
  }

  function renderReview() {
    const categories = state.categories.map((category) => category === 'other' ? state.otherCategory.trim() || 'Other' : CATEGORY_LABELS.get(category) || category).join(', ');
    const links = state.links.map((link) => link.trim()).filter(Boolean).join('\n');
    const timing = `${DEADLINE_LABELS.get(state.deadlineType) || state.deadlineType}${state.deadlineType === 'specific_date' && state.deadlineDate ? ` · ${state.deadlineDate}` : ''}`;
    const contact = [state.contactName, state.businessName, state.email, state.phone, `Preferred contact: ${CONTACT_LABELS.get(state.preferredContactMethod)}`].filter(Boolean).join('\n');
    return `${headingMarkup('Review your FIXLINE request.', 'Confirm the public signal and contact details before submitting.')}<dl class="fixline-review-list">${reviewRow('Surfaces', categories, 0)}${reviewRow('Public links', links, 1)}${reviewRow('Goal', GOAL_LABELS.get(state.primaryGoal), 2)}${reviewRow('Details', state.description.trim(), 2)}${reviewRow('Timing', timing, 3)}${reviewRow('Budget', BUDGET_LABELS.get(state.budgetRange), 4)}${reviewRow('Contact', contact, 5)}</dl><p class="fixline-submit-note">Submitting requests a consultant review. It does not authorize changes, publishing, account access, implementation, or payment.</p>`;
  }

  function renderStep(options = {}) {
    hideError();
    const renderers = [renderSurfaces, renderLinks, renderDetails, renderTiming, renderBudget, renderContact, renderReview];
    panel.innerHTML = renderers[stepIndex]();
    stepCount.textContent = `Step ${stepIndex + 1} of ${STEPS.length}`;
    stepLabel.textContent = STEPS[stepIndex][1];
    const progress = ((stepIndex + 1) / STEPS.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressTrack.setAttribute('aria-valuenow', String(stepIndex + 1));
    backButton.disabled = stepIndex === 0 || submitting;
    continueButton.disabled = submitting;
    continueButton.setAttribute('aria-busy', String(submitting));
    continueButton.innerHTML = submitting
      ? 'Submitting…'
      : stepIndex === STEPS.length - 1
        ? 'Submit My FIXLINE Review <span aria-hidden="true">→</span>'
        : 'Continue <span aria-hidden="true">→</span>';
    if (options.focusHeading) {
      schedule(() => panel.querySelector('h2')?.focus());
    }
  }

  function validateCurrentStep() {
    hideError();
    if (stepIndex === 0) {
      if (!state.categories.length) {
        showError('Choose at least one public surface.', 'input[name="categories"]');
        return false;
      }
      if (state.categories.includes('other') && !state.otherCategory.trim()) {
        showError('Describe the other public surface.', '#other-category');
        return false;
      }
    }
    if (stepIndex === 1) {
      const links = state.links.map((link) => link.trim()).filter(Boolean);
      if (!links.length) {
        showError('Add at least one public link for OTP to review.', '#review-link-0');
        return false;
      }
      const invalidIndex = state.links.findIndex((link) => link.trim() && !isLikelyPublicUrl(link.trim()));
      if (invalidIndex !== -1) {
        showError('Check that each link is a valid public HTTP or HTTPS URL.', `#review-link-${invalidIndex}`);
        return false;
      }
    }
    if (stepIndex === 2) {
      if (!state.primaryGoal) {
        showError('Choose the primary goal for this review.', '#primary-goal');
        return false;
      }
      if (state.description.trim().length < 20) {
        showError('Add at least 20 characters of business context.', '#description');
        return false;
      }
    }
    if (stepIndex === 3) {
      if (!state.deadlineType) {
        showError('Choose a timing option.', 'input[name="deadlineType"]');
        return false;
      }
      if (state.deadlineType === 'specific_date' && !state.deadlineDate) {
        showError('Choose the specific deadline date.', '#deadline-date');
        return false;
      }
    }
    if (stepIndex === 4 && !state.budgetRange) {
      showError('Choose the most realistic implementation range.', 'input[name="budgetRange"]');
      return false;
    }
    if (stepIndex === 5) {
      if (!state.contactName.trim()) {
        showError('Add your full name.', '#contact-name');
        return false;
      }
      if (!state.businessName.trim()) {
        showError('Add your business or brand name.', '#business-name');
        return false;
      }
      if (!isValidEmail(state.email.trim())) {
        showError('Add a valid email address.', '#email');
        return false;
      }
      if (!state.consentToContact) {
        showError('Consent is required so OTP can follow up about the review.', '#consent');
        return false;
      }
    }
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    track(stepIndex === 0 ? 'intake_started' : 'intake_step_completed', STEPS[stepIndex][0]);
    if (stepIndex === 1) state.links = state.links.map((link) => link.trim()).filter(Boolean);
    stepIndex = Math.min(stepIndex + 1, STEPS.length - 1);
    renderStep({ focusHeading: true });
    announce(`${STEPS[stepIndex][1]}, step ${stepIndex + 1} of ${STEPS.length}.`);
  }

  function goBack() {
    stepIndex = Math.max(0, stepIndex - 1);
    renderStep({ focusHeading: true });
    announce(`${STEPS[stepIndex][1]}, step ${stepIndex + 1} of ${STEPS.length}.`);
  }

  function buildPayload() {
    return {
      contactName: state.contactName.trim(),
      businessName: state.businessName.trim(),
      email: state.email.trim(),
      phone: state.phone.trim(),
      preferredContactMethod: state.preferredContactMethod,
      industry: state.industry.trim(),
      location: state.location.trim(),
      primaryGoal: state.primaryGoal,
      description: state.description.trim(),
      deadlineType: state.deadlineType,
      deadlineDate: state.deadlineDate,
      budgetRange: state.budgetRange,
      referralSource: state.referralSource.trim(),
      consentToContact: state.consentToContact,
      categories: [...state.categories],
      otherCategory: state.otherCategory.trim(),
      links: state.links.map((link) => link.trim()).filter(Boolean),
      companyWebsite: state.companyWebsite,
      startedAtMs: state.startedAtMs
    };
  }

  function renderSuccess(payload) {
    const safeTicket = escapeHtml(payload.ticketNumber || 'Reference unavailable');
    const categories = Array.isArray(payload.categories) ? payload.categories.map(escapeHtml).join(', ') : 'Submitted signal';
    const windowText = escapeHtml(payload.expectedReviewWindow || 'OTP will confirm timing by your selected contact method.');
    const communication = escapeHtml(CONTACT_LABELS.get(state.preferredContactMethod) || 'Email');
    const statusUrl = safePublicUrl(payload.statusUrl);
    const statusLink = statusUrl ? `<a href="${escapeHtml(statusUrl)}" rel="nofollow">Open your public status page</a>` : 'Status link unavailable';
    progressTrack.parentElement.hidden = true;
    controls.hidden = true;
    errorNode.hidden = true;
    panel.outerHTML = `<div id="intake-panel" class="fixline-success-card" role="status" aria-live="polite" tabindex="-1"><div class="fixline-success-icon" aria-hidden="true">✓</div><p class="fixline-system-label">SUBMISSION COMPLETE</p><h2>We received your FIXLINE request.</h2><p class="fixline-reference-label">Public-safe reference</p><p class="fixline-reference">${safeTicket}</p><dl class="fixline-success-details"><div><dt>Status</dt><dd>Received</dd></div><div><dt>Submitted surfaces</dt><dd>${categories}</dd></div><div><dt>Current stage</dt><dd>Structured for consultant review</dd></div><div><dt>Next step</dt><dd>An OTP consultant reviews the submitted public signal and prepares initial priorities.</dd></div><div><dt>Expected communication</dt><dd>${communication}</dd></div><div><dt>Response window</dt><dd>${windowText}</dd></div><div><dt>Public status</dt><dd>${statusLink}</dd></div></dl><p class="fixline-lifecycle-title">Review process</p><ol class="fixline-lifecycle"><li class="is-current">Received</li><li>Structured</li><li>Reviewing</li><li>Findings ready</li></ol><p class="fixline-process-note">This shows the standard review path. It is not a live status tracker.</p><div class="fixline-success-actions"><a class="fixline-button fixline-button-secondary" href="/fixline">Return to FIXLINE</a><button class="fixline-button fixline-button-primary" type="button" data-start-another>Start another review</button></div></div>`;
    panel = global.document.getElementById('intake-panel');
    panel.addEventListener('input', handlePanelInput);
    panel.addEventListener('change', handlePanelChange);
    panel.addEventListener('click', handlePanelClick);
    track('intake_submitted');
    announce(`FIXLINE request received. Public reference ${payload.ticketNumber || ''}.`);
    schedule(() => panel.focus());
  }

  async function submitReview() {
    if (submitting || !validateCurrentStep()) return;
    submitting = true;
    renderStep();
    announce('Submitting your FIXLINE Review request.');
    try {
      const response = await global.fetch('/fixline/api/review/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(buildPayload())
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        if (payload.code === 'duplicate_submission') track('duplicate_submission');
        showError(payload.message || 'The request could not be saved. Please review the form and try again.');
        return;
      }
      renderSuccess(payload);
    } catch {
      showError('The submission service is unavailable. Please try again shortly.');
    } finally {
      submitting = false;
      if (controls && !controls.hidden) renderStep();
    }
  }

  function resetIntake() {
    state = initialState();
    stepIndex = 0;
    submitting = false;
    panel = global.document.getElementById('intake-panel');
    progressTrack.parentElement.hidden = false;
    controls.hidden = false;
    renderStep({ focusHeading: true });
    announce('New FIXLINE intake started.');
  }

  function handlePanelInput(event) {
    const target = event.target;
    if (!(target instanceof global.HTMLElement)) return;
    if (target.matches('[data-link-index]')) {
      state.links[Number(target.dataset.linkIndex)] = target.value;
      hideError();
      return;
    }
    const field = target.dataset.field;
    if (!field || field === 'categories') return;
    state[field] = target.type === 'checkbox' ? target.checked : target.value;
    hideError();
    if (field === 'deadlineType') renderStep();
  }

  function handlePanelChange(event) {
    const target = event.target;
    if (!(target instanceof global.HTMLInputElement)) return;
    if (target.dataset.field !== 'categories') return;
    const value = target.value;
    if (target.checked && state.categories.length >= 6) {
      target.checked = false;
      showError('Choose up to six public surfaces. Remove one before selecting another.', `input[value="${value}"]`);
      return;
    }
    state.categories = target.checked
      ? state.categories.includes(value) ? state.categories : [...state.categories, value]
      : state.categories.filter((category) => category !== value);
    if (value === 'other' || stepIndex === 0) renderStep();
  }

  function handlePanelClick(event) {
    const target = event.target instanceof global.Element ? event.target.closest('button') : null;
    if (!target) return;
    if (target.hasAttribute('data-add-link')) {
      if (state.links.length < 10) state.links.push('');
      renderStep();
      schedule(() => panel.querySelector(`#review-link-${state.links.length - 1}`)?.focus());
      return;
    }
    if (target.hasAttribute('data-remove-link')) {
      const index = Number(target.dataset.removeLink);
      state.links = state.links.length === 1 ? [''] : state.links.filter((_, itemIndex) => itemIndex !== index);
      renderStep();
      return;
    }
    if (target.hasAttribute('data-edit-step')) {
      stepIndex = Number(target.dataset.editStep);
      renderStep({ focusHeading: true });
      return;
    }
    if (target.hasAttribute('data-start-another')) resetIntake();
  }

  function initialize() {
    if (initialized) return;
    form = global.document.getElementById('intake-form');
    panel = global.document.getElementById('intake-panel');
    if (!form || !panel) return;
    errorNode = global.document.getElementById('form-error');
    liveNode = global.document.getElementById('intake-live');
    progressBar = global.document.getElementById('progress-bar');
    progressTrack = global.document.querySelector('.fixline-progress-track');
    stepCount = global.document.getElementById('step-count');
    stepLabel = global.document.getElementById('step-label');
    controls = global.document.getElementById('intake-controls');
    backButton = global.document.getElementById('back-button');
    continueButton = global.document.getElementById('continue-button');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (stepIndex === STEPS.length - 1) submitReview();
      else goNext();
    });
    backButton.addEventListener('click', goBack);
    panel.addEventListener('input', handlePanelInput);
    panel.addEventListener('change', handlePanelChange);
    panel.addEventListener('click', handlePanelClick);
    global.document.getElementById('companyWebsite').addEventListener('input', (event) => {
      state.companyWebsite = event.target.value;
    });
    initialized = true;
    renderStep();
  }

  global.OTPFixlineIntake = Object.freeze({
    initialize,
    getState: () => JSON.parse(JSON.stringify(state)),
    renderSuccess,
    reset: resetIntake
  });

  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
})(typeof window !== 'undefined' ? window : globalThis);
