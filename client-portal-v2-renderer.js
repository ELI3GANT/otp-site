function node(tag, className = '', value = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value) element.textContent = value;
  return element;
}

const iconPaths = Object.freeze({
  overview: ['M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5M9 21v-7h6v7'],
  phase: ['M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M18.36 5.64l-1.42 1.42M7.06 16.94l-1.42 1.42M12 8v4l2.5 1.5'],
  next: ['M5 12h14M13 6l6 6-6 6'],
  project: ['M4 5h16v14H4zM8 9h8M8 13h5'],
  documents: ['M7 3h8l4 4v14H5V3h2zM15 3v5h5M8 12h8M8 16h8'],
  billing: ['M3 7h18v13H3zM3 10h18M7 16h3'],
  timeline: ['M5 5h14M5 12h14M5 19h14M8 5v.01M8 12v.01M8 19v.01'],
  delivery: ['M4 7h10v12H4zM14 11h3l3 3v5h-6zM7 19a2 2 0 1 0 4 0M16 19a2 2 0 1 0 4 0'],
  support: ['M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9.6 9a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2-2.4 4M12 17h.01'],
  pending: ['M12 8v4l2.5 1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
  ready: ['M5 12l4 4L19 6'],
  warning: ['M12 8v5M12 17h.01M10.3 4.7 2.9 18a2 2 0 0 0 1.8 3h14.6a2 2 0 0 0 1.8-3L13.7 4.7a2 2 0 0 0-3.4 0z'],
});

function icon(name, className = 'portal-ui-icon') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (className) svg.setAttribute('class', className);
  for (const d of iconPaths[name] || iconPaths.pending) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function money(value) {
  if (!Number.isFinite(value)) return 'Under review';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}

function readableDate(value = '') {
  if (!value) return 'Not scheduled';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(parsed);
}

function statusMode(value = '') {
  if (/^(scope reviewed|scope confirmed)$/i.test(value.trim())) return 'ready';
  if (/unpaid|unavailable|not available|awaiting|partial|review|due|current|pending|upcoming|progress|not ready/i.test(value)) return 'warning';
  if (/complete|^paid$|paid in full|deposit paid|available|ready|received|approved|confirmed|signed|active/i.test(value)) return 'ready';
  return '';
}

function statusChip(value = '') {
  const label = value || 'Pending review';
  const mode = statusMode(label);
  const chip = node('span', `badge ${mode}`.trim());
  chip.append(icon(mode === 'ready' ? 'ready' : mode === 'warning' ? 'warning' : 'pending', 'portal-status-icon'), node('span', '', label));
  return chip;
}

function safeLink(label, href, secondary = true) {
  const link = node('a', `button-link ${secondary ? 'secondary' : ''}`.trim(), label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.referrerPolicy = 'no-referrer';
  return link;
}

function pdfIcon(kind = 'preview') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.7');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', kind === 'download'
    ? 'M12 3v11m0 0 4-4m-4 4-4-4M5 18v3h14v-3'
    : 'M8 3h7l4 4v14H8zM15 3v5h5M11 13h5M11 17h5');
  svg.append(path);
  return svg;
}

function portalDocumentActionLink(label, href, kind = 'preview', secondary = false, accessibleLabel = label) {
  const link = safeLink(label, href, secondary);
  link.prepend(pdfIcon(kind));
  link.setAttribute('aria-label', accessibleLabel);
  link.title = accessibleLabel;
  if (kind === 'download') {
    link.removeAttribute('target');
    link.setAttribute('download', '');
  }
  link.classList.add('document-pdf-action');
  return link;
}

function sectionCard(title, className = '', iconName = 'overview') {
  const section = node('section', `card portal-v2-card ${className}`.trim());
  const heading = node('h2', 'portal-v2-section-title', title);
  heading.prepend(icon(iconName));
  section.setAttribute('aria-labelledby', `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-title`);
  heading.id = section.getAttribute('aria-labelledby');
  section.append(heading);
  return section;
}

function valueRow(label, value) {
  const row = node('div', 'portal-v2-value-row');
  row.append(node('span', '', label), node('strong', '', value));
  return row;
}

function overviewCard(view) {
  const card = sectionCard('Overview', 'portal-v2-overview', 'overview');
  const phase = node('div', 'portal-v2-brief-status');
  phase.append(
    node('span', 'portal-v2-overline', 'Phase'),
    node('strong', '', view.overview.currentPhase)
  );
  const next = node('div', 'portal-v2-focus-action');
  next.append(
    node('span', 'portal-v2-overline', 'Next'),
    node('p', '', view.overview.nextClientAction)
  );

  const details = document.createElement('details');
  details.className = 'portal-v2-disclosure';
  details.append(node('summary', '', 'Project details'));
  const content = node('div', 'portal-v2-disclosure-content');
  content.append(
    node('p', 'portal-v2-summary', view.overview.summary),
    valueRow('Project', view.overview.projectTitle),
    valueRow('Job type', view.overview.jobType),
    valueRow('Service', view.overview.service),
    valueRow('OTP support', view.contact.email)
  );
  details.append(content);
  card.append(phase, next, details);
  return card;
}

