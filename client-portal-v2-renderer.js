function node(tag, className = '', value = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value) element.textContent = value;
  return element;
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
  if (/complete|paid|available|ready|received/i.test(value)) return 'ready';
  if (/review|due|current|pending|upcoming|progress/i.test(value)) return 'warning';
  return '';
}

function statusChip(value = '') {
  return node('span', `badge ${statusMode(value)}`.trim(), value || 'Pending Review');
}

function safeLink(label, href, secondary = true) {
  const link = node('a', `button-link ${secondary ? 'secondary' : ''}`.trim(), label);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function sectionCard(title, className = '') {
  const section = node('section', `card portal-v2-card ${className}`.trim());
  const heading = node('h2', 'portal-v2-section-title', title);
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
  const card = sectionCard('Project Overview', 'portal-v2-overview');
  const status = node('div', 'portal-v2-status-row');
  status.append(statusChip(view.overview.status), statusChip(view.overview.currentPhase));
  card.append(
    status,
    node('p', 'portal-v2-summary', view.overview.summary),
    valueRow('Project', view.overview.projectTitle),
    valueRow('Job type', view.overview.jobType),
    valueRow('Service', view.overview.service),
    valueRow('Current phase', view.overview.currentPhase),
    valueRow('Next client action', view.overview.nextClientAction),
    valueRow('OTP support', view.contact.email)
  );
  return card;
}

function documentsCard(view) {
  const card = sectionCard('Documents');
  const list = node('div', 'portal-v2-document-list');
  for (const document of view.documents) {
    const item = node('article', 'portal-v2-document');
    const heading = node('div', 'portal-v2-document-heading');
    const actions = node('div', 'portal-v2-actions');
    heading.append(node('strong', '', document.label), statusChip(document.status));
    item.append(heading, node('p', '', document.message));
    if (document.viewUrl) actions.append(safeLink('View document', document.viewUrl));
    if (document.downloadUrl) actions.append(safeLink('Download PDF', document.downloadUrl));
    if (!actions.children.length) {
      const pending = node('span', 'portal-v2-pending-label', document.actionLabel);
      pending.setAttribute('aria-disabled', 'true');
      actions.append(pending);
    }
    item.append(actions);
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
  const card = sectionCard('Payment Status', `portal-v2-payment ${payment.manualReviewRequired ? 'needs-review' : ''}`);
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
    node('p', 'portal-v2-next-action', `Next step: ${payment.nextAction}`)
  );
  if (actions.children.length) card.append(actions);
  return card;
}

function timelineCard(view) {
  const card = sectionCard('Project Timeline');
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
  const card = sectionCard('Delivery & Proof');
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
  const card = sectionCard('Your Projects', 'portal-v2-projects');
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

export function renderClientPortalViewV2(view) {
  const masthead = node('section', 'hero portal-v2-masthead');
  const mastheadTop = node('div', 'portal-v2-masthead-top');
  const identity = node('div', 'portal-v2-client-identity');
  identity.append(
    node('p', 'eyebrow', view.identity.businessName),
    node('h2', '', view.identity.clientName),
    node('p', 'portal-v2-project-title', view.identity.projectTitle)
  );
  mastheadTop.append(identity, statusChip(view.overview.status));
  masthead.append(mastheadTop, node('p', 'portal-v2-welcome', 'Your private OTP project hub for reviewed documents, payment status, timeline, and delivery.'));

  const grid = node('div', 'portal-v2-grid');
  const documentColumn = node('div', 'portal-v2-column');
  const statusColumn = node('div', 'portal-v2-column');
  documentColumn.append(documentsCard(view));
  const projectsList = projectsCard(view);
  if (projectsList) statusColumn.append(projectsList);
  statusColumn.append(paymentCard(view), timelineCard(view), deliveryCard(view));
  grid.append(overviewCard(view), documentColumn, statusColumn);

  const footer = node('footer', 'portal-v2-footer');
  footer.append(node('strong', '', 'OnlyTruePerspective LLC'), node('p', '', view.guardrail));
  return { masthead, grid, footer };
}
