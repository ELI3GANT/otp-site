# OTP Site Security

## Secrets

Never commit `.env`, `.vercel`, service-role keys, provider keys, Stripe keys, or admin passcodes.

The Supabase anon key in `site-config.js` is public by design. It is only safe when RLS blocks private tables. The service-role key must stay server-side in Vercel environment variables.

Before pushing:

```bash
npm run security:scan
npm test
```

## Private Tables

These tables must not be directly readable with the public anon key:

```text
public.contacts
public.leads
public.ops_jobs
```

Use `supabase/migrations/SECURE_HARDENING_PRO.sql` to harden production RLS. It keeps public site content readable while locking OTP OS / Terminal data behind server routes.

## If a Secret Was Pushed

Rotate it immediately, update Vercel environment variables, redeploy, then purge Git history only after confirming the rotated values work.
