# OTP Site Operational Writer Boundary

OTP OS is the canonical owner of CRM, leads/prospects, bookings, jobs, projects, and client-portal operational records. OTP Site owns the public experience, validation, bounded proxy behavior, and presentation.

## Booking routing

New booking submissions use `OTP_BOOKINGS_WRITER_MODE=otp_os` by default. Site validates the public payload, sends it to OTP OS with a bounded timeout, and returns a public-safe response using `otp-booking-intake-v1`.

The existing Site database writer remains a temporary `LEGACY` availability fallback. Set `OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED=0` to disable it independently. `OTP_BOOKINGS_WRITER_MODE=legacy_direct` is an explicit rollback setting; ambiguous modes fail startup.

Direct fallback records retain native booking/contact/job identifiers and include an `otp-lineage-v1` envelope. The fallback must not become a second preferred writer.

## Current direct-write inventory

| Site path | Records/effect | Current boundary | Migration direction |
|---|---|---|---|
| `POST /api/bookings/submit` | `contacts`, `ops_jobs` | OS-first; `LEGACY` direct fallback | Disable fallback after production OS routing evidence |
| Stripe webhook `/api/webhook` | contact/lead paid state and `ops_jobs` | `LEGACY`; signature protected | Move operational updates behind an idempotent OS payment event contract |
| `/api/admin/ops/jobs/*` | job create/update/archive/delete, packets and documents | `LEGACY`; authenticated Site admin | Move operational commands to OTP OS before removing routes |
| `/api/contact/submit` and `/api/audit/submit` | public capture/contact records | Public capture writer | Preserve capture in Site, hand operational conversion to OS with lineage |
| `/api/admin/write-data` and purge routes | broad admin record mutation | `LEGACY`; authenticated but high risk | Replace with scoped OS commands; do not expand |
| Stripe checkout/payment routes | external payment sessions and evidence | Unchanged in this pass | Migrate only with end-to-end payment and webhook proof |
| Content/knowledge admin routes | Site content records | Site-owned content, not operational CRM | Remains in Site |

## Configuration

- `OTP_BOOKINGS_WRITER_MODE=otp_os` selects the canonical path and is the default.
- `OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED=0` disables the direct operational fallback.
- `OTP_BOOKINGS_UPSTREAM_URL` identifies the server-side OTP OS base URL.
- `OTP_BOOKINGS_UPSTREAM_TIMEOUT_MS` bounds the upstream call; default is 9000 ms.

No payment behavior changed in this architecture pass.
