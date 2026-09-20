# OnlyTruePerspective Design System

## 1. Atmosphere & Identity

OnlyTruePerspective is a premium, cinematic operating system with a public-facing editorial edge. Core OTP surfaces use black, warm white, restrained gold, glass, and precise system typography. Campaign pages may introduce one event-owned accent while retaining a quiet OTP mark and the same disciplined spacing, accessibility, and production quality. The signature is controlled contrast: bold creative work framed by calm, exact UI.

## 2. Color

### Palette

| Role | Token | Value | Usage |
|---|---|---:|---|
| Surface/primary | `--surface-primary` | `#050505` | Main OTP background |
| Surface/secondary | `--surface-secondary` | `#111111` | Cards and panels |
| Surface/elevated | `--surface-elevated` | `#181818` | Elevated controls |
| Text/primary | `--text-primary` | `#f7f7f2` | Headlines and body |
| Text/secondary | `--text-secondary` | `#b8b8b0` | Supporting copy |
| Text/inverse | `--text-inverse` | `#050505` | Text on light or accent fields |
| Border/default | `--border-default` | `#323232` | Structural dividers |
| Border/strong | `--border-strong` | `#f7f7f2` | Poster-style frames |
| Accent/OTP | `--accent-otp` | `#d5b56c` | Restrained OTP brand detail |
| Accent/event | `--accent-event` | `#00f53d` | Song Wars CTAs and progress only |
| Accent/event-hover | `--accent-event-hover` | `#64ff84` | Song Wars interactive hover |
| Accent/event-ink | `--accent-event-ink` | `#001a08` | Text on neon green |
| Status/error | `--status-error` | `#ff4d4d` | Errors and destructive states |

### Rules

- Core OTP pages remain black, warm white, and restrained gold.
- A campaign page may use exactly one event-owned accent; Song Wars uses neon green.
- Event accent is reserved for status, progress, focus, and primary actions.
- New production CSS defines these values once as custom properties and consumes the properties thereafter.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|---|---|---:|---:|---:|---|
| Display | `clamp(4rem, 15vw, 11rem)` | 900 | 0.82 | -0.07em | Event hero title |
| H1 | `clamp(2.75rem, 8vw, 6rem)` | 900 | 0.9 | -0.05em | Page title |
| H2 | `clamp(2rem, 5vw, 4rem)` | 800 | 0.95 | -0.04em | Section title |
| H3 | `1.25rem` | 800 | 1.1 | -0.02em | Card title |
| Body/large | `1.125rem` | 500 | 1.55 | -0.01em | Lead copy |
| Body | `1rem` | 450 | 1.6 | 0 | Default copy |
| Body/small | `0.875rem` | 550 | 1.5 | 0.01em | Secondary information |
| Label | `0.75rem` | 750 | 1.2 | 0.12em | Metadata and overlines |

### Font Stack

- Primary: `"Helvetica Neue", Helvetica, Arial, sans-serif`
- Mono: `"SFMono-Regular", Consolas, "Liberation Mono", monospace`
- Display weight may use `Arial Black` as the first face while remaining in the primary sans family.

### Rules

- Use no more than the primary and mono stacks.
- Body copy never renders below 14px.
- Display type uses `clamp()` and deliberate line breaks to prevent four-line wrapping.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a 4px base.

| Token | Value | Usage |
|---|---:|---|
| `--space-1` | `4px` | Tight inline separation |
| `--space-2` | `8px` | Compact groups |
| `--space-3` | `12px` | Labels and controls |
| `--space-4` | `16px` | Mobile gutters |
| `--space-5` | `20px` | Comfortable control spacing |
| `--space-6` | `24px` | Card padding |
| `--space-8` | `32px` | Card groups |
| `--space-10` | `40px` | Internal section rhythm |
| `--space-12` | `48px` | Section transitions |
| `--space-16` | `64px` | Page rhythm |
| `--space-20` | `80px` | Desktop section spacing |
| `--space-24` | `96px` | Major desktop separation |

### Grid

