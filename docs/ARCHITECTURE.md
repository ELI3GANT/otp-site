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

OTP Site handles:
- branding
- marketing
- booking
- SEO
- discovery
- public presentation
- client trust

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
