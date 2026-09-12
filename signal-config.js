/**
 * BLACKBOX SIGNAL — Release Pipeline & Signal Configuration
 *
 * This configuration controls the active unreleased vault transmission,
 * current releases, and the evolving music timeline.
 *
 * To deploy the next transmission:
 * 1. Drop your 20-30s teaser audio into /assets/audio/
 * 2. Update signalNumber, signalName, and audioSource below.
 */

const BLACKBOX_SIGNAL_CONFIG = {
  // Active Vault Transmission
  signalNumber: '001',
  signalName: 'SIGNAL 001',
  transmissionStatus: 'TRANSMISSION ACTIVE',
  transmissionBadge: 'UNRELEASED // VAULT TRANSMISSION',
  tagline: 'Signal intercepted from an unreleased session.',
  classifiedLabel: 'CONFIDENTIAL AUDIO ARCHIVE',

  // Audio Teaser Source (Recommended: 20-30 second high-impact export)
  audioSource: '/assets/audio/blackbox-signal.mp3',
  teaserDurationSeconds: 30, // Max duration cap in seconds

  // Current Releases (Graduated from the Vault)
  currentReleases: [
    {
      id: 'protocol',
      title: 'PROTOCOL',
      format: '5-Track EP',
      badge: 'OUT NOW',
      description: 'Dark, focused EP built on control, pressure, and transformation. Available on all major platforms.',
      url: 'https://distrokid.com/hyperfollow/eli711/protocol?ref=release',
      platform: 'All Platforms',
      ctaLabel: 'Stream PROTOCOL'
    },
    {
      id: 'lets-get-lit',
      title: "LET'S GET LIT",
      format: 'Single',
      badge: 'SOUNDCLOUD',
      description: 'Raw underground session energy. Active stream on SoundCloud.',
      // Insert direct track URL here once published; defaults to artist SoundCloud profile
      url: 'https://soundcloud.com/eli3gant',
      platform: 'SoundCloud',
      ctaLabel: 'Listen on SoundCloud'
    }
  ],

  // Music Timeline (Mysterious & Minimal)
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
