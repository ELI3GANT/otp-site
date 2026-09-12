# BLACKBOX SIGNAL — Audio Teaser Vault

This directory holds the active unreleased audio teaser for **BLACKBOX SIGNAL**.

## Supported Input Formats
- **`.mp3`** (`audio/mpeg`) — **Recommended**. Highest compatibility and fastest cellular streaming on mobile / Instagram traffic.
- **`.m4a`** (`audio/mp4` / AAC) — Modern high-efficiency compression.
- **`.wav`** (`audio/wav`) — Uncompressed studio master format (supported, though larger file sizes may slow cellular loading).

## Active Teaser Location(s)
Place any of the following into this directory:
```
/assets/audio/blackbox-signal.mp3
/assets/audio/blackbox-signal.m4a
/assets/audio/blackbox-signal.wav
```
If multiple formats are present, the player uses browser capability detection (`canPlayType`) and prioritizes MP3/M4A for speed, falling back to WAV.

## Production Guidelines for Teasers
1. **Teaser Length**: Export a purpose-made **20–30 second snippet** (the strongest section/hook/drop), not the full unreleased master recording.
2. **Dynamic Duration**: The player automatically reads the exact file length from audio metadata. Whether your teaser is 0:21, 0:33, or 0:42, the progress bar and timestamp adjust seamlessly.
3. **Protection**: The browser streams this short teaser directly. Because it is only a 20-30s teaser clip, there is zero risk of leaking full unreleased songs.

## Rolling Out the Next Signal
To move from `SIGNAL 001` to `SIGNAL 002`:
1. Drop the new teaser into `/assets/audio/blackbox-signal-002.mp3` (or overwrite `blackbox-signal.mp3`).
2. Open `/signal-config.js` and update:
   - `signalNumber: "002"`
   - `signalName: "SIGNAL 002"`
   - `audioSources: [{ src: '/assets/audio/blackbox-signal-002.mp3', type: 'audio/mpeg' }]`
