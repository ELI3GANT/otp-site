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
      secondaryCta: 'Stream PROTOCOL',
      availability: 'Stream PROTOCOL.',
      releaseMark: 'Stream PROTOCOL.',
      primaryVisible: true,
      secondaryVisible: true,
      trackMode: 'revealed',
      protocolEraState: 'unlocked',
      isReleased: true
    },
    {
      id: 'hour',
      status: 'Final signal window.',
      cta: 'Open HyperFollow',
      secondaryCta: 'Open HyperFollow',
      availability: 'Final signal window.',
      primaryVisible: true,
      secondaryVisible: false,
      trackMode: 'hints',
      protocolEraState: 'encrypted',
      threshold: HOUR_MS
    },
    {
      id: 'day',
      status: 'Archive unlock pending.',
      cta: 'Pre-save PROTOCOL',
      secondaryCta: 'Open HyperFollow',
      availability: 'Archive unlock pending.',
      primaryVisible: true,
      secondaryVisible: false,
      trackMode: 'hints',
      protocolEraState: 'encrypted',
      threshold: DAY_MS
    },
    {
      id: 'approaching',
      status: 'Signal approaching.',
      cta: 'Pre-save PROTOCOL',
      secondaryCta: 'Open HyperFollow',
      availability: 'Signal approaching.',
      primaryVisible: false,
      secondaryVisible: true,
      trackMode: 'locked',
      protocolEraState: 'encrypted',
      threshold: 3 * DAY_MS
    },
    {
      id: 'sealed',
      status: 'Archive sealed',
      cta: 'Pre-save PROTOCOL',
      secondaryCta: 'Open HyperFollow',
      availability: 'Link unlocks closer to release.',
      primaryVisible: false,
      secondaryVisible: false,
      trackMode: 'locked',
      protocolEraState: 'encrypted'
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

  function setLinkState(link, visible, url) {
    if (!link) return;
    link.hidden = !visible;
    if (visible && url) {
      link.href = url;
      return;
    }
    link.removeAttribute('href');
  }

  function setProtocolLinks(url, state) {
    setLinkState(document.querySelector('[data-protocol-role="primary"]'), state.primaryVisible, url);
    setLinkState(document.querySelector('[data-protocol-role="secondary"]'), state.secondaryVisible, url);
    const actions = document.querySelector('[data-protocol-actions]');
    if (actions) actions.hidden = !(state.primaryVisible || state.secondaryVisible);
  }

  function updateTracks(trackMode) {
    document.body.dataset.trackMode = trackMode;
    document.querySelectorAll('[data-track-title]').forEach((track) => {
      const name = track.querySelector('[data-track-name]');
      if (!name) return;
      const title = track.getAttribute('data-track-title') || '';
      const locked = track.getAttribute('data-track-locked') || 'Signal masked.';
      const hint = track.getAttribute('data-track-hint') || 'Signal masked.';
      if (trackMode === 'revealed') {
        setText(name, title);
      } else if (trackMode === 'hints') {
        setText(name, `${locked} // ${hint}`);
      } else {
        setText(name, locked);
      }
    });
  }

  function updateTimeline(state) {
    const protocolEra = document.querySelector('[data-era="protocol"]');
    const protocolStatus = document.querySelector('[data-protocol-era-status]');
    if (protocolEra) protocolEra.dataset.eraState = state.protocolEraState;
    setText(protocolStatus, 'Current system');
  }

  function renderProtocolState(config) {
    const targetMs = Date.parse(config.releaseTarget);
    const nowMs = Date.now();
    const state = getProtocolReleaseState(nowMs, targetMs);
    const remaining = Number.isFinite(targetMs) ? targetMs - nowMs : 0;

    document.body.dataset.protocolState = state.id;
    setProtocolLinks(config.distroKidUrl, state);
    setText(document.querySelector('[data-protocol-status]'), state.status);
    setText(document.querySelector('[data-protocol-cta]'), state.cta);
    setText(document.querySelector('[data-protocol-secondary-cta]'), state.secondaryCta);
    setText(document.querySelector('[data-protocol-availability]'), state.availability);
    updateTracks(state.trackMode);
    updateTimeline(state);

    const countdown = document.querySelector('[data-protocol-countdown]');
    const releaseMark = document.querySelector('[data-protocol-release-mark]');
    if (countdown) countdown.hidden = Boolean(state.isReleased);
    if (releaseMark) {
      releaseMark.hidden = !state.isReleased;
      setText(releaseMark, state.releaseMark || '');
    }

    updateCountdown({
      days: document.querySelector('[data-count="days"]'),
      hours: document.querySelector('[data-count="hours"]'),
      minutes: document.querySelector('[data-count="minutes"]'),
      seconds: document.querySelector('[data-count="seconds"]')
    }, remaining);
  }

  function initProtocolPage() {
    const config = readProtocolConfig();
    renderProtocolState(config);
    window.setInterval(() => renderProtocolState(config), 1000);
  }

  window.ProtocolRelease = {
    getProtocolReleaseState,
    defaultConfig: DEFAULT_PROTOCOL_CONFIG
  };

  initProtocolPage();
}());
