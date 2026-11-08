# FLOIVATION case study release record

**Prepared:** 2026-11-08
**Client project state:** In production
**Case-study approval:** Client approved public presentation on 2026-11-08
**Portfolio state:** Public case study and Archive card are included in the guarded production release.

## Story and media

- The comparison documents the original Beacons page and the redesign preview observed in the signed-in Lovable workspace on 2026-11-06. The redesign preview is private and is not presented as a public client-owned website.
- The case study describes visible pages and features only. It states that the client site remains in production and makes no launch or performance claims.
- Six approved portfolio assets are included: the before and after captures, the transformation film and poster, and both Recordly walkthroughs. The transformation film uses the rerecorded site walkthrough, shows the gym clip moving within the page, and closes with the OnlyTruePerspective logo.
- The editable Recordly projects, original exports, film master, source captures, and source gym clip remain in `/Users/eli/OTP/floivation-production/` and the Recordly project folder. The production web encodes are separate optimized assets.
- No client personal name appears in the public case study, archive card, or public copy.

## Portfolio integration

- Public page: `/projects/floivation`, with an indexable canonical URL, social metadata, and the six approved media assets.
- Archive: its own card uses the redesigned homepage capture, Client Work / In Progress labels, a case-study link, and a tailored Start a Project CTA. The card is present in both the static fallback and the client-side Archive renderer.
- Sitemap: `/projects/floivation` is listed. The project is not featured on the homepage.
- The Archive and case study both state that the client-owned website remains in production.

## Verification

- Passed: case-study and Archive contract checks; full local and live CI suites (54/54 each); browser adversarial suite (51/51); four pinned contracts; secret scan across 348 files; Speed Insights build; and the HTTP-only predeploy sweep (34 public checks).
- Passed: local Chrome review at 1440 × 900, 768 × 1024, and 390 × 844. The case-study route returned 200, the Archive showed one card, all three videos had controls, the three feature icons appeared, the page had no horizontal overflow or console errors, and the comparison slider responded to keyboard and touch input.
- Basic accessibility markup checked: one page heading, image alt text, labeled comparison control, video controls, and visible keyboard focus.
- Still unverified: mobile Safari, same-state source captures, full-page source captures, and the client-owned live website URL. The case study does not imply these are complete.
- The production release workflow pins Ubuntu 24.04 so its Playwright browser installation runs on a supported CI image. The previous workflow attempt stopped before deployment because the `ubuntu-latest` image had moved to unsupported Ubuntu 26.04.
- The workflow must rerun the authenticated production sweep using the repository's protected `OTP_ADMIN_TOKEN` before deployment.

## Editorial rating

**8/10 for the OTP portfolio.** The story is clear, the videos and comparison make the work tangible, the dedicated card fits the Archive, and the copy keeps the client-site status and outcomes accurate. The missing same-state/full-page captures and mobile Safari review keep it short of a polished 9 or 10.
