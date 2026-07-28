import {
  BUSINESS_WEBSITE,
  PORTAL_FALLBACK_MESSAGE,
  cleanPortalToken as sharedCleanPortalToken,
  cleanPortalValue,
  formatPortalDate,
  normalizePortalPayload,
  portalReferenceLabel,
  safePortalUrl
} from './client-portal-utils.js';
import { buildClientPortalViewV2 } from './client-portal-v2.js';
import { renderClientPortalViewV2 } from './client-portal-v2-renderer.js';

// Locked until payment is saved

const portalRoot = document.getElementById('portal-root');
const portalStatus = document.getElementById('portal-status');
const businessWebsite = BUSINESS_WEBSITE;
const supportEmail = 'contact@onlytrueperspective.tech';

function clean(value = '') {
  return cleanPortalValue(value);
}

function tokenFromLocation() {
  const params = new URLSearchParams(window.location.search);
  const queryToken = clean(params.get('token') || params.get('portalToken') || params.get('portal_token') || '');
  if (queryToken) return queryToken;
  const parts = window.location.pathname.split('/').filter(Boolean);
  if ((parts[0] === 'client' || parts[0] === 'portal') && parts[1]) {
    try {
      return decodeURIComponent(parts[1]);
    } catch {
      return parts[1];
    }
  }
  return '';
}

function cleanPortalToken(value = '') {
  return sharedCleanPortalToken(value);
}

function isLocalOrigin() {
  return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(window.location.hostname);
}

function apiBase() {
  const configured = clean(document.querySelector('meta[name="otp-api-base"]')?.content || '').replace(/\/+$/, '');
  if (isLocalOrigin()) return window.location.origin;
  if (configured) return configured;
  if (['onlytrueperspective.tech', 'www.onlytrueperspective.tech'].includes(window.location.hostname)) return window.location.origin;
  if (/^https?:$/i.test(window.location.protocol)) return window.location.origin;
  return businessWebsite;
}

