# Changelog

All notable changes to this project will be documented in this file.

## [15.15.0] - 2026-03-29

### Added
- **Smart Animation Throttling:** Implemented `IntersectionObserver` in `stars-v2.js` to automatically pause the starfield's `requestAnimationFrame` loop when the canvas is hidden, saving battery on mobile.
- **Adaptive Spectral Aura:** Injected `background-attachment: scroll` fallback for mobile devices to prevent pixelation in iridescent branding.
- **Project Consult Integration:** Formalized the 'Project Consult' service tier across the UI and contact form mapping.
- **Stripe Webhook Prototype:** Added architectural foundation for real-time payment synchronization in `server.js`.

### Fixed
- **Mobile Scroll Shifting:** Eradicated "ghost scrolling" by enforcing dual-layer `html` + `body` locking with `scrollbar-gutter: stable`.
- **API Centralization:** Unified all frontend fetch requests to use `window.OTP.getApiBase()`, resolving environmental inconsistencies between local dev and live gateway.
- **Audit Engine Hardening:** Integrated email regex validation and smooth "Scroll to Hero" transitions on success.
- **Realtime Stability:** Prevented redundant polling intervals and hardened database connection diagnostics in the Admin Terminal.


## [1.5.0] - 2026-03-24

### Added
- **Mobile Responsive Audit:** Comprehensive audit and refinement of all mobile viewports.
- **Micro-Scale Typography:** Added ultra-compact scaling (down to 375px) for the main Hero title to ensure "PERSPECTIVE" never overflows.
- **Light Mode Drawer Polish:** Fixed contrast for navigation drawer links in Light Mode (white text on dark gradient).

### Fixed
- **Nav Drawer Alignment:** Synced the `top` offset of the mobile drawer with the reduced header height on the Archive page (60px instead of 70px) to eliminate gaps.
- **Footer Centering:** Improved mobile footer layout with centralized stacking for a cleaner visual profile.
- **Payment API 405:** Completely resolved the Stripe Payment "Method Not Allowed" error by implementing dynamic API routing for GitHub Pages to Vercel communication.

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