# OTP Unified Deployment Notes

## What Changed

- `otp-site` remains the production root for `onlytrueperspective.tech`.
- Vercel routing now sends `/os` and `/os/*` to the current OTP OS deployment at `https://otp-os.vercel.app`.
- Future architecture folders were added for `/app`, `/lib`, `/components`, and `/skills`.
- `AGENTS.md` now defines Codex rules for routing, migration, security, pricing, documents, Stripe, Supabase, and brand behavior.
- Future agent skill briefs were added under `/skills`.
- Environment variable names were documented in `docs/OTP_UNIFIED_ENV_AUDIT.md`.

## How `/os` Routing Works

This repo currently uses legacy Vercel `routes` in `vercel.json`, so the `/os` proxy rules are placed at the top of that array:

- `/os` -> `https://otp-os.vercel.app`
- `/os/:path*` -> `https://otp-os.vercel.app/:path*`

The rules are before booking, API, filesystem, and server fallback routes so OTP OS traffic is not swallowed by `server.js`.

## What To Check In Vercel

- The `onlytrueperspective.tech` production domain remains attached to the `otp-site` Vercel project.
- The `otp-site` deployment uses this repo's `vercel.json`.
- The `otp-os` project remains deployed at `https://otp-os.vercel.app`.
- Environment variables are present in the correct project and never copied into public files.
- The deployed `/os` route returns the OTP OS dashboard, not the public site fallback or a 404.

## Domain Ownership

- Main production domain owner: `otp-site`
- Dashboard upstream during migration: `otp-os`
- Do not move `onlytrueperspective.tech` to the OTP OS project.

## Required Env Vars

Minimum production variables for full root app behavior:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_PASSCODE`
- `JWT_SECRET`
- `CLIENT_PORTAL_SECRET` or `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Recommended operational variables:

- `RESEND_API_KEY`
- `DOC_TEMPLATE_BUCKET`
- `GEMINI_API_KEY`, `OPENAI_API_KEY`, or another configured AI provider key
- `OTP_PUBLIC_SITE_ORIGIN=https://onlytrueperspective.tech`
- `OTP_OS_PUBLIC_BASE=https://otp-os.vercel.app`
- `OTP_ADMIN_TOKEN` for private production sweeps

OTP OS must keep its own server-only credentials until the dashboard is fully merged:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_PASSWORD` or `ADMIN_PASSCODE` or `ADMIN_PASSWORD`
- `GOOGLE_API_KEY`
- `GEMINI_MODEL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Test URLs

- `https://onlytrueperspective.tech`
- `https://onlytrueperspective.tech/book`
- `https://onlytrueperspective.tech/client/test`
- `https://onlytrueperspective.tech/os`

Also verify preserved aliases:

- `https://onlytrueperspective.tech/booking`
- `https://onlytrueperspective.tech/bookings`
- `https://onlytrueperspective.tech/book-otp`
- `https://onlytrueperspective.tech/terminal`
- `https://onlytrueperspective.tech/otp-terminal`
- `https://onlytrueperspective.tech/api/health`
- `https://onlytrueperspective.tech/api/bookings/config`

## Rollback Plan

1. Remove the two `/os` route entries from `vercel.json`.
2. Redeploy `otp-site`.
3. Confirm `/`, booking aliases, `/client/test`, `/terminal`, and `/api/health` still work.
4. Continue using `https://otp-os.vercel.app` directly for OTP OS until routing is repaired.

## Full Migration Next Step

After `/os` proxying is verified live, migrate OTP OS in slices:

1. Auth/session bridge and route protection.
2. Jobs, contacts, leads, and quick-deal APIs.
3. Payments and webhook ownership.
4. Documents and packet generation.
5. Oracle and agent command surfaces.
6. Dashboard UI shell.

Do not migrate UI before the server-side auth, API, and data ownership are clear.
