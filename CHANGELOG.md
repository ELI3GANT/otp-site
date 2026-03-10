# Changelog

All notable changes to this project will be documented in this file.

## [1.4.1] - 2026-03-10

### Added
- **Universal Neon Glitch:** Refactored `NeonController` to `site-init.js` to enable "Neon Glitch" effect for logos on all site pages (`archive.html`, `insights.html`, `privacy.html`, `terms.html`, `insight.html`).
- **Logo Restore:** Automatically applied `nav-logo-neon` and `footer-logo-neon` IDs to all header and footer logos to ensure a unified flickering brand identity.

### Changed
- **Server Identity:** Updated API status version to `1.4.1`.

### Fixed
- **Light Theme Select Fix:** Injected custom SVG arrow into `select` elements in light mode to ensure visibility on all browsers.
- **Admin Persistence:** Improved theme and maintenance state synchronization between client and server.

## [1.4.0] - 2026-03-08

### Added
- **Agent Menu & Archetypes:** Implemented `model_config` parsing in the AI generation pipeline, giving the system fine-grained control over model temperature, token limits, and top_p values.
- **Reply Manager Agent Selection:** The Secure Inbox now features a dynamic agent selector, allowing the user to dictate which archetype drafts the reply.
- **Settings Persistence:** API Keys (OpenAI, Gemini, Anthropic, Groq) and Satellite URLs are now rigorously saved to `localStorage` across sessions. 
- **Settings Persistence Tests:** Created `tests/settings_persistence_test.js` to ensure configurations never unexpectedly drop.
- **Neon Perspective Controller:** Added an interactive, asynchronous glitch-neon effect to the hero "PERSPECTIVE" text, which saves its active/inactive state.

### Changed
- **Oracle Brain Upgrade:** The Perspective Audit engine was upgraded from the deprecated `gemini-1.5-pro` model to the superior `gemini-2.5-pro`, utilizing the `systemInstruction` format.
- **Asset Optimization:** Injected `loading="lazy"` onto high-resolution YouTube thumbnails to improve Time-To-Interactive (TTI).
- **Featured Work Thumbnails:** Migrated from `hqdefault.jpg` (4:3 with black bars) to `maxresdefault.jpg` (16:9 native) for a cinematic, edge-to-edge finish.
- **Terminal Settings UI:** Replaced the static text toggle for Cloud Settings with a sleek, interactive dropdown component featuring a rotating chevron.
- **Command Tile UX:** Active global settings (Maintenance, Theme, Kursor, Visuals) now illuminate their parent Command Tile in the admin dashboard for immediate visual confirmation.

### Fixed
- **Mobile Menu Scroll-To-Top Bug:** Removed the invasive `height: 100vh` on the `nav-open` state and replaced it with `touch-action: none` to freeze scrolling without losing the user's position on the page.
- **Mobile Menu Cutoff:** Adjusted the `nav-drawer` to sit flush under the mobile header and added internal scrolling (`overflow-y: auto`) to prevent items from being unreachable on smaller screens.
- **Mobile Text Overflow:** Implemented global `word-break: break-word` and refined hero title `clamp()` rules to prevent massive text blocks from causing horizontal scrolling on screens under 480px.
- **Token Limits:** Increased the Oracle's `maxOutputTokens` from 500 to 1500 to prevent complex, multi-layered AI strategies from being truncated mid-sentence.
- **Archetype Scope Bug:** Fixed an undefined reference error (`targetArch`) in the `incrementArchetypeUsage` telemetry tracker.