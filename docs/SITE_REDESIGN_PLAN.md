# Public site redesign · 20 September 2026

## Audit

The clean baseline passes 51 existing suites (some integration checks explicitly skip without credentials). Home has 16 sections, overlapping capabilities, two video catalogs, repeated sales paths, an inline intake, and unverified testimonial copy. Archive has six data-driven projects, eight collection controls and five filter fields, duplicated timeline content, and a clear-filter control with no listener. All project stories are empty URLs. Signal is a working independent audio experience. Public headers are copied with inconsistent links. Public CSS contains successive override layers; loading those on newly redesigned pages would retain the conflict.

The route inventory includes Home, Archive (/vault alias), Signal, six portfolio subjects, WeatherOS/support/privacy, Song Wars, PROTOCOL, Insights/detail, website-design, consultant-audit, booking aliases, legal pages, 404, and protected client/portal/terminal/OS surfaces. FIXLINE is a remote proxy in both Express and Vercel. Operational paths remain owned by the existing backend and OTP OS.

## Architecture

- `/`: brand introduction, three-project Archive teaser, concise capabilities, Signal invitation, project CTA.
- `/archive`: curated six-project portfolio with meaningful collection filters/search; film and media collection below; compact optional timeline.
- `/projects/:slug`: six public stories using existing data and imagery, scope, context, live experience, related work, booking.
- `/studio`: company/founder, capabilities, engagement/process, FAQ. Commercial detail belongs here and on existing service pages.
- `/signal`: audio/artistic experience with clear Archive/OTP navigation.
- Existing product/campaign URLs: live experiences, linked from project stories.
- Supporting service, journal, legal pages: common navigation. Booking, portal, payment, terminal and APIs retain their contracts.
- Existing homepage fragment URLs remain as logical section anchors to relevant summaries/deeper links.

## Direction

User explicitly authorized a departure from gold. Ink, warm paper, acid yellow; large editorial typography, asymmetrical image compositions, full-width typographic moments, native scrolling and restrained interaction. Real project media only. Keep recognizable OTP mark. No fabricated social proof, results or product screenshots.

## Work plan

1. Completed: source/route/test audit and desktop/mobile baseline.
2. Completed: shared design tokens/navigation primitives, Home and Studio.
3. Completed: curated Archive and six project detail routes.
4. Completed: integration across supporting public pages and Signal navigation.
5. Completed: tests/build/security, internal links, browser flows, responsive capture matrix, and independent visual reviews.
6. In progress: clean commit, existing production workflow, and live verification.

## QA scope

375, 768, 1280 desktop/mobile widths plus 320 narrow and 1440 recording width. Home, Archive filters/reset/empty/search, Studio, all six project stories, Signal play/pause/navigation, existing product/campaign pages, booking aliases and portal availability. No real submissions/payments. New behavior needs runtime tests; update superseded presentation assertions deliberately while retaining data, security, attribution and routing coverage. Latest final brief authorizes commit, push on existing main branch, production workflow, and live verification. Primary Start a project actions now converge on /fixline/intake; package-specific booking remains a secondary existing service path.
