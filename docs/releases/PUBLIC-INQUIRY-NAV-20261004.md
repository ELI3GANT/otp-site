# Project Inquiry navigation micro-fix — 2026-10-04

Application change: bookings.html top navigation Services href changed from `/website-design` to `/studio`. Visible label stays Services. Existing Home `/`, Portfolio `/archive`, inquiry anchor `#booking-form` and footer inquiry `/bookings` verified; no other navigation changes needed.

No styling, layout, form behavior, service mappings, accent logic, analytics or server routes changed.

Files: bookings.html; tests/bookings_contract.test.js; release-manifest.json; release-manifest-site.json; docs/releases/PUBLIC-INQUIRY-NAV-20261004.md.

Validation: navigation contract passed; 53/53 local test programs; 53/53 canonical-live API test programs; 106/106 browser checks, including four-step Review, canonical service mappings, keyboard and responsive regression coverage. Local browser Services click opens /studio. Security scan passed across 325 files; four pinned contracts verified; production Speed Insights bundle built; whitespace check passed. No production inquiry submitted.

Release: protected production-release.yml, clean scoped release gate, fresh authenticated sweep before deployment, custom-domain verification afterward. Production verified:

- App source SHA: `1be08a8972c630335bbfe66f5b30269b5bb81ce3`.
- Protected workflow [https://github.com/ELI3GANT/otp-site/actions/runs/37238856722](https://github.com/ELI3GANT/otp-site/actions/runs/37238856722): both jobs passed, including fresh authenticated sweep and post-deployment checks.
- Vercel `dpl_2ZJTEHh5wpQwZvY3pD37FnTeQZBw` is READY and serves the correct custom-domain aliases.
- Live Services click opened https://www.onlytrueperspective.tech/studio. Home, Portfolio and current inquiry links remain canonical.
- Live custom-domain Inquiry completed Need → Scope → Contact → Review with Video production / editing and The Signal recommendation. Consent remained unchecked; no submission performed. Form reset afterward. No console errors/warnings.
- Four inquiry aliases and 17 public route reads returned 200; 13 exact asset comparisons matched source, allowing only Cloudflare email protection normalization for HTML. Apex redirects to www successfully.
- Proof records: /tmp/otp-nav-production-proof.json, /tmp/otp-nav-live.png and /tmp/otp-nav-live-review.png.
- Evidence-only closeout commit follows the deployed application source; it does not change the app.

No server routes added or changed. Inquiry aliases /book, /booking, /bookings, /book-otp continue to serve the same page. The next operational migration belongs to OTP OS/client portal separately and is outside this tiny public navigation fix.
