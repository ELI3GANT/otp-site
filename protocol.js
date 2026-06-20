(function () {
  'use strict';

  const DEFAULT_PROTOCOL_CONFIG = {
    releaseTarget: '2026-06-26T00:00:00-04:00',
    distroKidUrl: ''
  };

  const HOUR_MS = 60 * 60 * 1000;
  const DAY_MS = 24 * HOUR_MS;

  const RELEASE_STATES = [
    {
      id: 'released',
      status: 'Stream PROTOCOL.',
      cta: 'Listen Everywhere',
      availability: 'Stream PROTOCOL.',
      isReleased: true
    },
    {
      id: 'hour',
      status: 'Final signal window.',
      cta: 'Pre-save PROTOCOL',
      availability: 'Available everywhere after release.',
      threshold: HOUR_MS
    },
    {
      id: 'day',
      status: 'Archive unlock pending.',
      cta: 'Pre-save PROTOCOL',
      availability: 'Available everywhere after release.',
      threshold: DAY_MS
    },
    {
      id: 'approaching',
      status: 'Signal approaching.',
      cta: 'Open HyperFollow',
      availability: 'Available everywhere after release.',
      threshold: 3 * DAY_MS
    },
    {
      id: 'sealed',
      status: 'Archive sealed',
      cta: 'Pre-save PROTOCOL',
      availability: 'Available everywhere after release.'
    }
  ];

  function readProtocolConfig() {
    const configNode = document.getElementById('protocol-config');
    if (!configNode) return DEFAULT_PROTOCOL_CONFIG;

    try {
      return {
        ...DEFAULT_PROTOCOL_CONFIG,
        ...JSON.parse(configNode.textContent || '{}')
      };
    } catch (error) {
      return DEFAULT_PROTOCOL_CONFIG;
    }
  }

  function getProtocolReleaseState(nowMs, targetMs) {
    const remaining = Number.isFinite(targetMs) ? targetMs - nowMs : 0;
    if (remaining <= 0) return RELEASE_STATES[0];
    if (remaining <= HOUR_MS) return RELEASE_STATES[1];
    if (remaining <= DAY_MS) return RELEASE_STATES[2];
    if (remaining <= 3 * DAY_MS) return RELEASE_STATES[3];
    return RELEASE_STATES[4];
  }

  function pad(value) {
    return String(Math.max(0, value)).padStart(2, '0');
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function updateCountdown(countFields, remainingMs) {
    const remaining = Math.max(0, remainingMs);
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    setText(countFields.days, pad(days));
    setText(countFields.hours, pad(hours));
    setText(countFields.minutes, pad(minutes));
    setText(countFields.seconds, pad(seconds));
  }

  function setProtocolLinks(url) {
    if (!url) return;
    document.querySelectorAll('[data-protocol-link]').forEach((link) => {
      link.href = url;
    });
  }

  function renderProtocolState(config) {
    const targetMs = Date.parse(config.releaseTarget);
    const nowMs = Date.now();
    const state = getProtocolReleaseState(nowMs, targetMs);
    const remaining = Number.isFinite(targetMs) ? targetMs - nowMs : 0;

    document.body.dataset.protocolState = state.id;
    setText(document.querySelector('[data-protocol-status]'), state.status);
    setText(document.querySelector('[data-protocol-cta]'), state.cta);
    setText(document.querySelector('[data-protocol-availability]'), state.availability);

    updateCountdown({
      days: document.querySelector('[data-count="days"]'),
      hours: document.querySelector('[data-count="hours"]'),
      minutes: document.querySelector('[data-count="minutes"]'),
      seconds: document.querySelector('[data-count="seconds"]')
    }, remaining);
  }

  function initProtocolPage() {
    const config = readProtocolConfig();
    setProtocolLinks(config.distroKidUrl);
    renderProtocolState(config);
    window.setInterval(() => renderProtocolState(config), 1000);
  }

  window.ProtocolRelease = {
    getProtocolReleaseState,
    defaultConfig: DEFAULT_PROTOCOL_CONFIG
  };

  initProtocolPage();
}());
