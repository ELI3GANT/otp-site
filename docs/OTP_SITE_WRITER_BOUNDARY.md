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

## Job status transition routing

`POST /api/admin/ops/jobs/update-status` is now an authenticated Site proxy to OTP OS. It emits `otp-job-admin-mutation-v1`, requires the current and requested status, operator reason, actor, matching body/header idempotency key, and `otp-lineage-v1`. The only governed transitions are `New Lead -> Completed`, `In Progress -> Completed`, `Ready for Review -> Completed`, and their explicit reversible paths back from `Completed`. Payment-labelled and destructive states are excluded.

OTP OS validates Level 2 authority, applies the transition atomically through `apply_ops_job_status_transition_v1`, and stores an immutable idempotency/audit receipt. The response identifies `writer=otp_os`, before/after safe state, audit reference, and replay state. Site has no direct-write fallback for this route. Unknown jobs, stale state, invalid transitions, changed payloads under a reused key, timeout, unavailable OS, persistence failure, and malformed success all fail explicitly.

This path was proven locally on 2026-08-07 through the actual Site and OS HTTP applications with isolated persistence, including response loss after commit and a safe retry. The actual Terminal `MARK COMPLETED` control passed WebKit at desktop and 390 x 844 with no horizontal overflow. Unrelated Terminal panels reported expected offline errors because their databases were intentionally unavailable; the selected mutation completed without a console error.

## Current direct-write inventory

| Site path | Records/effect | Current boundary | Migration direction |
|---|---|---|---|
| `POST /api/bookings/submit` | `contacts`, `ops_jobs` | OTP OS single writer by default; manual `LEGACY` mode remains gated | Remove legacy implementation after an approved production rollout proves rollback is unnecessary |
| Stripe webhook `/api/webhook` | contact/lead paid state and `ops_jobs` | `LEGACY`; signature protected | Move operational updates behind an idempotent OS payment event contract |
| `POST /api/admin/ops/jobs/update-status` | reversible job status transition | OTP OS single writer; no Site direct fallback | Apply the reviewed additive OS receipt/RPC migration before deployment |
| Other `/api/admin/ops/jobs/*` routes | job create/update/archive/delete, packets and documents | `LEGACY`; authenticated Site admin | Migrate one reversible non-payment command family at a time; permanent delete remains excluded |
| `/api/contact/submit` and `/api/audit/submit` | public capture/contact records | Public capture writer | Preserve capture in Site, hand operational conversion to OS with lineage |
| `/api/admin/write-data` and purge routes | broad admin record mutation | `LEGACY`; authenticated but high risk | Replace with scoped OS commands; do not expand |
| Stripe checkout/payment routes | external payment sessions and evidence | Unchanged in this pass | Migrate only with end-to-end payment and webhook proof |
| Content/knowledge admin routes | Site content records | Site-owned content, not operational CRM | Remains in Site |

## Authenticated admin mutation classification

| Route family | Classification | Authority | Ownership decision |
|---|---|---|---|
| `/api/admin/delete-post`, `/api/admin/write-data` | Content update/delete | Level 2 update; Level 3 delete | Site-owned content; narrow separately before any purge work |
| `/api/admin/knowledge/upload`, `/delete`, `/archive`, `/structured/upsert`, `/structured/archive` | Content create/update/archive/delete | Level 2 except destructive delete at Level 3 | Site-owned knowledge; not an OTP OS operational migration target |
| `/api/admin/ops/jobs/list`, `/get` | Read | Level 0 | Read path unchanged |
| `/api/admin/ops/jobs/portal-link` | Credential-bearing operational update | Level 2 | Remaining OS migration candidate with higher trust-boundary risk |
| `/api/admin/ops/jobs/upsert`, `/from-oracle` | Broad create/update with price and payment-shaped fields | Level 2 with payment coupling | Remaining legacy writer; do not migrate as one arbitrary patch |
| `/api/admin/ops/jobs/update-status` | Allowlisted reversible status transition | Level 2 | Migrated to OTP OS; no direct Site writer |
| `/api/admin/ops/jobs/archive` | Reversible archive | Level 2 | Strong next candidate after production observation |
| `/api/admin/ops/jobs/delete` | Permanent delete | Level 3 | Excluded; do not proxy as implemented |
| `/api/admin/ops/docs/generate`, `/packets/*`, `/knowledge/recommend`, `/docs/packet` | Draft/generate | Level 1 or Level 2 when persisted | Review ownership separately; no external send implied |
| `/api/admin/ops/send/prepare`, `/docs/approve`, `/docs/signature/*`, `/docs/templates/upload` | Draft/approval/evidence mutation | Level 1-2 | Separate bounded families with explicit evidence requirements |
| `/api/admin/ops/send/execute`, `/docs/send`, `/send-retry` | External communication | Level 3 | Excluded from this migration pattern until explicit approval architecture exists |
| `/api/admin/purge-leads`, `/purge-contacts` | Permanent purge | Level 3 | Excluded |
| `/api/admin/rollback` | Deployment/infrastructure mutation | Level 3 | Excluded |

## Configuration

- `OTP_BOOKINGS_WRITER_MODE=otp_os` selects the canonical path and is the default.
- `OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED=0` is the safe default and disables Site direct booking writes. Only exact value `1` enables the manual legacy mode.
- `OTP_BOOKINGS_UPSTREAM_URL` identifies the server-side OTP OS base URL.
- `OTP_BOOKINGS_UPSTREAM_TIMEOUT_MS` bounds the upstream call; default is 9000 ms.
- `OTP_OS_JOB_MUTATION_UPSTREAM_URL` identifies the server-side OTP OS base URL for governed admin job mutations and defaults to the booking upstream.
- `OTP_OS_JOB_MUTATION_TOKEN` is the Site-held scoped credential for this one mutation capability; OTP OS verifies the corresponding `OTP_SITE_JOB_MUTATION_TOKEN`.
- `OTP_OS_JOB_MUTATION_TIMEOUT_MS` bounds the job mutation call; default is 8000 ms.

No payment behavior changed in this architecture pass.
