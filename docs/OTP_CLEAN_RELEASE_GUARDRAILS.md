# OTP Clean Release Guardrails

## Clean Scoped Release

Never deploy from `/Users/eli/OTP/otp-site` while it has unrelated dirty work. That checkout is allowed to hold experiments, audits, and in-progress files, but production deploys must come from a clean scoped release/worktree that contains only the reviewed patch files.

## Release Manifest

Each production release must keep a manifest with these fields:

- `includedFiles`: files intentionally shipped.
- `excludedDirtyFiles`: dirty files left out of the release.
- `generatedArtifactsExcluded`: local or generated files removed from the release.
- `testsRun`: local test commands and pass/fail result.
- `browserQa`: browser QA result, including homepage dark/light, booking, client portal, and `/os`.
- `authenticatedSweep`: authenticated sweep pass/fail only, with no secret values.
- `deploymentTarget`: Vercel project, preview URL, aliases, and live verification routes.

## Guard Script

Use `scripts/verify_release_scope.js` before any deploy:

```bash
node scripts/verify_release_scope.js --manifest=release-manifest.json
```

The guard blocks:

- primary dirty checkout deploys
- files outside the release manifest
- `.env` files
- HAR files
- `output/playwright` artifacts
- `test-report.xml`
- `node_modules`

Only set `OTP_ALLOW_PRIMARY_DIRTY_DEPLOY=1` for a local diagnostic that will not be deployed.

## Dirty Checkout Audit

Before every scoped release, record the dirty state of both local workspaces:

```bash
git -C /Users/eli/OTP/otp-site status --short
git -C /Users/eli/OTP/otp-os status --short
find /Users/eli/OTP/otp-site -maxdepth 3 \( -name '*.har' -o -name 'test-report.xml' -o -path '*/output/playwright/*' -o -name '.env*' \) -print
find /Users/eli/OTP/otp-os -maxdepth 4 \( -name '*.har' -o -name 'test-report.xml' -o -path '*/output/playwright/*' -o -name '.env*' \) -print
```

Categorize every finding before release:

- `production-shipped`: already committed and represented in the clean release.
- `experimental`: local work that must not ship until reviewed.
- `generated-artifact`: test reports, HAR files, screenshots, build caches, and local output.
- `docs-worth-keeping`: documentation that should ship in a separate docs release or be added to the manifest.
- `safe-to-delete-after-approval`: generated files that can be removed only after approval.
- `needs-stash`: local work to preserve outside the release.
- `needs-separate-commit`: intentional work that should not ride with an unrelated release.
- `should-be-gitignored`: repeat generated artifacts that should never appear in release scope.

`otp-os` is now a git repo, so staged or modified dashboard/iOS files must be handled with the same discipline. Current unrelated app-icon asset work, local `.env`, and `output/playwright` screenshots are not release material for `otp-site`.

## Required Release Gates

Before aliasing production:

```bash
npm test
npm run security:scan
npm run build:speed-insights
npm run master_test:ci
npm run prod:full-sweep
git diff --check
```

Run the authenticated sweep from runtime-compatible secret material held only in subprocess memory or a temporary ignored env file that is deleted immediately after the check. Report pass/fail only.

## Visual Regression Rules

Homepage deploys must verify:

- no checkerboard or tiled pseudo-layer behind the hero
- dark and light stars visible
- no horizontal overflow
- no console errors
- Enter Vault present and interactive
- `speed-insights-bundle.js` loads

Do not restore visual files by rolling back the whole app. Preserve booking, source tracking, admin auth, client portal, `/os`, and Oracle contracts.

## Booking / Fast Lane Regression Rules

Booking deploys must verify:

- package card clicks remain on Step 1
- Fast Lane offers are visible as cards on `/bookings`, not only hidden in a dropdown
- the Next button is the only normal step progression path
- required fields block progression
- source and UTM tracking stay in the booking payload and `OTP_BOOKING_META`
- selected Fast Lane metadata stays in the booking payload and `OTP_BOOKING_META`
- `otp-attribution.js` must not throw during `captureOnLoad`; UTM capture failures are release blockers because they silently weaken source tracking.
- Fast Lane selections map canonically:
  - `Same-Day Reel` -> `The Signal`
  - `Event Promo` -> `The Signal`
  - `Business Content Pack` -> `The Engine`
  - `Brand Launch Pack` -> `Custom Build`
- mocked browser submit is intercepted during QA; no real email, Stripe charge, or real client mutation
