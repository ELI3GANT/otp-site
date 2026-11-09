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

## 8. Public editorial system · November 2026

The user's redesign explicitly supersedes the previous gold-only public direction. Existing campaign-specific identities remain intentional. New company surfaces use shared tokens in `public-system.css`. The OTP accent comes from the refresh palette in `theme-chrono.js`; it stays consistent while visitors move between public pages and rotates on refresh. Booking uses the same accent through its service cards, form steps, and calls to action.

- Ink / `--surface-primary`, `--ink`: #101110; panel / `--surface-secondary`: #1c1e1a.
- Paper / `--text-primary`, `--paper`: #f1f0e8; secondary text: #b7bbb0.
- Accent / `--accent-otp`: selected palette color; contrast foreground / `--accent-otp-ink`; rule / `--border-default`: #3c4036.
- Muted paper text: #54594c; paper rule: #c7cabf.
- Typography: existing Helvetica Neue stack with heavy negative-tracked display and mono folios. Display clamp(3.5rem, 11vw, 10rem); hero wordmark clamp(3rem, 10.9vw, 11rem); h2 clamp(2.25rem, 5.5vw, 5rem); h3 clamp(1.5rem, 3vw, 2.75rem); body 1rem/1.6; lead clamp(1.125rem, 2vw, 1.5rem); labels .75rem/1.4.
- Layout: 1440px max, gutters clamp(20px, 4vw, 64px), sections clamp(64px, 9vw, 144px). Existing 4px spacing scale retained. Editorial grid 7:5 / 5:7, mobile single column. Corners square; structural 1px rules; no floating cards or glass.
- Hero: paper wordmark on ink, palette accent inset and real OTP emblem. Slow palette light and a subtle emblem drift add movement without shifting the layout or delaying content.
- Paper surfaces alternate deliberately at major content roles: portfolio teaser and capabilities, framed by dark intro and Signal. Project art supplies additional color; product and campaign pages retain their own identities.

### Shared public primitives and states

`public-shell.js` exports the header/footer used by static shell sync and project rendering. Desktop navigation: Home / Archive / Signal / Studio / Start a project. Native details menu on mobile works without JS; Escape closes and restores focus; page links remain real anchors. Current page is `aria-current=page`. Utility links (portal, services, journal, legal) live in the footer. Menu is in normal flow with no focus-trap or scroll lock.

`public-system.css` provides `.public-wrap`, `.public-section`, `.public-label`, `.public-title`, `.public-lead`, `.public-button`, `.public-text-link`, `.public-header`, `.public-footer`, `.public-paper`, `.public-cta`. Links have underlines or arrow affordances. 44px minimum interactive targets. Focus uses a 2px contrasting outline and 4px offset. Hover transitions use 180ms ease-out, image link zoom uses 320ms ease-out (1.025 scale); active buttons shift 1px; all movement disabled under reduced motion. All content visible without animation/JS.

`public-motion.js` adds an inert palette light layer and a single entrance for sections below the first viewport. Entrances use IntersectionObserver, opacity, and an 18px translation. Ambient light follows a closed, slow path over 28 and 38 seconds and pauses in background tabs. Reduced-motion preference removes the atmosphere and immediately reveals every section, including when the preference changes during a visit.

Archive: collection buttons and search first; optional native details houses status/category/year/technology and timeline. Broad collections are All, Products & systems, Client work, Music & events, Featured. Image-led card: image, index/type, title, short sentence, project-story link and quieter service enquiry. Hero card spans width; two-up supporting work; no repeated technology/service lists until project pages. Clear resets every field, collection and result count. Empty state has usable reset.

Project story: readable static server-rendered HTML, real screenshot or comparison with caption, factual scope, contextual narrative, related work. Phone screenshots use contain and intrinsic dimensions. No invented release verification or outcomes.

### Audience and accessibility

Prospective clients must find relevant work then start an enquiry. Creative visitors must reach Signal and the media archive without wading through sales copy. Returning clients reach portal from every company footer. Keyboard/touch users receive native controls, visible focus, search labels, result announcements, reduced motion and no hover-only navigation. Mobile: single column, full-sized images, readable metadata, wrapped collection controls. CMS/admin, booking/payment, protected access and remote FIXLINE remain independent.

### Accepted implementation boundary

Legacy campaign/product styling can keep its own palette; shared navigation connects the ecosystem. Legacy `styles.css` stays available for operational and older pages; new Home, Archive, Studio and project stories do not load its accumulated overrides. Old visual snapshot assertions must be replaced by meaningful behavioral coverage where this explicitly authorized redesign changes their expected layout.

### Public day and night modes

The shared first-paint theme controls page surfaces, text, borders, navigation, form states, and logo contrast. A 44px sun/moon control in the shared header uses the same saved manual preference as booking; changes synchronize across tabs without changing the selected palette. Shared layouts use a compact menu at 1000px and below. Legal and journal reading surfaces follow the selected mode. Intentional paper callouts and dark product demonstration panels keep explicit contrasting text. FloorOps supplies its own daylight surface overrides while preserving readable product demonstration panels.

## November 2026 visual and intake continuation

Preserve the entire homepage hero layout and typography. Below it, feature the approved FLOIVATION case study using its existing published screenshot, concise project context, and line icons. Studio uses a native SVG/CSS discipline map and icon-led capability/process cards. The map's 36/48-second orbital loops and 12-second node drift pause in hidden tabs; the shared reduced-motion override removes movement. No animation dependencies or invented outcome claims.

