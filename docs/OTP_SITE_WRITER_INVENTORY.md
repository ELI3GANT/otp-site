# OTP Site Writer Inventory

Status: inventory baseline for migration planning  
Branch: `migration/otp-site-writer-inventory`  
Reference release: `cd0da1cc1bba8346c159496b00ed93bb8556929e`

This inventory identifies code in `otp-site` that reads or writes operational state. The public site remains the presentation and intake layer. `otp-os` is the canonical operational writer for CRM, leads, bookings, jobs, projects, client portals, documents, and payment administration.

## Classification

- **KEEP**: belongs in the public root because it serves public content, intake, or a safe read adapter.
- **MIGRATE**: operational behavior remains in the site today but should move behind an `otp-os` route or shared contract.
- **DEPRECATE**: duplicate or legacy behavior that should be removed after the replacement is live and verified.

## Route and writer map

| Site surface | Current behavior in `otp-site` | Canonical owner | Class | Migration note |
| --- | --- | --- | --- | --- |
| `bookings.js` → `POST /api/bookings/submit` | Public intake validates fields, creates the booking payload, and calls the OTP OS writer with a documented fallback path. | `otp-os` booking/intake writer | MIGRATE | Keep the public form and contract. Remove the site-side operational fallback only after OS handoff, replay, provenance, and failure states are verified in production. |
| `bookings.js` → `POST /api/bookings/deposit-checkout` | Creates or retrieves a Stripe deposit/payment link after an explicit booking action. | `otp-os` payments and booking record | MIGRATE | Move payment-link creation behind the OS payment route. Keep the public redirect and honest pending/unavailable states. |
| `server.js` → `POST /api/webhook` | Stripe webhook updates leads and inserts `ops_jobs`; also retains a local `data/crm_jobs.json` fallback. | `otp-os` payment webhook and `ops_jobs` | MIGRATE / DEPRECATE | First move webhook ownership and idempotency to OS. Then remove the local CRM file logger; do not run two business truths. |
| `server.js` → `POST /api/contact/submit` | Public contact form stores contact/lead data and sends notification email. | `otp-os` leads/CRM intake | MIGRATE | Preserve the public payload and response contract while routing the durable write to OS. Email delivery may remain a site edge adapter only if OS owns the record. |
| `server.js` → `POST /api/audit/submit` | Consultant-audit intake stores an audit lead and may produce an audit response. | `otp-os` lead/intake owner; Oracle may recommend | MIGRATE | Keep the public audit UI and recommendation rendering. Move durable lead and audit state to OS; Oracle output remains recommendation-only. |
| `server.js` → `POST /api/analytics/view` | Public analytics event ingestion writes site analytics state. | Shared analytics service or `otp-os` reporting boundary | MIGRATE | Define the event contract and retention owner before moving. Keep the browser event adapter in the site. |
| `server.js` → `/api/admin/ops/jobs/*` | Site-hosted authenticated CRUD for jobs, statuses, archive/restore, portal links, and Oracle job creation. | `otp-os` jobs/projects | DEPRECATE | This is a duplicate admin writer. Keep only a temporary compatibility bridge while OS routes reach parity, then return a clear sunset response and remove. |
| `server.js` → `/api/admin/ops/docs/*`, `/api/admin/docs/*` | Site-hosted document, packet, signature, template, send, download, and audit writers. | `otp-os` documents and packets | DEPRECATE | Migrate document generation and delivery ownership as one idempotent packet workflow. Keep public download links as read/proxy adapters where needed. |
| `server.js` → `/api/admin/knowledge/*`, `/api/ai/*` | Site-hosted authenticated knowledge uploads, recommendations, chat, and generation. | `otp-os` Oracle/knowledge layer | MIGRATE | Move private prompts, provider calls, and durable knowledge writes to OS. Keep deterministic public fallbacks and never expose keys or stack traces. |
| `server.js` → `/api/admin/write-data`, `/api/admin/delete-post`, purge and rollback routes | Generic authenticated site database/content mutation paths. | `otp-os` content and operational admin | DEPRECATE | Replace broad writers with typed OS commands. Remove generic mutation routes after clients are cut over. |
| `site-init.js` → `/api/content/update` | Browser edit mode sends authenticated content updates directly to the site API. | `otp-os` content engine | DEPRECATE | Retain read-only public rendering; move editing UI and writes to protected OS surfaces. Do not rely on browser storage for durable authorization. |
| `server.js` → `/api/client-portal/:token`, `client.js`, portal renderers | Tokenized client portal reads and renders project, document, payment, and timeline state. | `otp-os` portal data | KEEP (adapter) | The site may remain the public portal shell and safe read adapter. OS owns the data and actions; keep token filtering and client-safe fields here. |
| `server.js` → `/client/:token`, `/portal` aliases | Public route shell and token handoff for client access. | `otp-site` route owner; `otp-os` data owner | KEEP | Preserve stable public aliases. Never expose internal notes, service keys, row internals, or raw errors. |
| `server.js` → `/api/quote/create`, `/api/quote/:id` | Quote creation and retrieval for booking/intake flows. | `otp-os` quote/proposal records | MIGRATE | Keep quote presentation and stable IDs at the public edge; durable quote state and pricing decisions belong in OS. Manual prices remain authoritative. |
| `pricing-config.js`, public package data | Static pricing guidance used to explain options and shape an intake request. | `otp-site` presentation; OS pricing config is authoritative | KEEP (guidance) | Do not turn this into a second pricing truth. Public copy may be cached, but admin-entered totals remain untouched. |

## Duplicate logic to remove

1. **Booking persistence:** the site contains both OS handoff logic and legacy/local fallback behavior. Keep one canonical booking record in OS and preserve only a documented compatibility path until the handoff gate is complete.
2. **Payment promotion:** the site webhook can update leads and insert `ops_jobs` while OS also owns operational payment/job state. Consolidate webhook idempotency and promotion in OS.
3. **Job and portal administration:** `/api/admin/ops/jobs/*` duplicates the operational job writer that already belongs to `otp-os`.
4. **Documents and packets:** site routes generate, approve, sign, send, and download operational documents alongside the OS document workflow. Move the writer and leave only safe public delivery adapters.
5. **Content mutation:** generic `write-data`, delete, purge, rollback, and browser edit paths make the public root act as an admin backend. Replace them with typed OS commands.
6. **AI and knowledge state:** site routes own provider calls and knowledge persistence that should be private Oracle/OS behavior. Keep recommendations explicit and reviewable.

## Migration order and gates

1. **Bookings and payments:** verify OS handoff, same-key replay, writer provenance, Stripe webhook idempotency, and truthful unavailable states. Do not remove the fallback before those checks pass in production.
2. **Jobs and portal actions:** map every admin job action to an OS endpoint, then run read-only portal, status, archive, restore, and portal-link checks.
3. **Documents and packets:** move generation, signature, send, retry, and download ownership together; verify client-safe output and audit history.
4. **Content, knowledge, and Oracle:** move private prompts and writes behind OS auth, then remove browser-facing generic mutation routes.
5. **Retire duplicates:** remove local CRM files and legacy site writers only after one authoritative record is observed in production and rollback is documented.

## Boundary rule

Until each slice is migrated and verified, legacy site writers are compatibility fallbacks only. They must remain documented here, must not create a parallel business truth, and must return explicit pending, unavailable, or needs-review states when the canonical owner cannot confirm the operation.
