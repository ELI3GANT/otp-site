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