- Maximum public content width: 1440px.
- Public pages use a 12-column desktop grid, 24px gutters, and 16px mobile margins.
- Standard breakpoints: 640px, 768px, 1024px, 1280px.
- Hero asymmetry is intentional: campaign copy leads while the event artwork remains visually dominant.

## 5. Components

### Public campaign header

- **Structure**: skip link, event wordmark, event date, restrained OTP mark.
- **Spacing**: `--space-4` through `--space-8`.
- **States**: static except for the linked OTP mark when present.
- **Accessibility**: meaningful landmark and alt text; mark never replaces the page heading.

### Action link

- **Variants**: event-primary, inverse-secondary.
- **Spacing**: minimum 48px target with `--space-4` inline padding.
- **States**: default, hover, active, focus-visible.
- **Accessibility**: descriptive text, visible keyboard focus, external-link relationship attributes.
- **Motion**: micro transform only; disabled by reduced-motion preference.

### Stat tile

- **Structure**: machine-readable label and prominent value.
- **Spacing**: `--space-4` on mobile, `--space-6` on larger screens.
- **Accessibility**: never relies on color alone; progress is also exposed as text and a native progress element.

### Poster frame

- **Structure**: responsive image inside a high-contrast border.
- **Spacing**: media uses intrinsic aspect ratio and no decorative content overlay that obscures the source artwork.
- **Accessibility**: concise event-specific alt text.

### OTP attribution mark

- **Variants**: header and footer.
- **Rules**: monochrome, low visual weight, and smaller than the event identity.

### Artist registration rail

- **Structure**: one node per available artist slot, with confirmed nodes filled and remaining nodes outlined.
- **Accessibility**: supplements the visible count and native progress element; it never carries status by color alone.
- **Motion**: confirmed nodes may breathe with opacity and transform only, and become static under reduced motion.

### Event announcement panel

- **Structure**: compact bracket, judging, and prize updates grouped as one bordered editorial field.
- **Surface**: borders-only with a single event-accent edge; no glass treatment or repeated shadows.
- **Content**: unresolved details remain explicitly pending and never imply finalized tournament rules.

### Featured person card

- **Structure**: circular local avatar or durable monogram fallback, display name, role, and an Instagram action.
- **Surface**: compact bordered row; the host receives the only accent-border variant.
- **States**: subtle lift and border-color change on hover, clear focus-visible treatment on the profile link.
- **Accessibility**: profile links name the person and destination; decorative monograms are hidden from assistive technology.

### Atmospheric field

- **Structure**: fixed, pointer-transparent green light, grain, and dust layers behind page content.
- **Motion**: slow transform and opacity only; no canvas, timers, scroll listeners, or layout animation.
- **Restraint**: atmosphere remains subordinate to the poster and preserves text contrast.

### Scroll reveal

- **Structure**: progressive enhancement on section-level groups only; content remains visible when JavaScript is unavailable.
- **Motion**: opacity, transform, and blur removal using the emphasis easing.
- **Accessibility**: all reveals render immediately when reduced motion is requested.

### Archive collection rail

- **Structure**: horizontally scrollable collection controls above the detailed filters; one active collection at a time.
- **States**: default, hover, focus-visible, and `aria-pressed` active state.
- **Accessibility**: controls remain native buttons with 44px minimum targets and do not rely on color alone.

### Archive filter panel

- **Structure**: project search plus category, status, year, and technology selects sourced from the central project library.
- **Surface**: compact bordered field with no modal or hidden filter state.
- **Accessibility**: every control has a visible label, keyboard focus, live result count, and a clear-filter action.

### Archive case-study card

- **Structure**: intrinsic project artwork, status and launch metadata, title, summary, disciplines, services, technology, and action row.
- **Variants**: featured two-up card and full-width standard card; both collapse to a single media-first column on mobile.
- **Actions**: live project link is primary; unavailable full case studies use an explicit disabled state until a durable URL exists.
- **Media**: source dimensions are declared to prevent layout shift; artwork may use `contain` only when the full composition must remain visible.

### Archive timeline

