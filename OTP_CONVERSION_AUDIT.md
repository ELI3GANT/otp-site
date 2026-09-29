# OTP conversion audit

Date: 2026-09-20

## Scope

This sprint improves the path from discovery to trust to booking to proposal to client while keeping the polished homepage, pricing ladder, routes, Signal, Engine, System, Archive, OTP OS, and FIXLINE boundaries intact.

## Journey audit

| Stage | Current surface | Finding | Action |
| --- | --- | --- | --- |
| Discovery | Homepage, Archive, Studio, service pages | Homepage is already polished. Several non-home generic public CTAs still pointed to FIXLINE. | Route generic public CTAs to `/bookings` and keep clearly labeled FIXLINE review links separate. |
| Trust | Archive cards and project stories | Project pages had strong media and narrative but did not consistently explain problem, solution, deliverables, result, capabilities, or next step. | Add factual case-study blocks for the six existing projects. No new metrics or testimonials. |
| Booking | `/bookings` | The form, package ladder, validation, OS handoff, and source payload already exist. Confirmation lacked a clear response window and post-submit file path. | Add response expectation, next-step language, and an additional-files link that preserves attribution. |
| Proposal | OTP OS | Proposal and payment stages live inside the operational writer and client portal boundary. | Document the boundary; do not add a second CRM or public proposal system. |
| Client | OTP OS and Client Portal | Public site can submit a lead and hand it to OTP OS; downstream status and payment truth remain operational data. | Document owner and required lead fields in the acquisition playbook. |

## Shipped conversion improvements

### Archive and proof

- Added problem, solution, deliverables, result, capabilities, and next-step blocks to existing project stories.
- Added factual CreativeWork JSON-LD, canonical URLs, Open Graph URLs, and complete social metadata to project detail pages.
- Kept FIXLINE’s project CTA on `/fixline/intake?source=archive-fixline`.
- Routed every non-FIXLINE project detail CTA to its existing attributed general booking route.
- Left the homepage selected-work flow unchanged.

### Booking and entry offer

- Kept `/bookings` as the only general booking system.
- Clarified the review sequence and response expectation after submission.
- Added a safe link for additional files/details through the existing OTP Project Intake path.
- Added **OTP Quick Fix / Digital Fix** to Studio as a quote-first entry offer. It covers one focused website, mobile, booking/contact-flow, landing-page, or small automation repair. The public guidance band is $250–$750 after review; final price remains quote-first and admin-controlled, routing into existing Signal/System delivery. It does not create a fourth package.

### Attribution and analytics boundary

- Preserved first/last touch capture and source query parameters.
- Added selected service, selected package, conversion stage, and completed-booking fields to the final booking payload.
- Kept source values bounded and server-sanitized.
- Documented the public-to-OTP-OS measurement boundary in `OTP_ATTRIBUTION_MAP.md`.
- Did not fabricate proposal, won, or paid analytics on the marketing site.

### Trust and discovery

- Generic public navigation now leads to general booking; FIXLINE remains a labeled diagnostic path.
- Booking copy states quote-first behavior, review, handoff, and the secure file path.
- Booking structured data now describes OTP services across Rhode Island, Massachusetts, and remote work.
- Project detail pages expose truthful CreativeWork metadata and Archive relationships.
- No fake logos, awards, testimonials, traffic numbers, or client outcomes were added.

## Deliberate boundaries

- The homepage was not redesigned or lengthened.
- Signal, Engine, System, Custom, and existing price configuration were not replaced.
- No duplicate CRM or booking system was created.
- OTP OS is the operational owner for leads, proposals, payments, and client records. The sibling OTP OS checkout was not available in this workspace, so the existing handoff contract and writer-boundary documentation remain the source of truth.
- No public Vault project record was added because no approved public case-study data was present in this checkout. Existing Vault files and unrelated local edits were left untouched.
