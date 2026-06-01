# OTP Release Manifest Guide

Use this guide when preparing `release-manifest.json` for a clean scoped release. The manifest is release evidence: do not mark checks as passed until they have run in the release workspace.

## Required Fields

- `releaseName`: short release identifier.
- `includedFiles`: every file intentionally included in the scoped release.
- `excludedDirtyFiles`: every dirty, staged, ignored, or generated file reviewed and excluded, with reason.
- `generatedArtifactsExcluded`: local artifact patterns confirmed outside the release.
- `testsRun`: exact commands and pass/fail status.
- `browserQa`: surfaces verified, viewport coverage, console status, and pass/fail result.
- `authenticatedSweep`: pass/fail only, no token or passcode values.
- `deploymentTarget`: project, preview URL, aliases, and live verification routes.

## Minimum Manifest Template

```json
{
  "releaseName": "otp-release-name",
  "includedFiles": [],
  "excludedDirtyFiles": [],
  "generatedArtifactsExcluded": [".env", ".env.*", "node_modules", "output/playwright", "test-report.xml", "*.har"],
  "testsRun": [],
  "browserQa": {
    "status": "pending",
    "summary": ""
  },
  "authenticatedSweep": {
    "status": "pending",
    "summary": "pass/fail only"
  },
  "deploymentTarget": {
    "project": "",
    "previewUrl": "",
    "aliases": []
  }
}
```

## Scope Rules

- Deploy from a clean scoped release or clean worktree, not a dirty development checkout.
- Keep `otp-site` and `otp-os` release manifests separate when both change.
- Never include `.env`, HAR files, local screenshots, test reports, Vercel state, or node modules.
- Do not carry stale `excludedDirtyFiles` forward. Re-audit and rewrite the list for each release.
- If a file is committed separately before release, remove it from `excludedDirtyFiles` and mention the commit in the final report instead.

## Required Evidence

Before deployment, the manifest should prove:

- homepage desktop/mobile dark/light passed without checkerboard artifacts, overflow, or console errors
- Fast Lane cards are visible, selectable, and stay on Step 1
- booking payload preserves `service_type`, `package_interest`, `selected_fast_offer`, `fast_lane_package`, source/UTM tracking, platform, and timestamp
- `/client/test-safe-portal-token`, `/os`, `/os/app.js`, and `/os/styles.css` work
- unauthenticated admin sweep returns 401, bad token returns 403, and canonical authenticated sweep passes
- no real emails, Stripe charges, or real client mutations occurred
