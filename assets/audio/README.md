# BLACKBOX SIGNAL — Audio Teaser Vault

This directory holds the active unreleased audio teaser for **BLACKBOX SIGNAL**.

## Active Teaser Location
```
/assets/audio/blackbox-signal.mp3
```

## Production Guidelines for Teasers
1. **Teaser Length**: Export a purpose-made **20–30 second snippet** (the strongest section/hook/drop), not the full unreleased master recording.
2. **Format**: MP3 (192kbps – 320kbps recommended for fast mobile streaming over cellular).
3. **Protection**: The browser streams this short teaser directly. Because it is only a 20-30s teaser clip, there is zero risk of leaking full unreleased songs.

## Rolling Out the Next Signal
To move from `SIGNAL 001` to `SIGNAL 002`:
1. Drop the new teaser into `/assets/audio/blackbox-signal-002.mp3` (or overwrite `blackbox-signal.mp3`).
2. Open `/signal-config.js` and update:
   - `signalNumber: "002"`
   - `signalName: "SIGNAL 002"`
   - `audioSource: "/assets/audio/blackbox-signal-002.mp3"`
   - Optional: update timeline or release links if a previous signal graduated into an official release.
