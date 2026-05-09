const state = {
  services: [],
  selectedServiceId: '',
  selectedAddOns: new Set(),
  uploads: [],
  uploadConfig: {
    max_bytes: 25 * 1024 * 1024,
    allowed_mime_types: []
  },
  uploading: 0,
  bookingToken: window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`
};

const serviceGrid = document.getElementById('service-grid');
const addOnsPanel = document.getElementById('add-ons-panel');
const bookingForm = document.getElementById('booking-form');
const bookingName = document.getElementById('booking-name');
const bookingFiles = document.getElementById('booking-files');
const uploadList = document.getElementById('upload-list');
const uploadRules = document.getElementById('upload-rules');
const estimateTotal = document.getElementById('estimate-total');
const estimateDeposit = document.getElementById('estimate-deposit');
const bookingStatus = document.getElementById('booking-status');
const bookingError = document.getElementById('booking-error');
const submitBooking = document.getElementById('submit-booking');
const successPanel = document.getElementById('booking-success');
const successTitle = document.getElementById('success-title');
const successCopy = document.getElementById('success-copy');
const successActions = document.getElementById('success-actions');
const successMeta = document.getElementById('success-meta');

function selectedService() {
  return state.services.find((service) => service.id === state.selectedServiceId) || state.services[0] || null;
}

function selectedAddOns() {
  const service = selectedService();
  if (!service) return [];
  return (service.add_ons || []).filter((addOn) => state.selectedAddOns.has(addOn.id));
}

function paymentChoice() {
  return new FormData(bookingForm).get('payment_choice') || 'quote_first';
}

function estimate() {
  const service = selectedService();
  if (!service) return { pricing: 'Tailored quote', deposit: 'Optional after scope' };
  return {
    pricing: service.pricing_label || 'Custom quote',
    deposit: paymentChoice() === 'pay_deposit'
      ? (service.deposit_label || 'Secure link after intake')
      : 'Quote first'
  };
}

function showError(message = '') {
  bookingError.textContent = message;
  bookingError.classList.toggle('hidden', !message);
}

function showStatus(message = '') {
  if (!bookingStatus) return;
  bookingStatus.textContent = message;
  bookingStatus.classList.toggle('hidden', !message);
}

function mimeTypeForFile(file = {}) {
  const explicit = String(file.type || '').toLowerCase();
  if (explicit) return explicit;
  const name = String(file.name || '').toLowerCase();
  if (/\.(jpe?g)$/.test(name)) return 'image/jpeg';
  if (/\.png$/.test(name)) return 'image/png';
  if (/\.webp$/.test(name)) return 'image/webp';
  if (/\.gif$/.test(name)) return 'image/gif';
  if (/\.heic$/.test(name)) return 'image/heic';
  if (/\.heif$/.test(name)) return 'image/heif';
  if (/\.mp4$/.test(name)) return 'video/mp4';
  if (/\.mov$/.test(name)) return 'video/quicktime';
  if (/\.pdf$/.test(name)) return 'application/pdf';
  return 'application/octet-stream';
}

function renderServices() {
  serviceGrid.replaceChildren();
  state.services.forEach((service) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `service-card${service.id === state.selectedServiceId ? ' active' : ''}`;
    button.innerHTML = `
      <strong>${service.label}</strong>
      <span>${service.pricing_label || 'Custom quote'} · ${service.turnaround}</span>
      <p>${service.description}</p>
      ${service.scope_note ? `<small>${service.scope_note}</small>` : ''}
    `;
    button.addEventListener('click', () => {
      state.selectedServiceId = service.id;
      state.selectedAddOns.clear();
      renderServices();
      renderAddOns();
      updateEstimate();
    });
    serviceGrid.append(button);
  });
}

function renderAddOns() {
  const service = selectedService();
  addOnsPanel.replaceChildren();
  if (!service || !service.add_ons?.length) {
    const empty = document.createElement('p');
    empty.className = 'form-message';
    empty.textContent = 'No add-ons for this service.';
    addOnsPanel.append(empty);
    return;
  }

  const title = document.createElement('div');
  title.innerHTML = '<p class="eyebrow">Add-ons</p><h2>Optional upgrades</h2>';
  addOnsPanel.append(title);

  service.add_ons.forEach((addOn) => {
    const label = document.createElement('label');
    label.className = 'add-on-row';
    label.innerHTML = `
      <span>${addOn.label}</span>
      <span>${addOn.scope_label || 'Scoped into quote'}</span>
      <input type="checkbox" value="${addOn.id}" />
    `;
    const input = label.querySelector('input');
    input.checked = state.selectedAddOns.has(addOn.id);
    input.addEventListener('change', () => {
      if (input.checked) state.selectedAddOns.add(addOn.id);
      else state.selectedAddOns.delete(addOn.id);
      updateEstimate();
    });
    addOnsPanel.append(label);
  });
}

function updateEstimate() {
  const values = estimate();
  estimateTotal.textContent = values.pricing;
  estimateDeposit.textContent = values.deposit;
}

function fileSizeText(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validateFile(file) {
  const allowed = new Set(state.uploadConfig.allowed_mime_types || []);
  const mimeType = mimeTypeForFile(file);
  if (!allowed.has(mimeType)) return 'Unsupported file type';
  if (file.size > state.uploadConfig.max_bytes) return 'File is too large';
  if (!file.size) return 'File is empty';
  return '';
}

function renderUploadRow(file) {
  const row = document.createElement('article');
  const mimeType = mimeTypeForFile(file);
  const thumb = document.createElement(mimeType.startsWith('image/') ? 'img' : 'div');
  const main = document.createElement('div');
  const title = document.createElement('strong');
  const meta = document.createElement('small');
  const progress = document.createElement('div');
  const bar = document.createElement('span');

  row.className = 'upload-item';
  thumb.className = 'file-thumb';
  if (mimeType.startsWith('image/') && !/hei[cf]$/i.test(file.name || '')) {
    thumb.src = URL.createObjectURL(file);
    thumb.alt = '';
    thumb.onload = () => URL.revokeObjectURL(thumb.src);
  } else {
    thumb.textContent = mimeType.startsWith('video/') ? 'VID' : mimeType.startsWith('image/') ? 'IMG' : 'PDF';
  }

  title.textContent = file.name;
  meta.textContent = `${mimeType} · ${fileSizeText(file.size)}`;
  progress.className = 'progress-track';
  progress.append(bar);
  main.className = 'file-main';
  main.append(title, meta, progress);
  row.append(thumb, main);
  uploadList.append(row);

  return { row, bar, meta };
}

function uploadReference(file, parts) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const mimeType = mimeTypeForFile(file);
    const params = new URLSearchParams({
      booking_token: state.bookingToken,
      file_name: file.name,
      file_type: mimeType,
      file_size: String(file.size),
      client_name: bookingName.value || 'client'
    });

    xhr.open('POST', `/api/bookings/upload?${params}`);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.setRequestHeader('x-booking-token', state.bookingToken);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      parts.bar.style.width = `${Math.max(4, Math.round((event.loaded / event.total) * 100))}%`;
    };
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        data = { message: 'Upload response was invalid' };
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.uploaded) {
        parts.bar.style.width = '100%';
        parts.meta.textContent = `${mimeType} · ${fileSizeText(file.size)} · Uploaded`;
        resolve(data);
        return;
      }
      reject(new Error(data.message || 'Upload failed'));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    xhr.send(file);
  });
}

async function handleFiles(files) {
  showError('');
  for (const file of files) {
    const parts = renderUploadRow(file);
    const validationError = validateFile(file);
    if (validationError) {
      parts.meta.textContent = validationError;
      parts.row.classList.add('error');
      continue;
    }

    try {
      state.uploading += 1;
      showStatus('Uploading references...');
      const upload = await uploadReference(file, parts);
      state.uploads.push(upload);
    } catch (error) {
      parts.meta.textContent = error.message || 'Upload failed';
      parts.row.classList.add('error');
    } finally {
      state.uploading = Math.max(0, state.uploading - 1);
      showStatus(state.uploading ? 'Uploading references...' : '');
    }
  }
}

function formPayload() {
  const data = new FormData(bookingForm);
  return {
    booking_token: state.bookingToken,
    service_id: state.selectedServiceId,
    add_ons: [...state.selectedAddOns],
    name: String(data.get('name') || '').trim(),
    ig_handle: String(data.get('ig_handle') || '').trim(),
    email: String(data.get('email') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    project_description: String(data.get('project_description') || '').trim(),
    preferred_date: String(data.get('preferred_date') || '').trim(),
    preferred_time: String(data.get('preferred_time') || '').trim(),
    location: String(data.get('location') || '').trim(),
    budget_range: String(data.get('budget_range') || '').trim(),
    payment_choice: paymentChoice(),
    upload_ids: state.uploads.map((upload) => upload.upload_id).filter(Boolean)
  };
}

function renderSuccess(data) {
  successPanel.classList.remove('hidden');
  showStatus('');
  showError('');
  bookingForm.classList.add('submitted');
  successTitle.textContent = data.payment?.ready ? 'Deposit link is ready.' : 'Booking request saved.';
  successCopy.textContent = data.payment?.ready
    ? 'Open the secure deposit link when you are ready. OTP received the project details and reference files.'
    : 'OTP received the project details. You will get a tailored quote or deposit follow-up next.';
  successActions.replaceChildren();
  successMeta.replaceChildren();

  const paymentLink = data.payment_link || data.payment?.url || '';
  if (paymentLink) {
    const link = document.createElement('a');
    link.href = paymentLink;
    link.textContent = 'Open Deposit Link';
    link.rel = 'noopener';
    successActions.append(link);
  }

  const another = document.createElement('button');
  another.type = 'button';
  another.textContent = 'New Booking';
  another.addEventListener('click', () => window.location.reload());
  successActions.append(another);

  const payload = formPayload();
  const selected = selectedService();
  const selectedDate = data.preferred_date || payload.preferred_date || '';
  const selectedTime = data.preferred_time || payload.preferred_time || '';
  const paymentStatus = data.quote_or_deposit_status
    || data.payment?.message
    || (payload.payment_choice === 'pay_deposit' ? 'Deposit requested' : 'Quote requested first');
  const uploadText = `${Number(data.upload_count || data.uploads?.linked || 0)} of ${Number(data.uploads?.requested || payload.upload_ids.length || 0)} reference upload${Number(data.uploads?.requested || payload.upload_ids.length || 0) === 1 ? '' : 's'} linked`;
  const details = [
    ['Service', data.service_type || data.job?.service_type || selected?.label || 'Selected project'],
    ['Date / Time', selectedDate ? `${selectedDate}${selectedTime ? ` at ${selectedTime}` : ''}` : 'OTP will confirm scheduling'],
    ['Quote / Deposit', paymentStatus],
    ['References', uploadText],
    ['Contact', data.contact_confirmed ? 'Contact saved in OTP OS' : 'Contact received for OTP follow-up'],
    ['Next Step', data.next_action || data.oracle?.next_action || 'OTP will follow up with next steps'],
    ['Status', data.status || 'New Lead'],
    ['Job ID', data.job_id || 'Saved']
  ];

  details.forEach(([label, value]) => {
    const row = document.createElement('span');
    row.className = 'success-row';
    const key = document.createElement('strong');
    const val = document.createElement('em');
    key.textContent = label;
    val.textContent = value;
    row.append(key, val);
    successMeta.append(row);
  });

  if (data.duplicate_warning) {
    const warning = document.createElement('span');
    warning.className = 'success-row warning';
    warning.textContent = data.duplicate_warning;
    successMeta.append(warning);
  }

  successPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitForm(event) {
  event.preventDefault();
  showError('');
  if (state.uploading > 0) {
    showError('Reference uploads are still finishing. Try again in a moment.');
    return;
  }
  submitBooking.disabled = true;
  submitBooking.textContent = 'Submitting...';
  showStatus('Saving booking into OTP OS...');

  try {
    const response = await fetch('/api/bookings/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formPayload())
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error || data.ok === false) {
      throw new Error(data.message || 'Booking could not be submitted');
    }
    renderSuccess(data);
  } catch (error) {
    showError(error.message || 'Booking could not be submitted');
    showStatus('');
  } finally {
    submitBooking.disabled = false;
    submitBooking.textContent = 'Submit Booking';
  }
}

async function init() {
  try {
    const response = await fetch('/api/bookings/config');
    const data = await response.json();
    state.services = data.services || [];
    state.uploadConfig = data.upload || state.uploadConfig;
    state.selectedServiceId = state.services[0]?.id || '';
    uploadRules.textContent = `Images, HEIC, MP4/MOV, or PDF up to ${fileSizeText(state.uploadConfig.max_bytes)}.`;
    renderServices();
    renderAddOns();
    updateEstimate();
  } catch {
    showError('Booking config unavailable. Refresh and try again.');
  }
}

bookingFiles.addEventListener('change', () => handleFiles([...bookingFiles.files]));
bookingForm.addEventListener('change', (event) => {
  if (event.target?.name === 'payment_choice') updateEstimate();
});
bookingForm.addEventListener('submit', submitForm);

init();