- **Structure**: chronological project entries rendered from the same project data as the cards.
- **Desktop**: restrained horizontal rule with one marker per project.
- **Mobile**: single vertical rule with readable stacked entries and no horizontal scrolling.

### Branded route fallback

- **Structure**: OTP mark, compact error label, clear message, and a restrained action group for Home, Archive, and booking.
- **Surface**: always-dark layered field using the shared off-black, warm-white, border, and accent tokens; subtle dot/orbit detail stays decorative and pointer-transparent.
- **Routing**: all fallback assets and destinations are root-relative so the page remains intact at nested unknown paths.
- **Accessibility**: the mark has a useful label, the error title is the main heading, actions use visible focus treatment, and decorative layers are hidden from assistive technology.

### FIXLINE service hero

- **Structure**: restricted-beta eyebrow, direct business-diagnostic headline, concise consultant-review framing, primary intake action, secondary process anchor, and a restrained signal field.
- **Surface**: core OTP black, warm white, quiet gold, tonal bands, and structural borders; no disconnected SaaS dashboard treatment.
- **States**: actions use the shared hover, active, and focus-visible behavior; signal cells remain static because they are explanatory, not interactive.
- **Accessibility**: one page heading, explicit intake/process labels, 48px actions, and no meaning conveyed through color alone.

### Diagnostic signal grid

- **Structure**: compact cards for inspectable business surfaces or review categories, using a label and one factual supporting line.
- **Responsive**: one column at 320px, two from 640px, and three from 1024px without horizontal scrolling.
- **Surface**: borders-only cards with a single gold index detail; no repeated shadows.

### Consultant audit process rail

- **Structure**: numbered steps that distinguish automated intake, consultant review, and separately scoped paid implementation.
- **Content**: promises only prioritized findings, observations, recommended next moves, and an optional implementation path.
- **Accessibility**: ordered-list semantics, visible phase labels, and natural document flow at every breakpoint.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|---|---:|---|---|
| Micro | 140ms | ease-out | Button hover and press |
| Standard | 240ms | ease-in-out | Small surface transitions |
| Emphasis | 480ms | cubic-bezier(0.16, 1, 0.3, 1) | Optional hero entry |

Ambient loops run between 8 and 18 seconds with linear or ease-in-out timing. They remain subtle, use only transform and opacity, and stop under reduced motion.

- Animate only `transform`, `opacity`, or `filter`.
- Every interactive element has hover, active, and focus-visible states.
- Respect `prefers-reduced-motion: reduce` and remove non-essential movement.
- Anchor navigation uses native scrolling; no forced scroll JavaScript.

## 7. Depth & Surface

The default public campaign strategy is **borders-only**. Strong rules, contrast blocks, and tonal fields create hierarchy; generic glass cards and decorative shadows are avoided. A single offset event-accent edge may frame featured artwork, but repeated floating shadows are not part of the system.

| Type | Value | Usage |
|---|---|---|
| Default | `1px solid var(--border-default)` | Section and tile structure |
| Strong | `2px solid var(--border-strong)` | Featured poster and major fields |
| Accent | `4px solid var(--accent-event)` | One campaign emphasis edge |

## 8. Public editorial system · September 2026

The user's redesign explicitly supersedes the previous gold-only public direction. Existing campaign-specific identities remain intentional. New company surfaces use the following shared tokens in `public-system.css`:

- Ink / `--surface-primary`, `--ink`: #101110; panel / `--surface-secondary`: #1c1e1a.
- Paper / `--text-primary`, `--paper`: #f1f0e8; secondary text: #b7bbb0.
- Accent / `--accent-otp`: #dcff5f acid yellow; rule / `--border-default`: #3c4036.
- Muted paper text: #54594c; paper rule: #c7cabf.
- Typography: existing Helvetica Neue stack with heavy negative-tracked display and mono folios. Display clamp(3.5rem, 11vw, 10rem); hero wordmark clamp(3rem, 10.9vw, 11rem); h2 clamp(2.25rem, 5.5vw, 5rem); h3 clamp(1.5rem, 3vw, 2.75rem); body 1rem/1.6; lead clamp(1.125rem, 2vw, 1.5rem); labels .75rem/1.4.
- Layout: 1440px max, gutters clamp(20px, 4vw, 64px), sections clamp(64px, 9vw, 144px), compact sections clamp(56px, 7vw, 104px). Existing 4px spacing scale retained. Editorial grid 7:5 / 5:7, mobile single column. Corners square; structural 1px rules; no floating cards or glass.
- Hero: paper wordmark on ink, acid typographic inset and real OTP emblem. No perpetual decorative motion or blocking loader.
- Paper surfaces alternate deliberately at major content roles: portfolio teaser and capabilities, framed by dark intro and Signal. Project art supplies additional color without new UI accents.

