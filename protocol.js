(function () {
  'use strict';

  const PROTOCOL_RELEASE_TARGET = '2026-06-26T00:00:00-04:00';
  const SNIPPET_PATH = '/assets/audio/protocol-snippet.mp3';
  const EASTER_EGG_TAPS_REQUIRED = 3;
  const EASTER_EGG_TAP_WINDOW_MS = 1600;

  const countFields = {
    days: document.querySelector('[data-count="days"]'),
    hours: document.querySelector('[data-count="hours"]'),
    minutes: document.querySelector('[data-count="minutes"]'),
    seconds: document.querySelector('[data-count="seconds"]')
  };
  const enterButton = document.querySelector('.protocol-enter');
  const panel = document.getElementById('protocol-panel');
  const statusText = document.getElementById('protocol-status');
  const signalTriggers = document.querySelectorAll('[data-signal-trigger]');
  const signalPanel = document.getElementById('protocol-signal');
  const audioSlot = document.querySelector('.protocol-audio-slot');
  const disabledLinks = document.querySelectorAll('[data-disabled-link="true"]');

  const targetTime = Date.parse(PROTOCOL_RELEASE_TARGET);
  let tapCount = 0;
  let tapTimer = null;
  let lastTapTrigger = null;

  function pad(value) {
    return String(Math.max(0, value)).padStart(2, '0');
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function renderCountdown() {
    const now = Date.now();
    const remaining = Number.isFinite(targetTime) ? Math.max(0, targetTime - now) : 0;
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    setText(countFields.days, pad(days));
    setText(countFields.hours, pad(hours));
    setText(countFields.minutes, pad(minutes));
    setText(countFields.seconds, pad(seconds));

    if (remaining <= 0) {
      setText(statusText, 'SYSTEM ONLINE // PROTOCOL ACTIVE');
    }
  }

  function pulseGlitch() {
    if (prefersReducedMotion()) return;
    document.body.classList.remove('protocol-glitch');
    window.requestAnimationFrame(() => {
      document.body.classList.add('protocol-glitch');
      window.setTimeout(() => document.body.classList.remove('protocol-glitch'), 620);
    });
  }

  function enterProtocol() {
    if (!panel || !enterButton) return;
    panel.hidden = false;
    panel.classList.remove('is-booting');
    document.body.classList.add('protocol-entered');
    enterButton.setAttribute('aria-expanded', 'true');
    setText(statusText, 'SYSTEM ONLINE // PROTOCOL ACTIVE');
    pulseGlitch();
    window.requestAnimationFrame(() => {
      panel.classList.add('is-booting');
    });
  }

  function revealSignal() {
    if (!signalPanel) return;
    if (panel && panel.hidden) enterProtocol();
    signalPanel.hidden = false;
    signalPanel.classList.add('is-visible');
    setText(statusText, 'SIGNAL DETECTED // ACCESS PENDING');
    pulseGlitch();
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function recordSignalTap(event) {
    const trigger = event.currentTarget;
    if (trigger !== lastTapTrigger) {
      tapCount = 0;
      lastTapTrigger = trigger;
    }

    tapCount += 1;
    window.clearTimeout(tapTimer);
    tapTimer = window.setTimeout(() => {
      tapCount = 0;
      lastTapTrigger = null;
    }, EASTER_EGG_TAP_WINDOW_MS);

    if (tapCount >= EASTER_EGG_TAPS_REQUIRED) {
      tapCount = 0;
      lastTapTrigger = null;
      window.clearTimeout(tapTimer);
      revealSignal();
    }
  }

  function wireSignalTrigger(trigger) {
    trigger.addEventListener('click', recordSignalTap);

    if (trigger.tagName !== 'BUTTON') {
      trigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          recordSignalTap(event);
        }
      });
    }
  }

  function wireAudioPlaceholder() {
    if (!audioSlot) return;
    const button = audioSlot.querySelector('.protocol-audio-button');
    const message = audioSlot.querySelector('.protocol-audio-message');
    const source = audioSlot.getAttribute('data-audio-src') || SNIPPET_PATH;
    if (!button || !message) return;

    button.addEventListener('click', () => {
      if (audioSlot.querySelector('audio')) return;
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.preload = 'metadata';
      audio.src = source;
      audio.setAttribute('aria-label', 'PROTOCOL snippet preview');
      audio.addEventListener('error', () => {
        audio.remove();
        button.hidden = false;
        setText(message, 'Snippet file not installed yet.');
      }, { once: true });
      audio.addEventListener('loadedmetadata', () => {
        button.hidden = true;
        setText(message, 'Snippet channel ready.');
      }, { once: true });
      button.after(audio);
      audio.load();
    });
  }

  function wireInteractions() {
    if (enterButton) enterButton.addEventListener('click', enterProtocol);

    signalTriggers.forEach(wireSignalTrigger);

    disabledLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
      });
    });

    wireAudioPlaceholder();
  }

  renderCountdown();
  window.setInterval(renderCountdown, 1000);
  wireInteractions();
}());
