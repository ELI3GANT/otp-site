# Isolated QA Previews for Feature Branches

OTP Site and OTP OS Vercel projects use the same Git deployment policy: branches matching `feature/*` can create protected Preview deployments; `main` and all other branches remain disabled. Production deploys stay manual.

## Before pushing a feature branch

From the OTP Site worktree, run:

```bash
npm run qa:preview:preflight -- feature/<branch-name>
```

The check inspects only the variable names and exact branch scopes for both Vercel projects. It does not read or print Secret values. It exits nonzero if any required variable is absent.

## First Blood II branch setup

In each project's **Settings → Environment Variables**, add the following entries with **Environment = Preview** and **Git Branch = feature/first-blood-ii**. Reuse the QA-only secrets from the verified `feature/nexus` entries. Keep the origins pointed at this candidate's branch aliases. Never add any of these to Production, Development, or an unscoped Preview entry.

Candidate aliases:

- Site: `https://otp-site-git-feature-first-blood-ii-only-true-perspective.vercel.app`
- OS: `https://otp-os-git-feature-first-blood-ii-only-true-perspective.vercel.app`

**OTP Site:**

- Reuse the QA values from `feature/nexus` for `OTP_ENV`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `STRIPE_SECRET_KEY`.
- Set `OTP_SITE_DIRECT_STRIPE_SANDBOX=true`.
- Set `OTP_PUBLIC_SITE_ORIGIN` to the Site alias above, `OTP_OS_UPSTREAM_URL` to the OS alias above, and copy the existing OTP OS Vercel automation bypass secret into `OTP_OS_VERCEL_BYPASS_SECRET`.

**OTP OS:**

- Reuse the QA values from `feature/nexus` for `OTP_ENV`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `APP_PASSWORD`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`.
- Set both `OTP_PUBLIC_SITE_ORIGIN` and `PUBLIC_CLIENT_BASE_URL` to the Site alias above.

Keep deployment protection enabled. The QA values must target Supabase `tybgpykqaqaeoghdvpet`; Stripe must use test credentials. Vercel Secret values are intentionally unreadable through the CLI, so enter or duplicate them in the Vercel UI without placing them in a local file or chat.

After adding scopes, rerun the preflight. Push the reviewed feature branch to create Git-linked Previews. Call `GET /api/qa/readiness` on the Site Preview before any mutation; it checks the connected OS Preview with a read-only `ops_jobs` query and reports only the effective environment, Supabase project reference, and Stripe mode. It returns `404` outside Preview and never returns credentials. If configuration is changed after deployment, redeploy that same Preview branch. Do not promote a Preview deployment.
