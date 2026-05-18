# OTP Unified Environment Audit

This audit documents variable names only. Do not place secret values in this file.

## Scope

- Root production app: `otp-site`
- Existing dashboard reference app: `otp-os`
- Main domain: `onlytrueperspective.tech`
- Current OTP OS upstream: `https://otp-os.vercel.app`

## Supabase

`otp-site`:

- `SUPABASE_URL` - server-side Supabase project URL.
- `SUPABASE_SERVICE_KEY` - server-only service/admin key used by `server.js` and scripts.

`otp-os`:

- `SUPABASE_URL` - server-side Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` - server-only service role key.
- `SUPABASE_ANON_KEY` - only for client account flows when explicitly enabled; never treat as service authority.

Expected shared project:

- `ckumhowhucbbmpdeqkrl.supabase.co`

Rules:

- Never expose service-role keys client-side.
- Keep privileged reads/writes in server routes.
- Use one shared source of truth for leads, contacts, jobs, bookings, packets, payments, and portal tokens.

## Stripe

`otp-site`:

- `STRIPE_SECRET_KEY` - server-only Stripe API key.
- `STRIPE_WEBHOOK_SECRET` - server-only webhook signing secret.

`otp-os`:

- `STRIPE_SECRET_KEY` - server-only Stripe API key.
- `STRIPE_WEBHOOK_SECRET` - server-only webhook signing secret.
- `STRIPE_WEBHOOK_LIMIT` - optional raw-body limit for webhook requests.

Rules:

- Webhook handlers must be idempotent.
- Payment links must not be shown as active after expiration/deactivation.
- Never expose Stripe secret keys to browser code.

## OpenAI, Oracle, and AI Providers

`otp-site`:

- `OPENAI_API_KEY` - server-only OpenAI key if OpenAI routes are enabled.
- `GEMINI_API_KEY` - server-only Gemini key if Gemini routes are enabled.
- `ANTHROPIC_API_KEY` - server-only Anthropic key if enabled.
- `GROQ_API_KEY` - server-only Groq key if enabled.
- `OTP_ORACLE_LOG` - optional Oracle logging flag.

`otp-os`:

- `GOOGLE_API_KEY` - server-only Gemini key.
- `GEMINI_MODEL` - model name, defaulted in code when absent.
- `GEMINI_MAX_CALLS_PER_HOUR` - optional AI usage guard.

Rules:

- Oracle output is advisory unless a protected server route writes data.
- Use deterministic fallbacks when providers are unavailable.
- Never expose provider keys or raw provider errors client-side.

## OTP Site Auth and Operations

`otp-site`:

- `ADMIN_PASSCODE` - protected admin login passcode.
- `JWT_SECRET` - server-only JWT signing secret.
- `CLIENT_PORTAL_SECRET` - optional dedicated client portal token secret; falls back to `JWT_SECRET`.
- `CLIENT_PORTAL_TOKEN_TTL_DAYS` - client portal token lifetime.
- `CLIENT_PORTAL_PROXY_TIMEOUT_MS` - upstream portal proxy timeout.
- `OTP_ADMIN_TOKEN` - local/CI sweep token for private checks, not a public secret.
- `LEGACY_BYPASS_ENABLED` - development-only/static-bypass control.

Rules:

- Do not store admin secrets in browser storage.
- Use bearer/JWT checks for protected admin APIs.
- Client portal tokens must be opaque and limited to client-safe data.

## OTP OS Auth and Operations

`otp-os`:

- `APP_PASSWORD` - protected dashboard password.
- `ADMIN_PASSCODE` - alternate protected dashboard passcode.
- `ADMIN_PASSWORD` - alternate protected dashboard password.
- `OTP_SITE_ADMIN_TOKEN` - optional server-side bridge token for OTP site admin API.
- `OTP_ADMIN_TOKEN` - optional bridge/admin token.
- `OTP_SITE_ADMIN_PASSCODE` - optional server-side bridge passcode.
- `OTP_ADMIN_PASSCODE` - optional bridge passcode.
- `OTP_SITE_APP_PASSWORD` - optional server-side bridge password.
- `OTP_SITE_ADMIN_PASSWORD` - optional server-side bridge password.
- `OTP_SITE_PORTAL_LINK_ENDPOINT` - canonical OTP site portal-link endpoint.

Rules:

- OTP OS bridge credentials are server-only.
- Browser code should rely on session cookies, not replayed app passwords.
- Canonical client-facing links must use `onlytrueperspective.tech`.

## Booking and Public URL Config

`otp-site`:

- `OTP_PUBLIC_SITE_ORIGIN` - canonical public origin, expected `https://onlytrueperspective.tech`.
- `OTP_BOOKINGS_API_BASE` - optional booking API base.
- `OTP_BOOKINGS_UPSTREAM_URL` - optional OTP OS upstream for booking fallback.
- `OTP_BOOKINGS_ENABLE_UPSTREAM_FALLBACK` - enables upstream fallback.
- `OTP_CLIENT_PORTAL_UPSTREAM_URL` - optional portal upstream.
- `OTP_OS_PUBLIC_BASE` - optional OTP OS public base.

`otp-os`:

- `PUBLIC_SITE_URL`
- `PUBLIC_PORTAL_BASE_URL`
- `PUBLIC_CLIENT_BASE_URL`
- `CLIENT_PORTAL_BASE_URL`
- `BOOKING_PUBLIC_URL`
- `BOOKING_UPLOAD_BUCKET`
- `BOOKING_UPLOAD_MAX_BYTES`
- `INTERNAL_APP_URL`
- `APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `VITE_SITE_URL`

Rules:

- Public booking stays quote-first.
- Preserve `/book`, `/booking`, `/bookings`, and `/book-otp`.
- Preserve `/client/:portalToken`.

## Email, SMS, and Delivery

`otp-site`:

- `RESEND_API_KEY` - server-only email provider key.
- `DOC_TEMPLATE_BUCKET` - Supabase storage bucket for document templates.

`otp-os`:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `INVOICE_FROM_EMAIL`
- `BOOKING_ADMIN_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `CASH_APP_HANDLE`

Rules:

- Delivery failures must return safe JSON and should not block core job state.
- Do not expose provider credentials in client output.

## Vercel and Runtime

`otp-site`:

- `PORT`
- `NODE_ENV`
- `VERCEL`
- `VERCEL_URL`
- `VERCEL_DEPLOYMENT_ID`
- `VERCEL_GIT_COMMIT_SHA`
- `VERCEL_GIT_COMMIT_MESSAGE`
- `OTP_ALLOWED_ORIGINS`
- `OTP_ENABLE_PUBLIC_DIAG`
- `OTP_VERBOSE_HTTP`
- `OTP_SWEEP_BASE_URL`
- `WATCH_PUSH_DEBOUNCE_MS`
- `WATCH_PUSH_TARGET`

`otp-os`:

- `PORT`
- `NODE_ENV`
- `VERCEL`
- `VERCEL_URL`
- `CORS_ALLOWED_ORIGINS`
- `JSON_BODY_LIMIT`
- `CLIENT_ACCOUNTS_ENABLED`

## YouTube and Content

`otp-site`:

- `YOUTUBE_API_KEY`
- `YOUTUBE_CHANNEL_ID`
- `OTP_YOUTUBE_CHANNEL_ID`
- `YOUTUBE_SYNC_TIMEOUT_MS`
- `YOUTUBE_SYNC_CACHE_TTL_MS`
- `YOUTUBE_SYNC_STALE_TTL_MS`

Rules:

- Content engine keys are server-only unless explicitly public and safe.
- Public content fallbacks should work when live provider sync fails.