function documentsCard(view) {
  const card = sectionCard('Documents', '', 'documents');
  const list = node('div', 'portal-v2-document-list');
  for (const document of view.documents) {
    const item = node('article', 'portal-v2-document');
    const heading = node('div', 'portal-v2-document-heading');
    const identity = node('div', 'portal-v2-document-identity');
    const actions = node('div', 'portal-v2-actions');
    identity.append(icon('documents', 'portal-document-icon'), node('strong', '', document.label));
    heading.append(identity, statusChip(document.status));
    item.append(heading);
    if (document.message) item.append(node('p', '', document.message));
    if (document.freshnessLabel) item.append(node('small', 'portal-v2-document-freshness', document.freshnessLabel));
    if (document.viewUrl) actions.append(portalDocumentActionLink('View', document.viewUrl, 'preview', true, `View ${document.label}`));
    if (document.downloadUrl) actions.append(portalDocumentActionLink('PDF', document.downloadUrl, 'download', false, `Download PDF for ${document.label}`));
    if (actions.children.length) item.append(actions);
    list.append(item);
  }
  if (!view.documents.length) {
    list.append(node('p', 'portal-v2-empty', 'No documents are available yet. OTP will add them after review.'));
  }
  card.append(list);
  return card;
}

function paymentCard(view) {
  const payment = view.payment;
  const card = sectionCard('Payment', `portal-v2-payment ${payment.manualReviewRequired ? 'needs-review' : ''}`, 'billing');
  const amounts = node('div', 'portal-v2-money-grid');
  [
    ['Project investment', money(payment.totalCents)],
    ['Deposit', money(payment.depositCents)],
    ['Paid', money(payment.amountPaidCents)],
    ['Remaining balance', money(payment.balanceCents)]
  ].forEach(([label, value]) => amounts.append(valueRow(label, value)));
  const actions = node('div', 'portal-v2-actions');
  if (payment.paymentLink) actions.append(safeLink('Open reviewed payment link', payment.paymentLink, false));
  card.append(
    statusChip(payment.stateLabel),
    amounts,
    valueRow('Due date', readableDate(payment.dueDate)),
    valueRow('Receipt status', payment.receiptStatus),
    node('p', 'portal-v2-summary', payment.message),
    node('p', 'portal-v2-next-action', `Next: ${payment.nextAction}`)
  );
  if (actions.children.length) card.append(actions);
  return card;
}

function timelineCard(view) {
  const card = sectionCard('Timeline', '', 'timeline');
  const timeline = node('ol', 'portal-timeline');
  for (const step of view.timeline) {
    const item = node('li', `portal-timeline-step ${step.status.toLowerCase()}`);
    const marker = node('span', 'portal-timeline-marker');
    const content = node('div', 'portal-timeline-content');
    const top = node('div', 'portal-timeline-heading');
    marker.setAttribute('aria-hidden', 'true');
    top.append(node('strong', '', step.label), statusChip(step.status));
    content.append(top);
    if (step.date) content.append(node('p', '', readableDate(step.date)));
    if (step.description) content.append(node('p', '', step.description));
    item.append(marker, content);
    timeline.append(item);
  }
  card.append(timeline);
  return card;
}

function deliveryCard(view) {
  const delivery = view.delivery;
  const card = sectionCard('Delivery', '', 'delivery');
  const items = node('div', 'portal-v2-document-list');
  card.append(statusChip(delivery.status), node('p', 'portal-v2-summary', delivery.nextStep));
  for (const deliverable of delivery.deliverables) {
    const item = node('article', 'portal-v2-document');
    const heading = node('div', 'portal-v2-document-heading');
    heading.append(node('strong', '', deliverable.name), statusChip(deliverable.status));
    item.append(heading);
    if (deliverable.clientNotes) item.append(node('p', '', deliverable.clientNotes));
    if (deliverable.dueDate) item.append(node('p', '', `Target: ${readableDate(deliverable.dueDate)}`));
    if (deliverable.assetUrl) item.append(safeLink('Open approved deliverable', deliverable.assetUrl));
    items.append(item);
  }
  const actions = node('div', 'portal-v2-actions');
  delivery.links.forEach((item) => actions.append(safeLink(item.label, item.url)));
  if (delivery.proofUrl) actions.append(safeLink('View approved project proof', delivery.proofUrl));
  if (!delivery.deliverables.length && !actions.children.length) {
    items.append(node('p', 'portal-v2-empty', 'This section will update after OTP reviews your delivery items.'));
  }
  card.append(items, valueRow('Proof status', delivery.proofStatus));
  if (actions.children.length) card.append(actions);
  return card;
}

