# AGENTS.md

Codex and other agentic tools working in this repository must treat `otp-site` as the permanent production root for OnlyTruePerspective.

## OTP Ecosystem Structure

- `otp-site` is the root app for `onlytrueperspective.tech`.
- `otp-os` is the existing admin/business dashboard. Read it for migration reference, but do not delete, rewrite, or damage it.
- Production-facing code should live in `otp-site` unless a change clearly belongs to the old dashboard during a controlled migration.
- Shared backend routes live under `otp-site/server.js` and `/api/*`.
- Public static pages live at the repository root as `.html`, `.css`, and `.js` files.
- Current Vercel deployment is an Express app through `server.js`, not a Next.js app.

Target route map:

- `/` public OTP site
- `/book`, `/booking`, `/bookings`, `/book-otp` public booking/intake aliases
- `/client/:portalToken` secure client portal
- `/os` protected OTP OS dashboard, currently proxied to `https://otp-os.vercel.app`
- `/oracle` protected OTP Oracle interface, future local module
- `/agents` protected AI agent command center, future local module
- `/content` protected content engine, future local module
- `/api/*` shared backend/API layer

## Current Root App

`otp-site` is the root app and domain owner. Do not move the domain to `otp-os`. Do not replace the live public site with the admin dashboard. The first unification layer is Vercel routing:

- `/os` proxies to `https://otp-os.vercel.app`
- `/os/:path*` proxies to `https://otp-os.vercel.app/:path*`

The current `vercel.json` uses legacy `routes`. Keep new routing changes inside that route array unless the entire deployment config is migrated deliberately.

## OTP OS Migration Strategy

Use small slices:

1. Keep the proxy working while users continue using OTP OS.
2. Inventory OTP OS features and map each one to an `otp-site` owner.
3. Move server logic before UI when secrets, service-role keys, Stripe, or portal tokens are involved.
4. Reuse existing public route aliases and API contracts.
5. Verify booking, portal, documents, payments, and admin routes after every migration slice.

Do not duplicate tables or create parallel business truth. Supabase remains the shared memory/database layer.

## Protected Route Rules

- Public routes must never expose private client/admin data.
- Protected surfaces include `/os`, `/oracle`, `/agents`, `/content`, admin APIs, document packet actions, job/client operations, and payment management.
- Use server-side auth checks for privileged actions.
- Never trust client-side route hiding as protection.
- Do not store admin passwords, app passwords, service-role keys, or bearer tokens in browser storage.
- Client portal pages must use opaque portal tokens only and must avoid leaking internal job notes, Supabase details, or server errors.

## Oracle Behavior

OTP Oracle is the intelligence layer. It may recommend pricing, service structure, copy, follow-up, packet content, and next actions, but it must not silently overwrite admin-entered business data.

- Treat Oracle output as recommendations unless a route explicitly performs a write.
- Return structured JSON from API routes.
- Prefer deterministic fallback behavior when AI providers are unavailable.
- Keep private prompts, API keys, service-role keys, and stack traces server-side.
- Avoid fake success states. Surface pending, fallback, unavailable, or needs-review status clearly.

## Pricing Rules

- Do not overwrite admin-entered prices unless explicitly requested.
- Pricing config is guidance, not forced truth.
- Preserve manually entered `total_price_cents`, `deposit_amount_cents`, and `remaining_balance_cents` unless the user intentionally recalculates them.
- Quote-first is the default public booking behavior.
- Deposit links are optional and should be created only after an explicit business action.

## Client Handling Rules

- Protect portal tokens and never print or log full tokens unnecessarily.
- Use `onlytrueperspective.tech` for public client links.
- Do not expose Supabase row internals, internal notes, service keys, or private admin fields to client pages.
- Keep client-facing copy professional, brief, and safe.
- If a token is expired or invalid, return a safe generic message and no private data.

## Document Generation Rules

- Documents must be professional, client-safe, and consistent with OTP branding.
- Supported document types include invoices, proposals, receipts, agreements, service summaries, paid receipts, NDAs, and packets when supported by the current code.
- Do not expose private notes or raw database details in documents.
- PDF/Docx generation failures must return structured JSON or safe downloadable error behavior, not raw stack traces.

## Stripe and Payment Rules

- `STRIPE_SECRET_KEY` and webhook secrets are server-only.
- Prefer durable Stripe Payment Links for invoice/deposit links when possible.
- Never show an expired or deactivated payment link as active.
- Webhook handlers must be idempotent and must not double-promote payment status.
- Payment status should match actual payment evidence or explicit admin action. No fake paid states.

## Supabase and Security Rules

- Never expose `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY` client-side.
- Browser code may only use public/publishable keys when explicitly designed for public use.
- Keep service-role database writes in server routes.
- Use RLS and least privilege for public or client-accessible data.
- Do not duplicate existing tables for the same OTP business concept without a migration plan.
- Do not print actual secret values in docs, logs, tests, or reports.

## Future AI Skill System

Future skills should live in `/skills` and map to the unified OTP operating model:

- Sales Agent
- Client Packet Agent
- Content Engine Agent
- Follow-Up Agent
- Daily Operator Agent
- Research Agent
- Automation Agent

Skills should be read as operating instructions first. Do not connect them to live automations until the route, auth, data, and rollback paths are verified.

## UI and Brand Rules

- Keep OTP black/gold, premium, glassy, cinematic, and mobile-first.
- Preserve the existing public site and admin UI unless a task explicitly asks for redesign.
- Do not break booking, portal, invoice, receipt, document, Stripe, Supabase, terminal, or Oracle flows while polishing UI.
- Use clear state labels for loading, pending, fallback, unavailable, paid, unpaid, archived, expired, and needs review.
- Keep routes stable and preserve production aliases.

## Build and Test Commands

Use commands that exist in `package.json`:

- `npm run build:speed-insights`
- `npm test`
- `npm run security:scan`
- `npm run prod:terminal-sweep`
- `npm run prod:full-sweep`
- `npm start`

There is no generic `npm run build` script at the time this file was created. If one is added later, run it before production deployment.

## Do Not Break

- `/`
- `/book`
- `/booking`
- `/bookings`
- `/book-otp`
- `/client`
- `/client/:portalToken`
- `/portal`
- `/terminal`
- `/otp-terminal`
- `/api/*`
- static assets, especially `/assets/otp-logo-transparent.png`
- Stripe webhook and payment routes
- Supabase admin/server routes
- document generation and downloads

## Final Reporting Standard

When making production-facing changes, report:

1. Files changed
2. Exact routes added or changed
3. Tests run
4. Build result
5. Vercel deployment checklist
6. Next recommended migration step
