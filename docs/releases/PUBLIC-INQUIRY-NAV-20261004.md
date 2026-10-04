# Project Inquiry navigation micro-fix — 2026-10-04

Application change: bookings.html top navigation Services href changed from `/website-design` to `/studio`. Visible label stays Services. Existing Home `/`, Portfolio `/archive`, inquiry anchor `#booking-form` and footer inquiry `/bookings` verified; no other navigation changes needed.

No styling, layout, form behavior, service mappings, accent logic, analytics or server routes changed.

Files: bookings.html; tests/bookings_contract.test.js; release-manifest.json; release-manifest-site.json; docs/releases/PUBLIC-INQUIRY-NAV-20261004.md.

Validation: navigation contract passed; 53/53 local test programs; 53/53 canonical-live API test programs; 106/106 browser checks, including four-step Review, canonical service mappings, keyboard and responsive regression coverage. Local browser Services click opens /studio. Security scan passed across 325 files; four pinned contracts verified; production Speed Insights bundle built; whitespace check passed. No production inquiry submitted.

Release: protected production-release.yml, clean scoped release gate, fresh authenticated sweep before deployment, custom-domain verification afterward. Production outcome pending.

No server routes added or changed. Inquiry aliases /book, /booking, /bookings, /book-otp continue to serve the same page. The next operational migration belongs to OTP OS/client portal separately and is outside this tiny public navigation fix.
