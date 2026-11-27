# Permanent OTP QA Preview workflow

OTP Site and OTP OS use `feature/nexus` as their single permanent QA integration branch. All required QA values remain scoped to Preview for this exact branch. Do not create new branch-specific environment entries. Unspecified branches and `main` are disabled in `vercel.json`; Production deployment remains an explicit manual release workflow.

## Before pushing `feature/nexus`

From the OTP Site QA worktree, run:

```bash
npm run qa:preview:preflight -- feature/nexus
```

The preflight checks required variable names and exact Preview branch scopes for both Vercel projects. It does not read or print Secret values. It rejects any other branch. Vercel deployment protection must remain enabled.

Required scopes are maintained in the existing Vercel project settings:

- OTP Site: `OTP_ENV`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `OTP_PUBLIC_SITE_ORIGIN`, `OTP_SITE_DIRECT_STRIPE_SANDBOX`, `STRIPE_SECRET_KEY`, `OTP_OS_UPSTREAM_URL`, and `OTP_OS_VERCEL_BYPASS_SECRET`.
- OTP OS: `OTP_ENV`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `APP_PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `OTP_PUBLIC_SITE_ORIGIN`, and `PUBLIC_CLIENT_BASE_URL`.

For OTP Site, direct Stripe mode must be `true`. Both apps must point at QA Supabase project `tybgpykqaqaeoghdvpet`; Stripe keys and webhook configuration must be Sandbox/Test. Never use the Production Supabase project or Stripe live keys in Preview. Do not add operational credentials to Development, unscoped Preview, or other branches.

After pushing, verify each Git-linked deployment is a protected Preview for `feature/nexus` and the expected commit. Before any database or payment mutation, call OTP Site `GET /api/qa/readiness`. It must return `ok: true`, Preview/Sandbox status, the approved QA Supabase project, Stripe test mode, and a passing read-only `ops_jobs` query. The endpoint reports no credentials and returns 404 outside Preview. Stop if the check fails. Do not promote a Preview deployment or deploy to Production without founder approval.
