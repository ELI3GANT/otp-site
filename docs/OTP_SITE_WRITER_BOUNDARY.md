# OTP Site Operational Writer Boundary

OTP OS is the canonical owner of CRM, leads/prospects, bookings, jobs, projects, and client-portal operational records. OTP Site owns the public experience, validation, bounded proxy behavior, and presentation.

## Booking routing

New booking submissions use `OTP_BOOKINGS_WRITER_MODE=otp_os` by default. Site validates the public payload, sends it to OTP OS with a bounded timeout, and returns a public-safe response using `otp-booking-intake-v1`.

The normal route does not automatically fall back to Site persistence. OTP OS unavailability, timeout, malformed success, or internal failure returns an explicit `otp_os_unavailable` response; an idempotency conflict returns `booking_idempotency_conflict`. This prevents a response-loss retry from activating a second writer.

The existing Site database writer remains only as a manual `LEGACY` rollback path. It requires both `OTP_BOOKINGS_WRITER_MODE=legacy_direct` and `OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED=1`; the flag defaults disabled. Ambiguous modes fail startup. Direct legacy records retain native booking/contact/job identifiers and include an `otp-lineage-v1` envelope.

## Idempotency and evidence

- Site derives one stable booking identifier from the public booking token and sends it as `booking_id`, `idempotency_key`, and the `Idempotency-Key` header.
- OTP OS binds that key to a deterministic operational job identifier and a normalized request digest.
- An identical retry returns the existing result with `duplicate_replay`; a material payload change under the same key returns HTTP 409 without another write.
- The public response exposes only safe evidence: `writer`, contract version, booking reference, status, and timestamp. Internal contact and job identifiers remain server-side.
- OTP OS preserves the incoming `otp-lineage-v1` envelope and appends its native client/project links.

This behavior was proven on 2026-08-07 through the actual Site and OS Express routes with isolated persistence, including retry after a lost response. A WebKit browser submission also completed at desktop and 390 x 844 without console errors or horizontal overflow. This is production-like local evidence, not a production deployment or production-database write.

## Current direct-write inventory

| Site path | Records/effect | Current boundary | Migration direction |
|---|---|---|---|
| `POST /api/bookings/submit` | `contacts`, `ops_jobs` | OTP OS single writer by default; manual `LEGACY` mode remains gated | Remove legacy implementation after an approved production rollout proves rollback is unnecessary |
| Stripe webhook `/api/webhook` | contact/lead paid state and `ops_jobs` | `LEGACY`; signature protected | Move operational updates behind an idempotent OS payment event contract |
| `/api/admin/ops/jobs/*` | job create/update/archive/delete, packets and documents | `LEGACY`; authenticated Site admin | Move operational commands to OTP OS before removing routes |
| `/api/contact/submit` and `/api/audit/submit` | public capture/contact records | Public capture writer | Preserve capture in Site, hand operational conversion to OS with lineage |
| `/api/admin/write-data` and purge routes | broad admin record mutation | `LEGACY`; authenticated but high risk | Replace with scoped OS commands; do not expand |
| Stripe checkout/payment routes | external payment sessions and evidence | Unchanged in this pass | Migrate only with end-to-end payment and webhook proof |
| Content/knowledge admin routes | Site content records | Site-owned content, not operational CRM | Remains in Site |

## Configuration

- `OTP_BOOKINGS_WRITER_MODE=otp_os` selects the canonical path and is the default.
- `OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED=0` is the safe default and disables Site direct booking writes. Only exact value `1` enables the manual legacy mode.
- `OTP_BOOKINGS_UPSTREAM_URL` identifies the server-side OTP OS base URL.
- `OTP_BOOKINGS_UPSTREAM_TIMEOUT_MS` bounds the upstream call; default is 9000 ms.

No payment behavior changed in this architecture pass.
