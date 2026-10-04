# OTP public clarity pass — 2026-10-04

## Messaging and scope
Primary identity: **Video Production & Creative Studio**. The homepage headline, visual tokens, typography, colors, motion, layout, and video reel stay intact. Its supporting line is now: “Music videos, event recaps, editing, and creative direction. Digital experiences built around the work.”

Studio opening: “OnlyTruePerspective is a Video Production & Creative Studio. Films first. Creative direction connects the work; websites, apps, and systems extend it.” Existing Home and Studio service rows now run Video Production & Editing → Creative Direction & Campaigns → Websites & Digital Products → Business Tools & Connected Systems. Homepage metadata, Archive metadata, founder introduction, and shared footer reinforce that hierarchy. Signal remains the artistic side; its files are unchanged.

## Archive mapping
- All: eight existing films first, all seven existing projects afterward.
- Video: all eight films.
- Digital: HYH Architecture & Design, WeatherOS, OTP FIXLINE, OTP OS, VAULT.
- Music / Campaigns: PROTOCOL, THE SMACK CLUB: SONG WARS.

One existing-style category rail replaces public search, discipline/status/year/technology refinement, duplicate video filters, and numeric result counts. Metadata and card statuses remain. Category URLs and back/forward navigation work; legacy collections normalize without invisible advanced filtering. Timeline remains optional. No project or case-study link was removed.

## Routes
No server routes, redirects, proxy mappings, backend contracts, or operational writers changed. Archive’s final Start a project link now opens `/bookings?source=archive` rather than FIXLINE intake. Project-specific inquiry and FIXLINE links remain unchanged. Studio section anchors are preserved after reordering.

## Verification
- 53/53 local test programs; 80/80 Chromium browser checks.
- All seven project-story URLs return 200 locally.
- Home, Archive, Studio, Signal, booking, WeatherOS, Song Wars fit 320, 390, 768, 1440px with no horizontal overflow.
- Category mapping/history/deep links/adversarial queries, no-JS static stories, Reduce Motion visibility, and mobile menu passed.
- Four-step inquiry reaches review in browser tests; no production inquiry or payment was submitted. This does not certify separate intake persistence or OTP OS/native releases.
- Local secret scan, four pinned contracts, Speed Insights build, syntax and whitespace passed.
- Canonical live API master suite and public read-only sweep passed before release. Local authenticated production checks are unavailable; the protected workflow must run them fresh before any deployment. Song Wars registration and poster checks remain intentionally deferred, as in the prior public release.
- Desktop browser layout and 390px browser-test screenshot inspected. Browser viewport evidence is not physical-device evidence.

## Files changed
- `DESIGN.md`
- `archive.css`
- `archive.html`
- `archive.js`
- `consultant-audit.html`
- `index.html`
- `insight.html`
- `insights.html`
- `privacy.html`
- `public-shell.js`
- `studio.html`
- `terms.html`
- `tests/archive_case_study_contract.test.js`
- `tests/e2e/adversarial_qa.js`
- `tests/marketing_site_contract.test.js`
- `tests/seo_indexing_contract.test.js`
- `tests/archive_url_sync_and_fallback.test.js`
- `tests/youtube_video_contract.test.js`
- `weatheros-privacy.html`
- `weatheros.html`
- `weatheros/index.html`
- `weatheros/privacy.html`
- `weatheros/support.html`
- `website-design.html`
- `docs/releases/PUBLIC-CLARITY-20261004.md`
- `release-manifest.json`
- `release-manifest-site.json`

## Deployment checklist
- [x] Clean scoped branch based on verified deployed public source; dirty portal/backend checkout excluded.
- [x] Local automated, browser, security, build, contracts and public production reads.
- [ ] Final clean release gate and protected workflow fresh authenticated checks.
- [ ] Vercel production build/deploy and canonical post-deploy asset/route checks.

## Next migration
Keep the private portal read delegation and OTP OS client/native release work in a separate change with their own identity/isolation and release evidence.

## Release gate repair
Initial run 37231131909 blocked deployment because two legacy contracts still demanded the removed database count and film filters. The local summary had missed their failures. Those assertions now exercise category URL normalization/history and the curated rail, while preserving static fallback, quote, booking, video safety, and routing coverage. The entire suite is rerun before release; no gate is bypassed.
