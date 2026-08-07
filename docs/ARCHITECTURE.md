# OTP Architecture

## Ecosystem Overview

```text
                ┌──────────────────┐
                │    OTP SITE      │
                │ Public Platform  │
                └────────┬─────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
     Booking         Client Flow      Content
       Layer            System         Layer
          │
          ▼
   ┌──────────────────┐
   │     OTP OS       │
   │ Internal System  │
   └────────┬─────────┘
            │
    ┌───────┼────────┐
    ▼       ▼        ▼
  Deals   CRM      Oracle AI
            │
            ▼
      ┌──────────┐
      │Supabase  │
      │ Database │
      └──────────┘
            │
            ▼
        Stripe
        Payments
```

---

## Public Layer

OTP Site owns:
- branding
- marketing
- booking
- SEO
- discovery
- public presentation
- client trust
- public payload validation
- bounded proxies to operational owners

OTP Site does not own CRM, booking/job, project, or client-portal operational truth. Those records belong to OTP OS. Limited direct writers remain documented `LEGACY` fallbacks in [OTP_SITE_WRITER_BOUNDARY.md](OTP_SITE_WRITER_BOUNDARY.md).

---

## Internal Layer

OTP OS handles:
- operations
- deal capture
- invoices
- CRM
- AI workflows
- automation
- project management
- system monitoring
- canonical operational persistence for leads/prospects, bookings, jobs, projects, and client portal records

---

## AI Layer

OTP Oracle powers:
- proposal writing
- follow-up generation
- workflow understanding
- deal parsing
- automation routing
- creative support
- system suggestions

---

## Long-Term Goal

Transform OTP into a scalable creative-tech ecosystem combining:
- media
- music
- systems
- AI
- automation
- digital infrastructure
- community
