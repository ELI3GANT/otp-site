'use strict';

const people = [
  {
    displayName: '4REIGN',
    initials: '4R',
    role: 'Host',
    instagramUrl: 'https://www.instagram.com/killingpercs',
    avatarImagePath: ''
  },
  {
    displayName: 'ELI3GANT',
    initials: 'E3',
    role: 'Featured Artist / OTP',
    instagramUrl: 'https://www.instagram.com/eli3gant',
    avatarImagePath: ''
  },
  {
    displayName: 'SPOOKY',
    initials: 'SP',
    role: 'Featured Artist / The Smack Club',
    instagramUrl: 'https://www.instagram.com/akidnamedspooky',
    avatarImagePath: ''
  },
  {
    displayName: 'A1ZEK',
    initials: 'A1',
    role: 'Featured Artist',
    instagramUrl: 'https://www.instagram.com/a1z3k',
    avatarImagePath: ''
  },
  {
    displayName: 'YUNG HAVOC',
    initials: 'YH',
    role: 'Featured Artist',
    instagramUrl: 'https://www.instagram.com/yungxhavoc',
    avatarImagePath: ''
  },
  {
    displayName: 'JDRVENGE',
    initials: 'JD',
    role: 'Featured Artist',
    instagramUrl: 'https://www.instagram.com/jdrvenge',
    avatarImagePath: ''
  },
  {
    displayName: 'ONLYTRUEPERSPECTIVE',
    initials: 'OTP',
    role: 'Production / Creative Direction / Platform',
    instagramUrl: 'https://www.instagram.com/onlytrueperspective',
    avatarImagePath: '/assets/songwars/otp-mark.png'
  }
].map((person) => Object.freeze(person));

const SONG_WARS_CONFIG = Object.freeze({
  eventTitle: 'THE SMACK CLUB: SONG WARS',
  headline: 'Independence Day Song Wars Weekend',
  subheadline: '20 artists. Direct battles. Community voting. Bragging rights.',
  confirmedCount: 12,
  goalCount: 20,
  spotsLeft: 8,
  progressPercent: 60,
  discordInviteUrl: 'https://discord.gg/Awk2b7RSW',
  posterImagePath: '/assets/songwars/songwars-poster.jpg',
  posterResponsiveSources: Object.freeze([
    Object.freeze({ path: '/assets/songwars/songwars-poster-480.webp', width: 480 }),
    Object.freeze({ path: '/assets/songwars/songwars-poster-672.webp', width: 672 }),
    Object.freeze({ path: '/assets/songwars/songwars-poster-800.webp', width: 800 }),
    Object.freeze({ path: '/assets/songwars/songwars-poster-1200.webp', width: 1200 }),
    Object.freeze({ path: '/assets/songwars/songwars-poster-1600.webp', width: 1600 })
  ]),
  posterFallbackSources: Object.freeze([
    Object.freeze({ path: '/assets/songwars/songwars-poster-480.jpg', width: 480 }),
    Object.freeze({ path: '/assets/songwars/songwars-poster-672.jpg', width: 672 }),
    Object.freeze({ path: '/assets/songwars/songwars-poster-800.jpg', width: 800 }),
    Object.freeze({ path: '/assets/songwars/songwars-poster-1200.jpg', width: 1200 }),
    Object.freeze({ path: '/assets/songwars/songwars-poster.jpg', width: 1600 })
  ]),
  otpLogoPath: '/assets/songwars/otp-mark.png',
  seoTitle: 'Song Wars Weekend | OnlyTruePerspective',
  seoDescription: 'Join The Smack Club: Song Wars — 20 artists, direct battles, community voting, and Independence Day Weekend energy.',
  eventDateLabel: 'Sunday, July 5, 2026',
  eventDateIso: '2026-07-05',
  primaryHost: '4reign',
  featuredParticipants: Object.freeze(['A1ZEK', 'SPOOKY', 'ELI3GANT', 'YUNG HAVOC', 'JDRVENGE']),
  people: Object.freeze(people),
  publicShareUrl: 'https://onlytrueperspective.tech/songwars',
  canonicalUrl: 'https://www.onlytrueperspective.tech/songwars',
  posterAlt: 'Independence Day Song Wars Weekend poster for The Smack Club'
});

module.exports = SONG_WARS_CONFIG;
