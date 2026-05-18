(() => {
  const tokenPattern = /^[A-Za-z0-9][A-Za-z0-9._~-]{5,512}$/;
  const docStatusLabel = {
    ready: 'Ready',
    locked: 'Locked',
    'needs-info': 'Needs Info'
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    loading: $('portal-loading'),
    error: $('portal-error'),
    errorMessage: $('portal-error-message'),
    app: $('portal-app'),
    title: $('client-title'),
    subtitle: $('client-subtitle'),
    statusRow: $('status-row'),
    paymentStatus: $('payment-status'),
    paymentList: $('payment-list'),
    paymentCta: $('payment-cta'),
    profileName: $('profile-name'),
    profileList: $('profile-list'),
    projectName: $('project-name'),
    projectList: $('project-list'),
    deliverablesStatus: $('deliverables-status'),
    deliverablesList: $('deliverables-list'),
    deliverablesEmpty: $('deliverables-empty'),
    documentsList: $('documents-list')
  };

  function text(value, fallback = '') {
    if (value == null || typeof value === 'object') return fallback;
    const v = String(value).trim();
    if (!v || /^(undefined|null|nan|\[object object\])$/i.test(v)) return fallback;
    return v;
  }

  function setHidden(el, hidden) {
    if (el) el.classList.toggle('hidden', !!hidden);
  }

  function appendText(parent, tag, value, className = '') {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = text(value);
    parent.append(node);
    return node;
  }

  function appendBadge(parent, label, tone = '') {
    const badge = appendText(parent, 'span', label, `badge${tone ? ` ${tone}` : ''}`);
    return badge;
  }

  function renderDl(list, rows) {
    list.replaceChildren();
    rows.forEach(([label, value]) => {
      const clean = text(value);
      if (!clean) return;
      appendText(list, 'dt', label);
      appendText(list, 'dd', clean);
    });
  }

  function tokenFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const raw = parts[0] === 'client' ? parts[1] : '';
    try {
      const token = decodeURIComponent(raw || '');
      return tokenPattern.test(token) ? token : '';
    } catch (_) {
      return '';
    }
  }

  function showError(message) {
    setHidden(els.loading, true);
    setHidden(els.app, true);
    setHidden(els.error, false);
    els.errorMessage.textContent = text(message, 'This private link could not be opened.');
  }

  function showApp() {
    setHidden(els.loading, true);
    setHidden(els.error, true);
    setHidden(els.app, false);
  }

  function renderStatus(data) {
    els.statusRow.replaceChildren();
    appendBadge(els.statusRow, data.project.status || 'In Review', 'gold');
    if (data.payment.status) appendBadge(els.statusRow, `Payment: ${data.payment.status}`, data.payment.receiptAvailable ? 'success' : '');
    if (data.project.dueDate) appendBadge(els.statusRow, `Due: ${data.project.dueDate}`);
  }

  function renderPayment(payment) {
    els.paymentStatus.textContent = text(payment.status, 'Unpaid');
    renderDl(els.paymentList, [
      ['Total', payment.total],
      ['Deposit', payment.deposit],
      ['Remaining', payment.remaining],
      ['Method', payment.method],
      ['Invoice', payment.invoiceSent ? 'Sent' : 'Not sent yet'],
      ['Receipt', payment.receiptAvailable ? 'Available' : 'Locked until payment is saved']
    ]);
    const href = text(payment.cta && payment.cta.href, 'mailto:bookings@onlytrueperspective.tech');
    els.paymentCta.href = href.startsWith('mailto:bookings@onlytrueperspective.tech') ? href : 'mailto:bookings@onlytrueperspective.tech';
    els.paymentCta.textContent = text(payment.cta && payment.cta.label, 'Request Payment Link');
  }

  function renderProfile(profile) {
    const client = text(profile.clientName, 'Client');
    els.profileName.textContent = client;
    renderDl(els.profileList, [
      ['Business', profile.businessName],
      ['Email', profile.email],
      ['Phone', profile.phone]
    ]);
  }

  function renderProject(project) {
    els.projectName.textContent = text(project.title, 'OTP Project');
    renderDl(els.projectList, [
      ['Service', project.serviceType],
      ['Package', project.packageType],
      ['Status', project.status],
      ['Start', project.startDate],
      ['Due', project.dueDate],
      ['Notes', project.notes],
      ['Description', project.description]
    ]);
  }

  function renderDeliverables(deliverables) {
    const items = Array.isArray(deliverables.items) ? deliverables.items : [];
    els.deliverablesStatus.textContent = items.length ? 'Published' : 'Pending';
    els.deliverablesStatus.classList.toggle('gold', items.length > 0);
    els.deliverablesList.replaceChildren();
    items.forEach((item) => appendText(els.deliverablesList, 'li', item));
    setHidden(els.deliverablesEmpty, items.length > 0);
  }

  function renderDocuments(documents) {
    els.documentsList.replaceChildren();
    (Array.isArray(documents) ? documents : []).forEach((doc) => {
      const article = document.createElement('article');
      article.className = `document-card ${text(doc.status, 'locked')}`;
      const head = document.createElement('div');
      head.className = 'document-head';
      const titleWrap = document.createElement('span');
      appendText(titleWrap, 'strong', doc.label || doc.type || 'Document');
      appendText(titleWrap, 'small', doc.message || '');
      head.append(titleWrap);
      appendBadge(head, docStatusLabel[doc.status] || 'Locked', doc.status === 'ready' ? 'success' : doc.status === 'locked' ? '' : 'warn');
      article.append(head);
      const preview = text(doc.preview);
      if (preview) {
        const pre = document.createElement('pre');
        pre.textContent = preview;
        article.append(pre);
      }
      els.documentsList.append(article);
    });
  }

  function renderPortal(data) {
    const profile = data.profile || {};
    const project = data.project || {};
    els.title.textContent = text(project.title, 'OTP Project');
    els.subtitle.textContent = text(profile.businessName || profile.clientName, 'Private OTP client workspace');
    renderStatus(data);
    renderPayment(data.payment || {});
    renderProfile(profile);
    renderProject(project);
    renderDeliverables(data.deliverables || {});
    renderDocuments(data.documents || []);
    showApp();
  }

  async function loadPortal() {
    const token = tokenFromPath();
    if (!token) {
      showError('This portal link is missing or malformed. Paste the latest private OTP invite.');
      return;
    }
    try {
      const response = await fetch(`/api/client-portal/${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok === false) {
        throw new Error(text(data.message, 'This private portal link could not be opened.'));
      }
      renderPortal(data);
    } catch (error) {
      showError(error.message);
    }
  }

  loadPortal();
})();
