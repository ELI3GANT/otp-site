# Public video and portfolio release — 2026-10-03

## Result and scope
Video leads the homepage and service list. Three existing curated films appear in a muted showcase, with five-second playback cuts from varied positions, full-film links, pause, loading/error fallback, off-screen suspension, Reduce Motion and Save-Data handling. The Archive route is presented as Portfolio, with video categories before the existing seven project stories. Mobile navigation explains each destination. Six readable accent colors rotate on reload and remain consistent during navigation between Home, Portfolio, and Services. The new 1200×630 JPEG sharing image and video-first metadata apply to those three pages.

No new application routes. Changed public surfaces: `/`, `/archive`, `/studio`, and the shared navigation/footer on existing public HTML pages. New public assets: `/home-reel.js`, `/public-accent.js`, `/assets/films/*.jpg`, `/assets/seo/otp-video-studio-20261003.jpg`. Existing booking aliases, project URLs, music route, portal, and operational APIs remain available. The only server diff is the YouTube script-host CSP allowance.

This worktree starts at deployed commit `20b4f4a`. The unreleased private-portal handoff commit `dca1d35` and primary checkout dirty work are excluded.

## Changed files
- `.github/workflows/production-release.yml`
- `archive.css`
- `archive.html`
- `assets/films/fame-and-fortune.jpg`
- `assets/films/froze-tour.jpg`
- `assets/films/tjs-night.jpg`
- `assets/seo/otp-video-studio-20261003.jpg`
- `consultant-audit.html`
- `docs/releases/PUBLIC-VIDEO-20261003.md`
- `home-reel.js`
- `home.css`
- `package.json`
- `index.html`
- `insight.html`
- `insights.html`
- `privacy.html`
- `public-accent.js`
- `public-shell.js`
- `public-system.css`
- `release-manifest-site.json`
- `release-manifest.json`
- `scripts/prod_full_sweep.js`
- `scripts/prod_terminal_sweep.js`
- `server.js`
- `speed-insights-bundle.js`
- `studio.html`
- `terms.html`
- `tests/homepage_visual_contract.test.js`
- `tests/marketing_site_contract.test.js`
- `tests/master_runner.js`
- `tests/public_showcase.test.js`
- `tests/seo_indexing_contract.test.js`
- `weatheros-privacy.html`
- `weatheros.html`
- `weatheros/index.html`
- `weatheros/privacy.html`
- `weatheros/support.html`
- `website-design.html`

## Verification
- 53/53 local test programs, including real-library membership, cut timing, transition pause, timeout retention, off-screen pause, and motion/data-saving tests.
- 53/53 master CI programs using the canonical live API.
- 63/63 adversarial browser checks.
- Secret scan, pinned contracts, Speed Insights build, syntax, and whitespace checks passed.
- Manual browser checks: 320, 390, 768, and 1440 px on Home, Portfolio, and Services; no horizontal overflow. Real YouTube PLAYING state and different clips were observed. Music-video filtering works. Reload changes accent. Reduce Motion shows a static poster without loading the player.
- Browser viewport checks are not physical-device evidence. Local public sweep skips admin checks because credentials are unavailable; production workflow must authenticate before deployment.

## Deployment checklist
- [x] Isolated from last deployed production source.
- [x] Tests, browser QA, build and local secret scan.
- [x] Fresh authenticated backend sweep verified: run 37158506968; deployment stopped at the clean-source check.
- [ ] Clean scoped release gate on final commit.
- [ ] Protected workflow fresh authenticated sweep, browser regression checks, and Vercel production build/deploy.
- [ ] Canonical post-deploy exact refreshed title, new image/script assets and live browser checks.

The sweep accepts the prior or new title before deployment and requires the exact refreshed title after deployment. No source gate or authenticated check is disabled. Existing shared-image URLs remain available for old links. iMessage/social services control their caches; old message cards may retain earlier artwork.

## Next migration
Release the private portal read delegation separately after the canonical OTP OS client route and role isolation have their own release evidence.

## Release repair
Run 37158506968 passed unit, browser and authenticated checks, then correctly blocked deployment because esbuild emitted a machine-specific symlink path comment. The build now uses `--preserve-symlinks` to keep module paths identical across local worktrees and Linux CI. No release check was removed. Final candidate is rerun through the complete protected workflow.
