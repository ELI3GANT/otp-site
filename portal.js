(() => {
  const form = document.getElementById('portal-invite-form');
  const input = document.getElementById('portal-token');
  const message = document.getElementById('portal-message');
  const tokenPattern = /^[A-Za-z0-9][A-Za-z0-9._~-]{5,512}$/;

  function setMessage(value = '', type = '') {
    if (!message) return;
    message.textContent = value;
    message.classList.toggle('error', type === 'error');
  }

  function cleanToken(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const decoded = decodeURIComponent(raw);
      return tokenPattern.test(decoded) ? decoded : '';
    } catch (_) {
      return tokenPattern.test(raw) ? raw : '';
    }
  }

  function extractToken(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const direct = cleanToken(raw.replace(/^#?\/?client\//i, '').split(/[?#]/)[0]);
    if (direct) return direct;

    try {
      const url = new URL(raw, window.location.origin);
      const parts = url.pathname.split('/').filter(Boolean);
      const clientIndex = parts.findIndex((part) => part.toLowerCase() === 'client');
      if (clientIndex >= 0) {
        const pathToken = cleanToken(parts[clientIndex + 1]);
        if (pathToken) return pathToken;
      }
      return cleanToken(url.searchParams.get('token') || url.searchParams.get('invite') || '');
    } catch (_) {
      return '';
    }
  }

  function applyStatusMessage() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'invalid') {
      setMessage('That invite link could not be opened. Check the private link from OTP and try again.', 'error');
    } else if (status === 'missing') {
      setMessage('Paste your private OTP Client Portal invite link or token to continue.', 'error');
    } else if (status === 'review') {
      setMessage('Your portal may still be pending OTP review. Use your latest private invite or book OTP to start.');
    }
  }

  if (form && input) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const token = extractToken(input.value);
      if (!token) {
        setMessage('Enter a valid private portal invite link or token.', 'error');
        return;
      }
      setMessage('Opening your private portal...');
      window.location.assign(`/client/${encodeURIComponent(token)}`);
    });
  }

  applyStatusMessage();
})();