function apiUrl(path = '') {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBase()}${path.startsWith('/') ? '' : '/'}${path}`;
}

function safeLinkUrl(url = '', { allowMailto = false } = {}) {
  const safeUrl = safePortalUrl(url, { allowMailto });
  if (safeUrl.startsWith('/api/client/portal/')) return apiUrl(safeUrl);
  return safeUrl;
}

async function fetchPortal(token) {
  const response = await fetch(apiUrl(`/api/client-portal/${encodeURIComponent(token)}`), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw portalUnavailableError(data);
  }
  return data;
}

async function fetchAccountConfig() {
  const response = await fetch(apiUrl('/api/client/account/config'), {
    headers: { Accept: 'application/json' }
  });
  return response.json().catch(() => ({}));
}

async function fetchDashboard(token) {
  const response = await fetch(apiUrl(`/api/client/account/dashboard?token=${encodeURIComponent(token)}`), {
    headers: { Accept: 'application/json' },
    credentials: 'include'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw portalUnavailableError(data);
  }
  return data;
}

async function postJson(path, body = {}) {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function setStatus(text, mode = '') {
  if (!portalStatus) return;
  portalStatus.textContent = text;
  portalStatus.className = `status-pill ${mode}`.trim();
}

function portalUnavailableError(data = {}) {
  const code = clean(data.errorCode || data.error_code || '');
  const detail = clean(data.message || '');
  const message = code === 'portal_token_expired' || code === 'expired'
    ? 'This private portal invite has expired. Request a fresh OTP portal link.'
    : code === 'portal_token_revoked' || code === 'revoked'
      ? 'This private portal invite is no longer active. Request a fresh OTP portal link.'
      : detail || PORTAL_FALLBACK_MESSAGE;
  const error = new Error(message);
  error.errorCode = code;
  error.detail = detail;
  return error;
}

function infoRow(label, value) {
  const text = clean(value);
  if (!text) return null;
  const row = el('div', 'info-row');
  row.append(el('span', '', label), el('strong', '', text));
  return row;
}

function humanDate(value = '') {
  return formatPortalDate(value);
}

function friendlyPackage(value = '') {
  const raw = clean(value);
  const key = raw.toLowerCase();
  if (!raw) return '';
  if (key.includes('signal')) return 'The Signal';
  if (key.includes('engine')) return 'The Engine';
  if (key.includes('system')) return 'The System';
  if (key.includes('custom')) return 'The System';
  if (/video|content|reel|shoot|promo|music/.test(key)) return raw.includes('Package') ? raw : `${raw} Package`;
  return raw;
}

function displayPaymentStatus(value = '') {
  const raw = clean(value) || 'Unpaid';
  if (/deposit|partial/i.test(raw)) return 'Partially Paid';
  if (/paid in full|^paid$/i.test(raw)) return 'Paid';
  return raw;
}

function badgeMode(label = '') {
  if (/paid|completed|ready/i.test(label)) return 'ready';
  if (/unpaid|due|pending|review/i.test(label)) return 'warning';
  return '';
}

function projectLinkRow(label, url, buttonLabel) {
  const safeUrl = safeLinkUrl(url);
  if (!safeUrl) return null;
  const row = el('div', 'info-row action-row');
  row.append(el('span', '', label), buttonLink(buttonLabel, safeUrl, true));
  return row;
}

function card(title, rows = [], className = '') {
  const section = el('section', `card ${className}`.trim());
  section.append(el('h3', '', title));
  const list = el('div', 'info-list');
  rows.filter(Boolean).forEach((row) => list.append(row));
  if (!list.children.length) list.append(el('p', 'empty', 'No details posted yet.'));
  section.append(list);
  return section;
}

function entryActionCard(title, body, children = []) {
  const section = el('section', 'card entry-card');
  section.append(el('h3', '', title), el('p', 'entry-copy', body));
  children.filter(Boolean).forEach((child) => section.append(child));
  return section;
}

function field(label, input) {
  const wrapper = el('label', 'portal-field');
  wrapper.append(el('span', '', label), input);
  return wrapper;
}

function input(name, type = 'text', placeholder = '') {
  const node = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  node.name = name;
  if (type !== 'textarea') node.type = type;
  node.placeholder = placeholder;
  return node;
}

function badge(text, mode = '') {
  return el('span', `badge ${mode}`.trim(), clean(text));
}

function buttonLink(label, url, secondary = false, options = {}) {
  const safeUrl = safeLinkUrl(url, options);
  if (!safeUrl) {
    const disabled = el('button', `button-link ${secondary ? 'secondary' : ''}`.trim(), label);
    disabled.disabled = true;
    return disabled;
  }

  const link = el('a', `button-link ${secondary ? 'secondary' : ''}`.trim(), label);
  link.href = safeUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function referenceLabel(url = '') {
  return portalReferenceLabel(url);
}

async function copyText(text = '') {
  const value = clean(text);
  if (!value) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fall back to the hidden textarea path below.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

function documentItem(document = {}) {
  const ready = Boolean(document.ready);
  const item = el('article', 'document-item');
  const top = el('div', 'document-top');
  const actions = el('div', 'document-actions');
  top.append(el('strong', '', clean(document.label) || 'Document'), badge(ready ? 'Available' : 'In preparation', ready ? 'ready' : ''));
  item.append(top, el('p', '', clean(document.message) || (ready ? 'Ready to view or download.' : 'OTP is preparing this document.')));
  if (ready && document.viewUrl) actions.append(buttonLink('View', document.viewUrl, true));
  if (ready && document.downloadUrl) actions.append(buttonLink('Download', document.downloadUrl));
  if (!ready) {
    const disabled = el('button', 'secondary', 'Awaiting OTP');
    disabled.disabled = true;
    actions.append(disabled);
  }
  item.append(actions);
  return item;
}

function documentsCard(documents = []) {
  const section = el('section', 'card');
  const list = el('div', 'document-list');
  section.append(el('h3', '', 'Documents'));
  documents.forEach((document) => list.append(documentItem(document)));
  if (!documents.length) list.append(el('p', 'empty', 'Documents not ready yet.'));
  section.append(list);
  return section;
}

function projectsCard(projects = []) {
  const section = el('section', 'card');
  const list = el('div', 'document-list');
  section.append(el('h3', '', 'Projects'));
  projects.forEach((project) => {
    const item = el('article', 'document-item');
    const top = el('div', 'document-top');
    const actions = el('div', 'document-actions');
    top.append(el('strong', '', clean(project.title) || 'Project details pending'), badge(clean(project.status) || 'Pending Review', badgeMode(project.status)));
    item.append(top, el('p', '', [project.projectType, project.service, friendlyPackage(project.package), displayPaymentStatus(project.paymentStatus), project.nextStep].map(clean).filter(Boolean).join(' / ')));
    if (project.openUrl) actions.append(buttonLink('View Project Link', project.openUrl, true));
    item.append(actions);
    list.append(item);
  });
  if (!projects.length) list.append(el('p', 'empty', 'Project details pending.'));
  section.append(list);
  return section;
}

function deliverablesCard(project = {}) {
  const section = el('section', 'card');
  const list = el('div', 'document-list deliverable-list');
  const deliverables = Array.isArray(project.deliverables) ? project.deliverables : [];
  section.append(el('h3', '', 'Deliverables'));

  deliverables.forEach((deliverable) => {
    const item = el('article', 'document-item deliverable-item');
    const top = el('div', 'document-top');
    const actions = el('div', 'document-actions');
    top.append(el('strong', '', clean(deliverable.name) || 'Deliverable'), badge(clean(deliverable.status) || 'Not Started', badgeMode(deliverable.status)));
    item.append(top, el('p', '', [
      deliverable.type,
      deliverable.dueDate ? `Due ${humanDate(deliverable.dueDate)}` : '',
      deliverable.clientNotes,
      Number(deliverable.revisionCount || 0) ? `${deliverable.revisionCount} revisions` : ''
    ].map(clean).filter(Boolean).join(' / ') || 'OTP will update this deliverable as work moves forward.'));
    if (deliverable.assetUrl) actions.append(buttonLink('Open Asset', deliverable.assetUrl, true));
    item.append(actions);
    list.append(item);
  });

  if (!deliverables.length) list.append(el('p', 'empty', 'Deliverables will appear here when OTP enables them for this project.'));
  section.append(list);
  return section;
}

function retainerCard(retainer = {}) {
  if (!retainer.visible) return null;
  const section = el('section', 'card');
  const overview = el('div', 'info-list retainer-overview');
  const list = el('div', 'document-list deliverable-list');
  section.append(el('h3', '', 'Monthly Retainer'));
  [
    infoRow('Status', retainer.status),
    infoRow('Services', (retainer.servicesIncluded || []).join(', ')),
    infoRow('Next Milestone', retainer.nextMilestone?.label),
    infoRow('Milestone Due', humanDate(retainer.nextMilestone?.dueDate)),
    infoRow('Next Invoice', humanDate(retainer.nextInvoiceDate))
  ].filter(Boolean).forEach((row) => overview.append(row));
  section.append(overview);
  (retainer.monthlyDeliverables || []).forEach((deliverable) => {
    const item = el('article', 'document-item deliverable-item');
    const top = el('div', 'document-top');
    const actions = el('div', 'document-actions');
    top.append(el('strong', '', clean(deliverable.name) || 'Monthly deliverable'), badge(clean(deliverable.status) || 'Not Started', badgeMode(deliverable.status)));
    item.append(top, el('p', '', [deliverable.dueDate ? `Due ${humanDate(deliverable.dueDate)}` : '', deliverable.clientNotes].map(clean).filter(Boolean).join(' / ') || 'OTP will update this monthly deliverable.'));
    if (deliverable.assetUrl) actions.append(buttonLink('Open Asset', deliverable.assetUrl, true));
    item.append(actions);
    list.append(item);
  });
  if (!list.children.length) list.append(el('p', 'empty', 'Monthly deliverables will appear here when scheduled.'));
  section.append(list);
  return section;
}

function paymentCard(payment = {}) {
  const section = el('section', 'card');
  const amounts = el('div', 'payment-amount');
  const actions = el('div', 'payment-actions');
  const rows = el('div', 'info-list');
  section.append(el('h3', '', 'Payment'));
  [
    ['Amount Due', payment.amountDue],
    ['Deposit Due', payment.depositDue],
    ['Amount Paid', payment.amountPaid]
  ].forEach(([label, value]) => {
    const tile = el('div', 'money-tile');
    tile.append(el('span', '', label), el('strong', '', clean(value) || '$0.00'));
    amounts.append(tile);
  });
  [
    infoRow('Status', displayPaymentStatus(payment.status)),
    infoRow('Method', payment.method),
    infoRow('Paid At', humanDate(payment.paidAt)),
    infoRow('Payment Step', payment.paymentLink ? 'Secure link ready' : (payment.paymentLinkStatus || 'Payment step not ready yet')),
    infoRow('Manual Note', payment.manualPaymentNote)
  ].filter(Boolean).forEach((row) => rows.append(row));
  if (payment.paymentLink) actions.append(buttonLink('Open Secure Payment Link', payment.paymentLink));
  section.append(amounts, rows);
  if (actions.children.length) section.append(actions);
  return section;
}

function nextStepCard(nextStep = {}, followUp = {}, contact = {}) {
  const section = el('section', 'card next-step');
  const actions = el('div', 'next-actions');
  section.append(el('h3', '', 'Next Step'));
  section.append(el('p', '', clean(nextStep.message) || 'OTP is reviewing your project.'));
  if (followUp.message) {
    const copy = el('button', 'secondary', 'Copy Message');
    copy.addEventListener('click', async () => {
      copy.textContent = await copyText(followUp.message) ? 'Copied' : 'Copy Failed';
    });
    actions.append(copy);
  }
  if (contact.email) actions.append(buttonLink('Message OTP', `mailto:${contact.email}`, true, { allowMailto: true }));
  actions.append(buttonLink('Visit OnlyTruePerspective', contact.website || businessWebsite, true));
  if (actions.children.length) section.append(actions);
  return section;
}

function approvalsCard(token = '', approvals = [], client = {}) {
  const section = el('section', 'card');
  const list = el('div', 'document-list');
  section.append(el('h3', '', 'Approvals'));

  approvals.forEach((approval) => {
    const item = el('article', 'document-item');
    const top = el('div', 'document-top');
    const actions = el('div', 'document-actions');
    top.append(el('strong', '', approval.label || 'Approval'), badge(approval.approved ? 'Approved' : 'Needs approval', approval.approved ? 'ready' : 'warning'));
    item.append(top, el('p', '', approval.approved
      ? `Approved ${humanDate(approval.approvedAt)}${approval.approvedBy ? ` by ${approval.approvedBy}` : ''}`
      : 'Review this step with OTP before approving.'));
    if (!approval.approved) {
      const approve = el('button', 'secondary', 'Approve');
      approve.addEventListener('click', async () => {
        approve.disabled = true;
        try {
          await postJson('/api/client/account/approvals', {
            token,
            approval_type: approval.type,
            client_email: client.email || ''
          });
          approve.textContent = 'Approved';
          setStatus('Approval Saved', 'ready');
          renderDashboard(await fetchDashboard(token), token);
        } catch (error) {
          approve.disabled = false;
          setStatus(error.message || 'Approval failed', 'error');
        }
      });
      actions.append(approve);
    }
    item.append(actions);
    list.append(item);
  });

  if (!approvals.length) list.append(el('p', 'empty', 'Approvals will appear here when OTP enables them for this project.'));
  section.append(list);
  return section;
}

function referencesCard(token = '', references = {}) {
  const section = el('section', 'card');
  const form = el('form', 'portal-form');
  const referenceInput = input('reference_url', 'url', 'https://youtube.com/...');
  const notesInput = input('notes', 'textarea', 'Notes for OTP');
  const submit = el('button', '', 'Send Reference');
  const status = el('p', 'entry-copy', references.message || 'Add safe public reference links or notes for OTP.');

  section.append(el('h3', '', 'References'));
  if (references.existingReferenceLink) {
    section.append(projectLinkRow('Current Reference', references.existingReferenceLink, referenceLabel(references.existingReferenceLink)));
  }
  form.append(
    field('Reference Link', referenceInput),
    field('Notes', notesInput),
    submit
  );
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    try {
      await postJson('/api/client/account/references', {
        token,
        reference_url: referenceInput.value,
        notes: notesInput.value
      });
      referenceInput.value = '';
      notesInput.value = '';
      status.textContent = 'Reference saved for OTP.';
      setStatus('Reference Saved', 'ready');
    } catch (error) {
      setStatus(error.message || 'Reference failed', 'error');
    } finally {
      submit.disabled = false;
    }
  });
  section.append(status, form);
  return section;
}

function renderDashboard(data, token = '') {
  const { portal, client, project, retainer, documents, payment, nextStep, followUp, contact, projects, approvals, references, account } = normalizePortalPayload(data);
  const view = buildClientPortalViewV2(data, { now: portal.lastUpdated });
  const { masthead, grid, footer } = renderClientPortalViewV2(view);
  const visibleRetainerCard = retainerCard(retainer);
  if (visibleRetainerCard) grid.append(visibleRetainerCard);
  grid.append(
    approvalsCard(token, approvals, client),
    referencesCard(token, references),
    nextStepCard(nextStep, followUp, contact)
  );

  portalRoot.replaceChildren(masthead, grid, footer);
  setStatus('Portal Active', 'ready');
}

function renderPortal(data) {
  renderDashboard(data, tokenFromLocation());
}

function renderEntry(config = {}) {
  const hero = el('section', 'hero portal-entry-hero');
  const grid = el('div', 'grid');
  const inviteForm = el('form', 'portal-form');
  const requestForm = el('form', 'portal-form');
  const tokenInput = input('token', 'text', 'Paste portal invite token');
  const emailInput = input('email', 'email', 'client@example.com');
  const nameInput = input('name', 'text', 'Your name');
  const messageInput = input('message', 'textarea', 'Project or booking details');
  const inviteButton = el('button', '', 'Open Invite');
  const requestButton = el('button', 'secondary', 'Request Access');
  const stagedLogin = el('button', 'secondary', 'Account Login Staged');
  const stagedSignup = el('button', 'secondary', 'Create Account Staged');
  const authMessage = config.accountAuth?.message || 'Use a private portal invite or request access.';

  stagedLogin.type = 'button';
  stagedLogin.disabled = true;
  stagedLogin.setAttribute('aria-disabled', 'true');
  stagedSignup.type = 'button';
  stagedSignup.disabled = true;
  stagedSignup.setAttribute('aria-disabled', 'true');

  hero.append(
    el('p', 'eyebrow', 'OnlyTruePerspective'),
    el('h2', '', 'Client Portal'),
    el('p', '', 'Access project status, documents, invoices, payment steps, and approvals.')
  );

  inviteForm.append(field('Portal Invite', tokenInput), inviteButton);
  inviteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const token = cleanPortalToken(tokenInput.value);
    if (!token) {
      setStatus('Invalid Invite', 'error');
      return;
    }
    window.location.href = `/client/${encodeURIComponent(token)}`;
  });

  requestForm.append(
    field('Email', emailInput),
    field('Name', nameInput),
    field('Message', messageInput),
    requestButton
  );
  requestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    requestButton.disabled = true;
    try {
      await postJson('/api/client/account/request-access', {
        email: emailInput.value,
        name: nameInput.value,
        message: messageInput.value,
        portal_token: cleanPortalToken(tokenInput.value)
      });
      setStatus('Request Sent', 'ready');
      requestButton.textContent = 'Request Sent';
    } catch (error) {
      setStatus(error.message || 'Request failed', 'error');
      requestButton.disabled = false;
    }
  });

  grid.append(
    entryActionCard('Log In', authMessage, [stagedLogin]),
    entryActionCard('Create Account', 'Client account creation is enabled after OTP connects your booking invite.', [stagedSignup]),
    entryActionCard('Have a portal invite?', 'Open an existing private OTP portal invite.', [inviteForm]),
    entryActionCard('Request Access', 'Use this if you booked with OTP but do not have your invite link yet.', [requestForm]),
    entryActionCard('Book OTP', 'Start a new booking request on OnlyTruePerspective.', [buttonLink('Book OTP', config.bookingUrl || `${businessWebsite}/bookings`)])
  );

  portalRoot.replaceChildren(hero, grid);
  setStatus('Public Entry', 'warning');
}

function renderError(message = PORTAL_FALLBACK_MESSAGE) {
  const card = el('section', 'error-card');
  const actions = el('div', 'next-actions');
  actions.append(
    buttonLink('Contact OTP', `mailto:${supportEmail}`, true, { allowMailto: true }),
    buttonLink('Open Main Site', businessWebsite, true)
  );
  card.append(
    el('strong', '', 'Portal unavailable'),
    el('p', '', clean(message) || PORTAL_FALLBACK_MESSAGE),
    actions
  );
  portalRoot.replaceChildren(card);
  setStatus('Unavailable', 'error');
}

function handleFatalPortalError(error) {
  const message = clean(error?.message || error) || PORTAL_FALLBACK_MESSAGE;
  renderError(message);
}

async function init() {
  const token = tokenFromLocation();
  if (!token) {
    renderEntry(await fetchAccountConfig().catch(() => ({})));
    return;
  }

  try {
    renderDashboard(await fetchDashboard(token), token);
  } catch (dashboardError) {
    try {
      renderPortal(await fetchPortal(token));
    } catch (portalError) {
      renderError(portalError.message || dashboardError.message || PORTAL_FALLBACK_MESSAGE);
    }
  }
}

window.addEventListener('error', (event) => {
  if (!portalRoot) return;
  handleFatalPortalError(event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  if (!portalRoot) return;
  handleFatalPortalError(event.reason);
});

init().catch((error) => handleFatalPortalError(error));
