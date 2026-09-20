# OTP attribution map

## Purpose

OTP keeps source context attached to a public booking without adding third-party tracking or exposing private operational records. A source identifies the path that earned the request; it does not override the selected service, package, or admin-entered price.

## Canonical source names

| Source | Typical entry point | Booking route | Notes |
| --- | --- | --- | --- |
| `homepage-hero` | Homepage hero Start a project | `/bookings?source=homepage-hero` | Primary general project path |
| `archive-hyh` | HYH Archive card/detail | `/bookings?source=archive-hyh&service=website-business-fix` | Website and business-presence work |
| `archive-weatheros` | WeatherOS Archive card/detail | `/bookings?source=archive-weatheros&service=product-design` | Product and mobile work |
| `archive-otpos` | OTP OS Archive card/detail | `/bookings?source=archive-otpos&service=business-systems` | Business systems work |
| `archive-protocol` | PROTOCOL Archive card/detail | `/bookings?source=archive-protocol&service=artist-campaign` | Artist rollout work |
| `archive-songwars` | Song Wars Archive card/detail | `/bookings?source=archive-songwars&service=event-community-rollout` | Event and community work |
| `archive-fixline` | FIXLINE Archive card/detail | `/fixline/intake?source=archive-fixline` | FIXLINE-only diagnostic funnel |
| `instagram` | Social post or profile link | `/bookings?source=instagram` | Use for general project inquiries |
| `direct-outreach` | Personalized outbound message | `/bookings?source=direct-outreach` | Pair with a specific observation |
| `referral` | Referred introduction | `/bookings?source=referral` | Preserve the referrer in notes when volunteered |
| `local-outreach` | Local business outreach | `/bookings?source=local-outreach` | Use for Rhode Island or Massachusetts prospects |
| `fixline` | Clearly labeled FIXLINE audit/review entry | `/fixline/intake?source=fixline` | Never use for a generic project CTA |

`public-nav`, `public-mobile`, `public-footer`, `archive`, `studio`, and `journal` remain valid internal source labels for their respective surfaces. New campaign links should use one of the canonical names above.

## What is persisted

The browser helper in `otp-attribution.js` captures first and last touch values in bounded local/session storage. The booking payload carries:

- source and CTA source
- first and last touch snapshots
- landing path and referrer
- UTM source, medium, campaign, content, and term
- platform and capture timestamps
- selected service
- selected package
- `conversion_stage=booking_completed`
- `completed_booking=true`

`POST /api/bookings/submit` sanitizes the payload and stores the source context in booking metadata as `source_tracking` and `source_metadata`. The canonical booking envelope then hands the record to OTP OS under the existing `otp-booking-intake-v1` contract.

## Measurement boundary

The public site can truthfully observe page views, CTA clicks in the existing browser surface, booking starts, and completed booking submissions. Proposal creation, deal status, payment status, and won/lost outcomes belong to OTP OS and its operational records. The site does not create a second CRM or invent those downstream events.

## Safety rules

- Keep values bounded and sanitized.
- Do not put email addresses, private notes, service keys, or portal tokens in source parameters.
- Preserve `fixline` as a separate funnel.
- Keep source tracking additive; it must never overwrite package pricing or business truth.
