(() => {
  const form = document.getElementById('portal-invite-form');
  const input = document.getElementById('portal-token');
  const message = document.getElementById('portal-message');
  const demoBtn = document.getElementById('btn-demo-portal');
  const lockBtn = document.getElementById('btn-lock-portal');
  const dashboardMount = document.getElementById('portal-dashboard-mount');
  const gateHero = document.getElementById('portal-gate-section');

  const videoModal = document.getElementById('portal-video-modal');
  const modalIframe = document.getElementById('portal-modal-iframe');
  const closeModalBtn = document.getElementById('btn-close-portal-modal');

  const notesForm = document.getElementById('portal-notes-form');
  const noteInput = document.getElementById('note-input');
  const noteStatus = document.getElementById('note-status');

  const tokenPattern = /^[A-Za-z0-9][A-Za-z0-9._~-]{3,512}$/;

  function setMessage(value = '', type = '') {
    if (!message) return;
    message.textContent = value;
    message.classList.toggle('error', type === 'error');
  }

  function unlockDashboard(clientName = 'MORBID MUSIK / SPOOKY', projectTitle = '"SPOOKY" 4K VISUAL ROLLOUT') {
    if (dashboardMount) {
      dashboardMount.style.display = 'block';
      const cNameEl = document.getElementById('dash-client-name');
      const pTitleEl = document.getElementById('dash-project-title');
      if (cNameEl) cNameEl.textContent = `CLIENT: ${clientName}`;
      if (pTitleEl) pTitleEl.textContent = `PROJECT: ${projectTitle}`;
      
      // Scroll smoothly to dashboard
      dashboardMount.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function lockDashboard() {
    if (dashboardMount) {
      dashboardMount.style.display = 'none';
      if (gateHero) gateHero.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // Interactive Asset Preview Modal
  window.previewAsset = function(assetKey) {
    if (!videoModal || !modalIframe) return;
    modalIframe.src = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1'; // Fallback demo stream
    videoModal.style.display = 'flex';
  };

  if (closeModalBtn && videoModal) {
    closeModalBtn.addEventListener('click', () => {
      videoModal.style.display = 'none';
      if (modalIframe) modalIframe.src = '';
    });
  }

  // Asset Download Simulator
  window.simulateDownload = function(filename) {
    alert(`⬇ Starting Encrypted Download: ${filename}\n\nDeliverable package is ready for local archiving.`);
  };

  // Demo Portal Trigger
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      setMessage('⚡ Demo Client Portal Session Unlocked!');
      unlockDashboard('MORBID MUSIK / SPOOKY', '"SPOOKY" 4K VISUAL ROLLOUT');
    });
  }

  if (lockBtn) {
    lockBtn.addEventListener('click', () => {
      lockDashboard();
      setMessage('Session Locked.');
    });
  }

  // Direct Notes Sender
  if (notesForm && noteInput) {
    notesForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = noteInput.value.trim();
      if (!txt) return;
      if (noteStatus) {
        noteStatus.textContent = '✓ Note dispatched directly to OTP Terminal & ELI3GANT.';
      }
      noteInput.value = '';
      setTimeout(() => { if (noteStatus) noteStatus.textContent = ''; }, 4000);
    });
  }

  // Invite Token Submit
  if (form && input) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const token = String(input.value || '').trim();
      if (!token) {
        setMessage('Enter a valid private portal invite link or token.', 'error');
        return;
      }
      setMessage('Unlocking Private Client Dashboard...');
      unlockDashboard('ACTIVE CLIENT', `PROJECT (${token.toUpperCase()})`);
    });
  }

  // Auto-check URL query params
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'true' || params.get('token')) {
    unlockDashboard('ACTIVE CLIENT', '4K MEDIA & WEB SYSTEM BUILD');
  }
})();
