# OTP public final polish — 2026-10-04

Scope: final consistency pass; public visual system and structure preserved. No server, portal, schema, operational writer, pricing, or protected release changes.

## Exact copy changes

- Inquiry choices, in order: **Video production / editing**, **Creative direction / campaign**, **Website / digital product**, **Business system / automation**, **Something custom**.
- Inquiry hero: “Tell us what you’re looking to make. We’ll review the scope and follow up with the right next step or a quote. No payment required.”
- Inquiry metadata: “Tell OnlyTruePerspective what you would like to make. We will review the scope and follow up with a quote or next step.” JSON-LD description makes the same build-to-make substitution; service list now video/creative/digital/systems.
- Inquiry scope question: “What would you like to make or improve?”
- Inquiry navigation: “Archive” → “Portfolio”.
- Archive empty heading: “No matching work.” → “No projects in this category yet.” Removed “Try a different search or reset the filters to see every project.” Action: “See all work ↗” → “View all work ↗”.
- Studio engagement CTA: “Discuss a launch ↗” → “Discuss a campaign ↗”.
- All seven project contact headings: “Have something / worth building?” → “Have a project / in mind?”
- Project action labels preserved; destinations now use each project’s existing contextual inquiry link, with `source=project-<slug>`. FIXLINE retains its dedicated review intake. Other projects no longer incorrectly route into FIXLINE.

## Canonical booking mappings and recommendations

| Public choice | Existing service_type | Default suggestion |
| --- | --- | --- |
| Video production / editing | Video / Content | The Signal; campaign/series scope can suggest The Engine |
| Creative direction / campaign | Brand Launch | The Engine |
| Website / digital product | Website / Digital System | The Engine; connected-system scope can suggest The System |
| Business system / automation | Business System | The System |
| Something custom | Custom Build | The System |

Legacy `AI / Automation` deep links resolve to Business System. Existing artist-campaign, event-community-rollout and launch-package aliases resolve to Brand Launch; product-design and website-business-fix to Website / Digital System; business-systems to Business System; same-day-signal to Video / Content. Backend enums, package prices, four steps, consent, attribution, submission endpoint and writer ownership remain unchanged.

## Archive mapping preserved

All: eight films then all seven selected projects. Video: eight films. Digital: HYH, WeatherOS, OTP FIXLINE, OTP OS, VAULT. Music / Campaigns: PROTOCOL, SongWars. No projects removed.

## Files changed

- archive.html
- bookings.html
- bookings.js
- project-stories.js
- studio.html
- tests/archive_case_study_contract.test.js
- tests/bookings_contract.test.js
- tests/e2e/adversarial_qa.js
- tests/seo_indexing_contract.test.js
- release-manifest.json
- release-manifest-site.json
- docs/releases/PUBLIC-FINAL-POLISH-20261004.md

## Validation

- Full local suite: 53/53 test programs passed.
- Canonical live API suite: 53/53 programs passed.
- Browser suite: 106/106 checks passed. Five choices exercised through all four steps and intercepted submission; eight aliases checked. No production inquiry submitted and no claims of production persistence from mocked requests.
- Home, Archive, Studio, Signal and Inquiry compared at desktop 1440 and mobile 390; responsive checks additionally at 320 and 768. Zero horizontal overflow across seven public routes; keyboard/validation/menu/history/no-JS/Reduce Motion regression checks retained.
- All seven project story pages return 200 locally; contract tests verify contextual conversion links and project attribution.
- Studio icon viewboxes and footer arrow geometry/fill checks passed. No new icon or layout rewrite needed.
- Secret/security scan passed across 324 files; four pinned contracts verified; Speed Insights production bundle built; syntax and whitespace checks passed.
- Local public production sweep passed; authenticated checks require CI credentials. Last successful authenticated baseline: workflow 37232725779 at 65e8ae776010b1bae94452af5a18007bd5300434. Candidate workflow must freshly pass authenticated checks before deployment.

## Routes and release checklist

No routes added or server route definitions changed. Public content updated at /archive, /studio, /book, /booking, /bookings, /book-otp, and all seven /projects/:slug pages. Homepage/Signal/shared header/footer reviewed and preserved. Existing portfolio and booking destinations retained with corrected project-specific CTA routing.

Release checklist: clean scoped checkout; complete manifest; release gate; protected production-release.yml with CLEAN_RELEASE; fresh authenticated sweep; prebuilt production deploy; READY status; canonical custom-domain and apex checks; deployed source/asset verification.

Next migration: continue client portal and OTP OS separately under their operational writer and native release policies; this public polish does not certify that separate release.

Production outcome: pending protected workflow and custom-domain verification.
