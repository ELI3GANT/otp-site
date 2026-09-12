/**
 * BLACKBOX SIGNAL — Release Pipeline & Signal Configuration
 *
 * This configuration controls the active unreleased vault transmission,
 * supported audio codecs, current releases, and the evolving music timeline.
 *
 * Supported Audio Input Formats:
 * - .mp3 (audio/mpeg) — Recommended for cellular/web delivery
 * - .m4a (audio/mp4)  — High-efficiency AAC
 * - .wav (audio/wav)  — Uncompressed studio master export
 *
 * To deploy the next transmission:
 * 1. Place your teaser into /assets/audio/ (e.g., signal-002.mp3)
 * 2. Update signalNumber, signalName, and audioSources below.
 */

const BLACKBOX_SIGNAL_CONFIG = {
  // Active Vault Transmission Identity
  signalNumber: '001',
  signalName: 'SIGNAL 001',
  transmissionStatus: 'TRANSMISSION ACTIVE',
  offlineStatus: 'SIGNAL OFFLINE',
  transmissionBadge: 'UNRELEASED // VAULT TRANSMISSION',
  tagline: 'Signal intercepted from an unreleased session.',
  sourceModeLabel: 'VAULT SOURCE',

  // Audio Teaser Sources
  // Supports multi-codec candidate list with automatic browser capability detection
  audioSources: [
    {
      src: '/assets/audio/blackbox-signal.mp3',
      type: 'audio/mpeg'
    },
    {
      src: '/assets/audio/blackbox-signal.m4a',
      type: 'audio/mp4'
    },
    {
      src: '/assets/audio/blackbox-signal.wav',
      type: 'audio/wav'
    }
  ],
  // Default primary source fallback
  audioSource: '/assets/audio/blackbox-signal.mp3',

  // Optional manual duration cap in seconds (set to null to read exact file duration)
  teaserDurationSeconds: null,

  // Current Releases (Graduated from the Vault)
  currentReleases: [
    {
      id: 'protocol',
      title: 'PROTOCOL',
      format: '5-Track EP',
      badge: 'OUT NOW',
      url: 'https://distrokid.com/hyperfollow/eli711/protocol?ref=release',
      platform: 'All Platforms',
      ctaLabel: 'Stream PROTOCOL'
    },
    {
      id: 'lets-get-lit',
      title: "LET'S GET LIT",
      format: 'Single',
      badge: 'SOUNDCLOUD',
      url: 'https://soundcloud.com/eli3gant/lgl-lets-get-lit',
      platform: 'SoundCloud',
      ctaLabel: 'Listen on SoundCloud'
    }
  ],

  // Music Timeline (Minimal & Mysterious)
  timeline: [
    {
      name: 'PROTOCOL',
      state: 'complete',
      statusText: 'OUT NOW'
    },
    {
      name: 'SIGNAL 001',
      state: 'active',
      statusText: 'ACTIVE'
    },
    {
      name: '[ REDACTED ]',
      state: 'locked',
      statusText: 'ENCRYPTED'
    }
  ]
};

if (typeof window !== 'undefined') {
  window.BLACKBOX_SIGNAL_CONFIG = BLACKBOX_SIGNAL_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BLACKBOX_SIGNAL_CONFIG;
}