function projectsCard(view) {
  const projects = view.otherProjects || [];
  if (projects.length < 2) return null;
  const card = sectionCard('Projects', 'portal-v2-projects', 'project');
  const list = node('div', 'portal-v2-document-list');
  for (const project of projects) {
    const item = node('article', `portal-v2-document${project.isCurrent ? ' is-current' : ''}`);
    const heading = node('div', 'portal-v2-document-heading');
    heading.append(node('strong', '', project.title), statusChip(project.status));
    item.append(heading);
    if (project.service) item.append(node('p', '', project.service));
    if (project.isCurrent) item.append(node('p', 'portal-v2-current-label', 'Currently viewing'));
    list.append(item);
  }
  card.append(list);
  return card;
}

function assistantCard(view) {
  const card = sectionCard('Help', 'portal-v2-assistant', 'support');
  const promptText = node('p', 'portal-v2-summary', 'Ask about your project, payment, or files.');
  const inputGroup = node('div', 'portal-v2-actions');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'portal-v2-assistant-input';
  input.placeholder = 'Ask about your project';
  input.id = 'portal-project-help';
  const label = node('label', 'portal-v2-help-label', 'Question');
  label.htmlFor = input.id;

  const askBtn = node('button', 'button-link', 'Ask');
  askBtn.type = 'button';

  const responseBox = node('div', 'portal-v2-assistant-response');
  responseBox.hidden = true;
  responseBox.setAttribute('role', 'status');

  function handleAsk() {
    const query = input.value.trim().toLowerCase();
    if (!query) return;
    responseBox.hidden = false;

    if (query.includes('status') || query.includes('phase') || query.includes('milestone')) {
      responseBox.textContent = `Your project is currently in the ${view.overview.currentPhase} phase. Status: ${view.overview.status}. Next action: ${view.overview.nextClientAction}`;
    } else if (query.includes('pay') || query.includes('deposit') || query.includes('invoice') || query.includes('money') || query.includes('cost')) {
      responseBox.textContent = `Payment state: ${view.payment.stateLabel}. Receipt status: ${view.payment.receiptStatus}. ${view.payment.message}`;
    } else if (query.includes('deliverable') || query.includes('file') || query.includes('link') || query.includes('download') || query.includes('proof')) {
      responseBox.textContent = `Delivery proof status: ${view.delivery.proofStatus}. ${view.delivery.nextStep}`;
    } else {
      responseBox.textContent = `Your ${view.identity.projectTitle} project is currently ${view.overview.status}. Contact OTP support at ${view.contact.email} for custom requests.`;
    }
  }

  askBtn.addEventListener('click', handleAsk);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAsk();
    }
  });

  inputGroup.append(input, askBtn);
  card.append(promptText, label, inputGroup, responseBox, safeLink('Contact OTP', `mailto:${view.contact.email}`));
  return card;
}

export function renderClientPortalViewV2(view) {
  const masthead = node('section', 'hero portal-v2-masthead');
  const mastheadTop = node('div', 'portal-v2-masthead-top');
  const identity = node('div', 'portal-v2-client-identity');
  const businessName = view.identity.clientBusinessName;
  identity.append(
    node('h2', '', view.identity.clientName),
    node('p', 'portal-v2-project-title', [businessName, view.identity.projectTitle].filter(Boolean).join(' · '))
  );
  mastheadTop.append(identity, statusChip(view.overview.status));
  masthead.append(mastheadTop);
  const summary = node('div', 'portal-summary-strip');
  const readyFiles = view.documents.filter((item) => item.viewUrl || item.downloadUrl).length;
  for (const [label, value, iconName] of [['Phase', view.overview.currentPhase, 'phase'], ['Payment', view.payment.stateLabel, 'billing'], ['Files', readyFiles ? `${readyFiles} ready` : 'No files yet', 'documents']]) {
    const item = node('div', 'portal-summary-item');
    const copy = node('div', 'portal-summary-copy');
    copy.append(node('span', '', label), node('strong', '', value));
    item.append(icon(iconName), copy);
    summary.append(item);
  }
  masthead.append(summary);

  const sections = {
    overview: overviewCard(view),
    projects: projectsCard(view),
    documents: documentsCard(view),
    payment: paymentCard(view),
    timeline: timelineCard(view),
    delivery: deliveryCard(view),
    assistant: assistantCard(view)
  };
  // Preserve the legacy grid interface while giving the client app explicit
  // views to organize into short, accessible screens.
  const grid = node('div', 'portal-v2-grid');
  const documentColumn = node('div', 'portal-v2-column');
  const statusColumn = node('div', 'portal-v2-column');
  documentColumn.append(sections.assistant, sections.documents);
  if (sections.projects) statusColumn.append(sections.projects);
  statusColumn.append(sections.payment, sections.timeline, sections.delivery);
  grid.append(sections.overview, documentColumn, statusColumn);

  const footer = node('footer', 'portal-v2-footer');
  footer.append(node('strong', '', 'OnlyTruePerspective LLC'), node('p', '', view.guardrail));
  return { masthead, grid, footer, sections };
}