### Shared public primitives and states

`public-shell.js` exports the header/footer used by static shell sync and project rendering. Desktop navigation: Home / Archive / Signal / Studio / Start a project. Native details menu on mobile works without JS; Escape closes and restores focus; page links remain real anchors. Current page is `aria-current=page`. Utility links (portal, services, journal, legal) live in the footer. Menu is in normal flow with no focus-trap or scroll lock.

`public-system.css` provides `.public-wrap`, `.public-section`, `.public-label`, `.public-title`, `.public-lead`, `.public-button`, `.public-text-link`, `.public-header`, `.public-footer`, `.public-paper`, `.public-cta`. Links have underlines or arrow affordances. 44px minimum interactive targets. Focus uses a 2px contrasting outline and 4px offset. Hover transitions use 180ms ease-out, image link zoom uses 320ms ease-out (1.025 scale); active buttons shift 1px; all movement disabled under reduced motion. All content visible without animation/JS.

Archive: collection buttons and search first; optional native details houses status/category/year/technology and timeline. Broad collections are All, Products & systems, Client work, Music & events, Featured. Image-led card: image, index/type, title, short sentence, project-story link and quieter service enquiry. Hero card spans width; two-up supporting work; no repeated technology/service lists until project pages. Clear resets every field, collection and result count. Empty state has usable reset.

Project story: readable static server-rendered HTML, real screenshot or comparison with caption, factual scope, contextual narrative, related work. Phone screenshots use contain and intrinsic dimensions. No invented release verification or outcomes.

### Audience and accessibility

Prospective clients must find relevant work then start an enquiry. Creative visitors must reach Signal and the media archive without wading through sales copy. Returning clients reach portal from every company footer. Keyboard/touch users receive native controls, visible focus, search labels, result announcements, reduced motion and no hover-only navigation. Mobile: single column, full-sized images, readable metadata, wrapped collection controls. CMS/admin, booking/payment, protected access and remote FIXLINE remain independent.

### Accepted implementation boundary

Legacy campaign/product styling can keep its own palette; shared navigation connects the ecosystem. Legacy `styles.css` stays available for operational and older pages; new Home, Archive, Studio and project stories do not load its accumulated overrides. Old visual snapshot assertions must be replaced by meaningful behavioral coverage where this explicitly authorized redesign changes their expected layout.

### Public motion · September 2026

- Shared editorial pages and VAULT use one optional entrance: 480ms emphasis easing, 16px upward travel, and opacity from 0 to 1. Sections taller than 1.2 viewports animate their heading only, keeping large media and filter surfaces stable. Only targets initially below the viewport are prepared, so the hero, anchor destinations, and back/forward restoration remain immediately readable. Each target enters once; no scroll hijacking or continuous loop.
- Shared navigation and action links use the existing 140–240ms motion scale for arrow travel and underline/opacity feedback. The mobile navigation opens with a short opacity/transform transition while native `details` remains operable without JavaScript.
- Motion is progressively enhanced by `public-shell.js` on the company and VAULT pages. Without JavaScript or IntersectionObserver, content stays visible. `prefers-reduced-motion: reduce` removes section movement and all shared transitions; changes to that preference while the page is open also reveal pending content.
- Privacy and terms are static reading surfaces; policy sections do not receive entrance motion.
- FIXLINE is a separate proxied application and keeps its own design and motion rules. WeatherOS, Protocol, Signal, and Song Wars retain their product-specific motion; shared polish must not override it.
