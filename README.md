# OnlyTruePerspective — OTP Site

**OnlyTruePerspective (OTP)** is the public-facing creative-tech platform for ELI3GANT and the OTP ecosystem.

It connects the brand, booking flow, client discovery, creative services, and the foundation for OTP OS — the private operating system that powers internal work, client tracking, documents, deals, and automation.

---

## What This Repo Powers

- Public OTP website
- Brand identity and landing pages
- Booking and inquiry flows
- Client portal entry points
- SEO and structured data
- Frontend experiments for the OTP ecosystem
- Production-ready deployment workflow through Vercel

---

## Ecosystem Position

```text
otp-site  → public brand + client-facing website
otp-os    → private internal control panel + operations layer
Stripe    → payments
Supabase  → data/auth/storage layer
Vercel    → production hosting
AI        → Oracle, automation, content, docs, workflow intelligence
```

The site is not just a portfolio. It is the front door to a larger creative-business operating system.

---

## Core Features

- Responsive public website
- Dark/light visual system
- Booking and client intake routes
- Client portal links
- SEO metadata and structured schema
- Production deployment on Vercel
- Integration path for OTP OS, Stripe, Supabase, and AI tooling

---

## Tech Stack

- HTML, CSS, JavaScript
- Node / Express API routes where needed
- Supabase client + backend data layer
- Stripe payment infrastructure
- Vercel hosting and deployment
- AI integrations for Oracle/workflow systems

---

## Repo Structure

| Path | Purpose |
|---|---|
| `/` | Public website pages, scripts, styles, assets |
| `assets/` | Brand visuals, icons, media, UI assets |
| `api/` | Serverless/API logic when used |
| `docs/` | Business and technical documentation |
| `scripts/` | Utility, deploy, testing, and automation scripts |
| `supabase/` | Database migrations/functions where applicable |
| `tests/` | Verification and regression checks |

---

## Local Setup

```bash
npm install
npm run dev
```

Create a local `.env` file for private keys and service credentials. Never commit secrets.

Typical required services may include:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
JWT_SECRET=
```

---

## Deployment

Production is handled through Vercel.

```bash
git add .
git commit -m "Update OTP site"
git push origin main
```

Vercel rebuilds from `main` once connected.

---

## Current Priorities

- Keep the public site clean, fast, and premium
- Strengthen booking and client conversion
- Improve SEO and social previews
- Keep OTP OS connected cleanly without leaking private admin systems
- Build trust through polished presentation and strong client-facing flow

---

## Brand Direction

OTP is a creative-tech ecosystem combining:

- media production
- music and artist identity
- websites and digital systems
- AI-powered business workflow
- client services
- automation
- community infrastructure

**Built by ELI3GANT / OnlyTruePerspective.**
