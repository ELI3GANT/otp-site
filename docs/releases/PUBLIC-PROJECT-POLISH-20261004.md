# OTP public project and music polish — 2026-10-04

## Result
Homepage secondary work is labeled “Digital worlds, built around the work.” HYH and WeatherOS now use aligned desktop frames, contained full screenshots, clear website/app labels, consistent 44px arrows inside the existing linked cards, and full-width mobile cards. The phone screenshot is no longer visually staggered or cropped. OTP OS remains linked below the pair.

The music teaser identifies ELI3GANT, with “The music. The story behind it.” Its copy names the music timeline and lore from PROTOCOL into LORE. Both the teaser button and Signal display card open `/signal`. Existing Signal styling, player/audio, codecs, and release links are preserved. The timeline now contains PROTOCOL (out now) and SIGNAL / LORE (next chapter / unreleased); the speculative redacted future step is removed. No dates, new audio, or release completion are invented.

Every shared footer navigation link now contains one consistent arrow inside its existing anchor. The brand wordmark and Back to top retain their own existing presentation. Privacy and Terms links also have arrows. Public CSS/script versions are bumped on existing consuming pages, including project stories.

The project inquiry page loads the same accent selector as Home and derives its action/form accent tokens from that selection. Navigating from Home retains the selected color; refresh continues using the existing rotation behavior. Booking logic, package choices, submission, payments, backend routes, and portal operations are untouched.

## Icon consistency
All fifteen Studio service, engagement, process, and FAQ icons now share a clean 24px viewbox and 1.5px rounded stroke. The ambiguous wrench is replaced by a creative pen. Shared header/footer and homepage project arrows use crisp SVGs inside their existing links. Decorative vectors are hidden from screen readers and cannot take focus. Light-surface icons use a darker accent tint for readability. Existing OTP branding and audio/artwork are preserved. Browser QA checks all fifteen paths stay inside their viewboxes.

## Routes
No routes or server logic changed. Existing `/`, `/signal`, `/bookings`, category and project links remain. The new clickable Signal display uses the existing `/signal` destination.

## Verification
- 53/53 local test programs and 53/53 with the canonical live API.
- 88/88 browser checks: aligned desktop image frames, full phone-image containment, clickable footer arrows, Home-to-inquiry accent continuity, music-card navigation, existing Archive mappings/history, all seven project stories, no-JS, Reduced Motion, booking review, responsive 320/390/768/1440px and mobile menu.
- Local secret scan, four pinned contracts, Speed Insights build, syntax and whitespace passed.
- Desktop project previews and 390px mobile cards inspected; no physical-device claim.
- Public production read-only sweep passed; local authenticated checks unavailable. The protected workflow must run them fresh before deployment. Existing Song Wars registration/poster deferrals remain.
- No real production inquiry/payment was submitted. This does not certify separate OTP OS/native release or canonical intake persistence.

## Changed files
- `archive.html`
- `bookings.css`
- `bookings.html`
- `consultant-audit.html`
- `home.css`
- `index.html`
- `insight.html`
- `insights.html`
- `privacy.html`
- `project-stories.js`
- `protocol.html`
- `public-shell.js`
- `public-system.css`
- `signal-config.js`
- `signal.html`
- `songwars.html`
- `studio.html`
- `studio.css`
- `terms.html`
- `tests/bookings_contract.test.js`
- `tests/e2e/adversarial_qa.js`
- `tests/signal_contract.test.js`
- `weatheros-privacy.html`
- `weatheros-support.html`
- `weatheros.html`
- `weatheros/index.html`
- `weatheros/privacy.html`
- `weatheros/support.html`
- `website-design.html`
- `docs/releases/PUBLIC-PROJECT-POLISH-20261004.md`
- `release-manifest.json`
- `release-manifest-site.json`

## Deployment checklist
- [x] Scoped clean branch, dirty portal/backend checkout excluded.
- [x] Local unit/browser/build/security/contracts and public live reads.
- [ ] Final clean release gate and protected workflow authenticated checks.
- [ ] Vercel build/deploy and canonical live asset/route/browser verification.

## Next migration
Keep private portal read delegation and OTP OS identity/isolation/native releases separate from this public visual change.

Initial public polish run 37232390293 was canceled before deployment to incorporate the user-requested icon pass. The updated candidate must complete the full protected workflow.