The homepage eye reveals the original logo through an animated SVG mask in about 2.4 seconds, once per page load. Four stroke order/direction variants avoid consecutive repetition when session storage is available. Completion and reduced-motion changes restore the original image; image loading failure leaves the static fallback. Public cross-origin intake links carry only allowlisted palette, mode, service and package preferences; private/admin APIs remain unchanged. Fast Lanes keep their keyboard selection and package mapping while using one-sentence, icon-led cards.

## Homepage LORE transmission

Replace only the homepage Signal teaser; preserve the hero, portfolio and other destinations. Minimal visible content: ELI3GANT, LORE, Rollout / OTP Signal, and Enter Signal. The LORE word is a large live typographic artwork, replacing S01. The always-dark inset uses `--lore-surface: #080a09`, `--lore-text: #f1f0e8`, `--lore-muted: #a6b0a7`, `--lore-rule: #303831`, and a brightened current OTP accent (`color-mix(in srgb, var(--accent-otp) 60%, white)`) so it remains legible inside either outer page mode. Chromatic ghost: `--lore-ghost: #80e8d5`.

Use existing public gutter, mono/sans stacks and section spacing. Artwork display `clamp(4rem,22vw,22rem)` / 700 / .86; artist line `clamp(1.25rem,3vw,2.75rem)`; labels .75rem; 4px spacing grid. Four fixed letter cells prevent layout shifts while characters change. Native links and a 44px motion pause control retain clear focus outlines. Screen readers receive the stable artist and heading, while random glyphs remain decorative.

Motion: sparse 26–44-second vertical ASCII trails with duplicated halves for a seamless cycle, low opacity and pointer transparency; 24-second scan pass; short 720ms decrypt bursts no more than once per 6.8–10 seconds, and no more than 3 text updates per second. Chromatic displacement is limited to narrow text slices with no full-panel flash. Start only when the section is on-screen, pause for hidden tabs and off-screen sections, restore exact text on interruption, and completely freeze under reduced motion. A native pause/resume button allows visitors to stop this persistent artistic motion independently. Without JS the final type, textured field and destination remain visible.

Mechanism references: react-bits [DecryptedText](https://reactbits.dev/r/DecryptedText-TS-TW.json) for fixed glyph cells, stable accessible copy and decrypt-to-final text; beui [Text Animation](https://beui.dev/r/text-animation/raw) for viewport/reduced-motion gating. Only mechanisms are adapted to vanilla JS/CSS; no catalog source or animation library is shipped. Scope debt: this is a campaign treatment inside one homepage section, not a new global glitch theme. No release date, streaming availability or campaign outcome is claimed.

### Start a Project context sidebar

The left `booking-context` becomes a compact companion to the existing four-step form. Keep every summary ID and all form behavior. Use the existing section label, heading `A clear next step.` at clamp(1.5rem,2.5vw,2.25rem), three line-icon rows (Review / Plan / Build), one short no-payment note, and a two-by-two live summary. Neutral rules, shared mode tokens, 44px targets and public type stacks remain. No repeated operational document lists or oversized stacked headline. Mobile keeps this compact block after the form so the primary entry comes first.

## Website design service page · V2 continuation

The dedicated `/website-design` page uses the shared public editorial system and seven refresh palettes. Replace text-heavy service explanation with real project imagery and concise icon-led information. Preserve the existing canonical `.html` URL, service schema, enquiry routing and shared day/night controls.

The hero uses a 7:5 desktop grid, shared display type (`clamp(3.5rem,7.5vw,7rem)` / 500 / .95 / -.065em), a real FLOIVATION browser-frame screenshot with an explicit in-production label, and two clear enquiry/work links. Use Helvetica Neue and the mono labels already documented. Shared surface/text/accent/rule tokens drive every new panel; existing 4px spacing grid, 1440px maximum and public gutters apply. Mobile stacks at 800px; every image reserves intrinsic dimensions.

Primitives: line-icon capability card (Build / Refine / Connect / Launch), screenshot case-study card with factual status, a native range-controlled HYH before/after comparison with labelled sides and a full-story link, a four-step process rail, native FAQ disclosures and the shared closing enquiry action. The comparison uses real before/after assets, 0–100 percent input and a 50-percent default; CSS clips the after image without reflow. Keyboard arrows and native touch input work. Without JS both labelled images are shown side by side. Decorative browser chrome, icons and illustrative miniatures are hidden from assistive technology.

Motion reuses shared autonomous 28/38-second ambient light, below-fold section entrances and restrained 320ms image hover (1.025 scale). No additional animation dependency or continuous JavaScript loop. Pointer interaction on the comparison changes a CSS custom property; reduced motion keeps the same controls and static content. No results, customer metrics, price or release availability are invented. FLOIVATION remains in production; HYH is presented as a website redesign.

FLOIVATION public status is now Live with ongoing development. The client-owned site is https://floivation.life/; its shop is a coming-soon destination with its first drop being prepared. Preserve historical Nov 6 screenshot/video dates and clarify that the live site can evolve beyond those captures. Case study and Archive expose the live URL; no personal client name, store checkout capability, release date, sales or performance result is inferred.
