# OTP public intake release report — 2026-09-26

Status: **not release ready**. This is an audit and one bounded browser recovery fix, not a completed funnel migration.

## Architecture before and current state

Browser → OTP Site static pages and Express `/api` → OTP OS booking writer → OTP OS operational record. `/fixline` is routed separately to the FIXLINE Next.js deployment, which persists in its own Supabase project. OTP OS reads FIXLINE tickets through an authenticated read integration. The FIXLINE integration's PATCH route returns `safe_transition_not_implemented`; it does not consolidate writes. Email uses Resend from the server. No live calendar reservation API was found in the site booking path: the current "booking" is a project request with a preferred next step, not a confirmed appointment.

VA/Oracle recommendation is optional in the legacy direct booking path; the default OTP OS booking writer path does not call it. Static public pages do not need a VA server to render. Localhost FIXLINE proxy references in `server.js` are development branches; production Vercel routes target the independent FIXLINE deployment. This audit does not certify every administrative or AI route.

## Change made

`bookings.js` now bounds configuration loading to five seconds and uses built-in options after timeout. It bounds submission to fifteen seconds and explains that a timed-out write may have succeeded; retry retains the same session booking token. "Start Another Booking" clears that token before reloading so a genuinely new request receives a new ID. The server already bounds Site → OTP OS handoff to nine seconds by default and returns an unavailable response when persistence is unconfirmed.

## Production blockers

1. FIXLINE and booking remain separate funnels, schemas, and databases. There is no shared lead/project ID or automatic FIXLINE → booking → OTP OS lifecycle.
2. The existing booking path does not reserve a calendar slot or enforce double-booking protection. A call request is not an appointment.
3. When OTP OS cannot persist a lead, the Site returns 503. It does not queue the lead durably. Showing "request received" in that state would be false.
4. `bookings.js` contains static package pricing fallback data; it must be reconciled with centralized pricing before release of a unified funnel.
5. FIXLINE's OTP OS read integration is separate from the canonical booking writer. Status mutations are explicitly unimplemented. Dirty changes already exist in FIXLINE and OTP OS and were preserved.
6. Production secrets, auth, database migration state, deployment SHA, email delivery, Safari, and live calendar/provider behavior were not certified in this local audit.

## Dependency classification

| Dependency | Role | Classification |
| --- | --- | --- |
| OTP Site Express/static assets | Public pages, config, booking API | Required |
| OTP OS booking API/database | Canonical booking lead record | Required for intake writes |
| FIXLINE deployment/Supabase | Separate FIXLINE review intake | Required for `/fixline`; not required for Site pages |
| Resend | Confirmation/notification | Optional, but delivery must be monitored |
| VA/Oracle/AI provider | Recommendations and admin intelligence | Optional enhancement |
| Local FIXLINE proxy on port 3001 | Local development | Obsolete for production |
| Calendar provider | No confirmed reservation path in current Site flow | Missing for requested scheduling behavior |

## Environment variable groups

Required public production routing: `OTP_PUBLIC_SITE_ORIGIN`, `OTP_BOOKINGS_UPSTREAM_URL` (or reviewed default), `OTP_BOOKINGS_WRITER_MODE=otp_os`. The OTP OS writer requires its own database configuration and authenticated operational environment.

Private server configuration: OTP OS database/service-role credentials, FIXLINE `SUPABASE_SERVICE_ROLE_KEY`, `OTP_OS_FIXLINE_INTEGRATION_TOKEN`, and any Site ↔ OS mutation tokens. Never publish these to browser code.

Optional integrations: `RESEND_API_KEY`, AI provider credentials, `OTP_BOOKINGS_UPSTREAM_TIMEOUT_MS`, `NEXT_PUBLIC_OTP_BOOKING_URL`. `OTP_BOOKINGS_LEGACY_DIRECT_WRITE_ENABLED` and `OTP_BOOKINGS_WRITER_MODE=legacy_direct` are rollback controls, not a new production architecture.

## Verification and next deployment step

Local Site master suite passed; browser adversarial suite and FIXLINE unit tests passed; OTP OS cross-repo booking/job tests passed; Site speed-insights build passed. These checks do not prove production persistence, email delivery, calendar booking, or VA-offline behavior on the deployed site.

## Continuation audit — 2026-09-26

The current Site creates a session-scoped `booking_token`. `server/booking-handoff.js` derives a stable `BOOK-*` booking ID and idempotency key from that token. Site forwards the same ID and key to OTP OS, which checks request digests and returns a duplicate replay or conflict. This is an existing **booking** identity, not a canonical lead ID: FIXLINE's ticket UUID is created in its separate database and is not associated with it. A new browser session creates a new booking token; a retry or refresh in the same session retains it. The existing tests cover parts of the booking handoff, but the full FIXLINE-to-booking journey has not been tested.

OTP OS has an `otp_booking_intakes` durable quarantine path for submissions needing verification. It stores the intake with a unique idempotency key and request digest before reporting `pending_verification`; it does not imply a calendar reservation or a confirmed project. Other booking submissions still rely on OTP OS availability. Site returns `503 otp_os_unavailable` when the upstream response cannot be confirmed, so Site cannot truthfully report `received` during an OTP OS outage. The requested `received`, `sync_pending`, `synced`, and `sync_failed` lifecycle is not implemented across Site and OTP OS. A durable queue would need an approved persistent store and a private, authenticated retry worker; browser or serverless memory is insufficient.

FIXLINE's existing status enum is `submitted`, `reviewing`, `needs_more_information`, `findings_ready`, `offer_ready`, `review_published`, `awaiting_payment`, `paid`, `handed_off`, `closed`, `archived`, and `spam_rejected`. These are review workflow states. The requested lead states `new`, `qualified`, `booking_requested`, `booked`, and `contacted` require an explicit mapping in the canonical OTP OS lead model, rather than being written into FIXLINE's ticket status column. `PATCH /api/integrations/otp-os/submissions` currently validates a private token and request shape, then returns `501 safe_transition_not_implemented`. No authorized integration mutation can be claimed yet.

No real calendar availability or reservation provider was found in the inspected Site and OTP OS public booking path. OTP OS may return `pending_verification`, and the Site form submits a **booking request**. Collision protection and timezone-safe appointment confirmation cannot be claimed. The failure copy required after durable intake is: “Your project request was received, but the appointment was not confirmed. We’ll contact you to schedule.” This copy must only appear after durable persistence is confirmed by the writer.

No production secrets, migration application, calendar or email account configuration, deployment SHA, mobile browser journey, VA-down journey, OTP-OS-down replay, or live notification delivery was verified in this continuation. No source or migration files were changed here; only this report was updated. No new test run was performed, so the earlier test results remain historical evidence, not a release gate for this continuation.

Smallest next action: establish a canonical OTP OS lead ID contract and durable Site-to-OS intake persistence/retry design, then associate the FIXLINE ticket UUID and booking ID with that lead. Implement and test that slice before enabling private status writes or presenting appointment selection. A calendar provider with an authenticated reservation API and production configuration is also required before any UI can claim a booked call.

## Foundation implementation — 2026-09-26

This section supersedes the earlier continuation audit where it describes missing canonical identity or a Site queue. It does not certify the public release.

### Ownership and write path

- The browser creates one `LEAD-<UUIDv4>` for the public journey and retains it through refresh and retry. FIXLINE carries that ID on its own ticket; the booking link carries it into Site. Starting another request creates a new ID. FIXLINE's ticket UUID and Site's stable `BOOK-*` booking ID remain separate linked identifiers.
- Site validates the lead ID, builds the OTP OS booking envelope, and writes the complete envelope to its private `otp_public_intakes` outbox before forwarding. The lead ID is the envelope's `lineage.prospect_id`. The outbox uses a primary key on lead ID, a unique booking ID, and a request digest. A same-body replay returns the existing record; a changed request or reused booking ID conflicts.
- OTP OS remains the canonical operational booking writer. It validates the lead ID in lineage and stores it with the booking/job metadata. Its existing idempotency contract guards duplicate booking writes. FIXLINE persists its ticket with `lead_id` and intake digest in its own database; its review status workflow is unchanged. OTP OS's FIXLINE read projection exposes the lead ID for reconciliation. No new operational business table was added to Site.
- Site returns `503 intake_persistence_failed` if its outbox write is unconfirmed. After a confirmed write, OTP OS success returns `synced`; an upstream outage returns `202 received` with `sync_pending` and appointment-unconfirmed copy. A private authenticated daily retry route processes pending/failed rows; the database records `sync_failed` after a failed retry. The route requires a bearer secret. A 202 response is a received project request, never a calendar reservation.

### Files and routes

Site: `bookings.js`, `server.js`, `server/booking-handoff.js`, `server/public-intake-store.js`, `vercel.json`, `supabase/migrations/20260926000000_public_intake_outbox.sql`, and scoped contract/integration tests. `POST /api/bookings/submit` changed; `GET /api/internal/public-intakes/sync` was added for the private retry job. Existing public booking aliases remain routed to the same page.

FIXLINE: `components/review-intake-form.tsx`, `lib/review-intake.ts`, `lib/server/intake-identity.ts`, `lib/server/validation.ts`, `lib/server/submission-persistence.ts`, `lib/server/submit-review.ts`, `lib/server/otp-os-integration.ts`, `supabase/migrations/20260926000000_fixline_canonical_lead_id.sql`, and related tests. Existing `POST /api/review/submit` now requires and returns the canonical lead ID; the success screen links to Site booking with that ID.

OTP OS: `index.js`, `server/booking-intake-contract.js`, and `tests/booking-single-writer.integration.test.js`. The existing booking writer accepts and returns lineage lead ID.

### Verification

- Site `npm test`: passed. `npm run build:speed-insights`: passed. HTTP integration exercised outage, retry, duplicate replay, and persistence failure with a test store.
- FIXLINE `npx tsc --noEmit --incremental false`: passed; `npm test`: 138/138 passed; `npm run build`: passed.
- OTP OS booking writer integration: 4/4 passed; contract verification and architecture/contract tests passed. Broad `npm test`: 651/657 passed; six existing navigation tests expect a menu without `STRIKE`, while the current menu contains `STRIKE`. Those failures do not exercise this intake change.
- Local browser QA with mocked network observed a stable lead ID through refresh, same booking body on retry, pending copy after timeout, a new ID after Start Another, and FIXLINE-to-Site lead ID handoff. No real database row or live email was created or verified.

### Deployment checklist and next migration step

Apply both SQL migrations to their respective Site and FIXLINE Supabase projects and confirm service-role access/RLS. Provision Site server-only Supabase credentials and `CRON_SECRET` (or `OTP_PUBLIC_INTAKE_SYNC_SECRET`), then verify the scheduled private route can drain a seeded pending row against a configured OTP OS writer. Deploy the three independent repos in an ordered, reviewed release; verify production same-ID replay, outbox persistence, OTP OS linkage, FIXLINE read linkage, and notification delivery without submitting a fake client lead. Confirm rollback controls and deployment SHAs. Calendar availability, collision handling, timezone-safe reservation, and FIXLINE status mutation remain outside this foundation; do not call a request a booked appointment.

The code foundation is implemented and locally verified. Production durability is unverified until migrations, credentials, deploys, and live replay checks complete. The overall public intake release remains blocked.

## Production durability audit — 2026-09-26

### Migration and configuration state

Site migration `20260926000000_public_intake_outbox.sql` sorts after its existing timestamped Site migration. It creates a new private table with a lead primary key, unique booking ID, request digest check, sync-status check, retry index, RLS, and service-role grant. It is additive; rollback would need to preserve queued rows. A read-only PostgREST schema query using the Site's local production environment snapshot returned HTTP 404 `PGRST205` for `otp_public_intakes`. This proves the table is not exposed at that configured endpoint; it does not independently prove that the snapshot matches the current deployment. Do not apply this migration until the live project identity, schema history, and approved mechanism are verified.

FIXLINE migration `20260926000000_fixline_canonical_lead_id.sql` sorts after its existing timestamped migrations. It adds nullable `lead_id` and `intake_digest` columns and a partial unique lead ID index, so historic tickets remain valid. Its live schema and migration history were not available for verification. OTP OS's lead ID uses existing booking metadata; no new foundation migration is required there. OTP OS has unrelated untracked migration files and deferred migrations whose state must be reconciled before any migration push. No migration was applied.

Site's local `.vercel/.env.production.local` snapshot contains names for `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, and `RESEND_API_KEY`; values were not printed. It lacks `CRON_SECRET`, `OTP_PUBLIC_INTAKE_SYNC_SECRET`, and `OTP_BOOKINGS_UPSTREAM_URL` as named entries. OTP OS's local snapshot contains names for `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OTP_OS_API_BASE`, and `RESEND_API_KEY`. FIXLINE has only an example env file locally. These snapshots establish presence of variable names, not current deployed validity. Live Vercel secret scopes, retry bearer auth, Site-to-OS auth, FIXLINE credentials, API targets, and email delivery remain unverified. No privileged key exposure was found in the new browser code, but the deployed browser bundle has not been inspected.

### Provenance and release manifest

The predeployment manifest is `docs/OTP_PUBLIC_INTAKE_PRODUCTION_MANIFEST_2026-09-26.json`. It records base SHAs, branches, target Vercel projects, required migration IDs, routes, contract versions, and dependency order. `candidateCommit` is null: foundation edits remain uncommitted across all three repositories. Site is on `polish/homepage-shorter-sharper` at `2dff744695549c2a8212bf6df8ed6ed9aa6f4e2e`; FIXLINE is on `main` at `9b89d1ce21a3e788ff9e15192fe341c7e6595157`; OTP OS is on `codex/otp-v43-blocker-burndown` at `2469712f512baf0da94ce03d13eb57aca37f7d36`. The Site's existing scoped release manifest covers another release and does not include the new store or migration. No release candidate or deployment SHA can be certified from these dirty trees. No service was deployed.

### Regression classification and proof gaps

The six STRIKE navigation failures are **KNOWN PRE-EXISTING FAILURE** relative to this intake work. The committed OTP OS `HEAD:public/index.html` already has a primary `⚡ STRIKE` tab, while committed `HEAD:tests/phase8-shell-parity.test.js` expects primary labels without it. The intake diff changes only `index.js`, `server/booking-intake-contract.js`, and booking writer tests, not the navigation HTML or six expectations. They remain unresolved baseline failures and were not edited.

**LOCAL PASS:** this audit reran Site `npm test` (exit 0), `npm run build:speed-insights` (exit 0), and seven focused intake tests (7/7); FIXLINE `npm test` (138/138) and `npm run build` (exit 0); OTP OS `npm run contracts:verify` (7 pinned contracts) and focused booking/architecture/contract tests (16/16). The predeployment manifest parses as JSON. OTP OS broad `npm test` still exits 1 on STRIKE navigation expectations; the prior full run recorded 651/657 tests passing with six failures. No new intake test failure was observed. **PRODUCTION PASS:** none. **NEW RELEASE BLOCKER:** the Site outbox table is unavailable at the configured endpoint and live migration/config state is not verified. Staging persistence, live Site write, FIXLINE linkage, private retry, duplicate suppression, browser production QA, and a disposable production verification lead were not attempted because deployment prerequisites failed. Production verification lead ID: none.

Smallest next action: identify the live Site Supabase project and migration history through the approved database mechanism, reconcile the Site outbox migration and FIXLINE schema there, then form clean, reviewed release commits and update the scoped Site release manifest before running deployment gates. Calendar work remains out of scope.

## Production execution — 2026-09-26

Authenticated Vercel CLI confirmed the three production projects `otp-site`, `otp-fixline`, and `otp-os`. Current Vercel production configuration gives both Site and FIXLINE the same public Supabase API project ref `ckumhowhucbbmpdeqkrl`; Supabase identifies that active project as `OTP SITE`. The earlier description of separate Site and FIXLINE databases was incorrect for the current deployed configuration. OTP OS's database URL is a Vercel Secret and cannot be read from the environment pull; its test environment snapshot points to the same ref, and the live project already contains the OTP OS booking tables and migration history. The Site booking upstream defaults to the deployed OTP OS URL and the writer mode defaults to `otp_os`.

The Supabase connector read live migration history and schema before writes. Neither foundation migration was present. It applied the repository SQL files as migrations `20260926052053_public_intake_outbox` and `20260926052058_fixline_canonical_lead_id`. Post-apply SQL confirmed the Site lead primary key, unique booking ID, retry index, required/default columns, and FIXLINE's nullable lead/digest columns with partial unique lead index. Read-only PostgREST requests for both new paths returned HTTP 200. No existing row was altered or deleted. Site production `CRON_SECRET` was created as a Vercel Secret; its value is not in this report. Secret-bearing variables for FIXLINE and OTP OS are present by name, but end-to-end trust and delivery remain unverified.

Scoped foundation commits were created in OTP OS (`fcc57cdf1d7a2b62bef3d3d1fa8e753150bc3dd3`) and FIXLINE (`d778b2f2232c43f8b96f1340b0abba13e7061f47`). Pre-existing unrelated untracked files remain outside those commits. Site's scoped commit and protected workflow deployment remain in progress. The Site release manifest was updated for this foundation. Local Site contract verification, security scan, syntax check, full suite, build, master CI suite, and public production sweep passed; the public sweep skipped authenticated checks without a local admin credential. The OTP OS CORS hotfix deployment is recorded below; the foundation services remain undeployed, and no production verification lead has been created.

### Production release gate result

The Site foundation code was committed at `2f6987b`; clean detached release worktrees for Site, FIXLINE, and OTP OS contain only the scoped commits. Unrelated untracked files remain preserved in the original FIXLINE and OTP OS checkouts, and an unrelated Site E2E change remains outside its commit. OTP OS's scoped branch was pushed; no production deployment occurred. FIXLINE and Site commits were not pushed because the upstream dependency has not passed its release gate.

The OTP OS strict `npm run release:gate` failed on `mobile_qa` and `security_scan` evidence marked pending. The repository release policy requires fresh real-device mobile QA and trusted CI-signed security evidence tied to the exact release SHA. A local scan using the exact pinned Gitleaks 8.30.1 container on the clean OTP OS commit passed with no leaks, but cannot mint that release evidence. This is an existing OS release policy, not a failure introduced by the intake change. Site local and public production sweep commands passed; the public sweep skipped authenticated checks because no local admin credential was provided. FIXLINE 138 tests and build passed. Six STRIKE navigation failures remain the previously classified unrelated baseline.

No production test lead, retry simulation, duplicate replay, FIXLINE linkage write, or data cleanup was performed because the OTP OS release gate blocks deployment. The live database migration/API checks prove schema availability, not end-to-end production durability.

Human action required: complete the OTP OS real-device mobile QA checklist for commit `fcc57cdf1d7a2b62bef3d3d1fa8e753150bc3dd3` and have its trusted CI release evidence recorded for that exact SHA. Then the agent can recheck the strict gate, deploy in dependency order, and run the live intake/retry proof.

## Physical-device QA finding — 2026-09-26

The exact OTP OS source commit `fcc57cdf1d7a2b62bef3d3d1fa8e753150bc3dd3` was built clean with Xcode 26.6 as app `com.eli3gant.otp`, version 1.0 build 1, installed and launched on a connected **physical iPhone 18 Pro**, iOS 27.2 (`00008160-001A7D491A80000A`). The app shell rendered and session recovery showed an active session, but the Dashboard displayed **Load failed**. Intake and navigation QA could not be marked passed while live data was unavailable. No production lead was created.

The production OTP OS API health route returned 200. A preflight from `capacitor://localhost` returned 204 and allowed credentials, but its `Access-Control-Allow-Headers` omitted `X-OTP-CSRF`. The exact mobile source adds that header after session recovery for data requests. This is a concrete production CORS defect consistent with the device failure. The original exact-SHA device QA is **FAIL**, not a pass.

An isolated OTP OS repair commit `ca5fa4d5754ce0383565db3d1df4d478f3271dc9` adds `X-OTP-CSRF` to the server allowlist and a Capacitor preflight regression test. The repair commit was tested against the production base and cherry-picked as `d949ce257478e69311c3666c96e40a7378b96c58`, whose only source changes are `index.js` and the regression test. The targeted integration file passed 10/10 locally; contracts passed; pinned Gitleaks 8.30.1 reported no leaks. [OTP OS PR 8](https://github.com/ELI3GANT/otp-os/pull/8) ran trusted CI for the related repair commit: the secrets scan passed; the Ubuntu and Windows validation jobs failed on the previously baselined six STRIKE navigation expectations, so the release bundle was skipped. Vercel production deployment `dpl_GRMYwxVYepyVw6fsyKtv91X4LaMG` is READY at `https://otp-qv248yr3i-only-true-perspective.vercel.app` and aliased to `https://otp-os.vercel.app`. Post-deploy health returned 200, and a `capacitor://localhost` preflight returned 204, allowed credentials, and included `X-OTP-CSRF`. This scoped deployment was approved to unblock device QA; it does not certify the foundation release.

The attached physical-iPhone screenshot showed an **Unlocked** toast and, at the same time, **Session expired. Please log in again.** plus the “Some live data could not refresh” toast. Device console evidence recorded `/api/oracle-daily-brief` returning 401 `otp_os_session_required` after login. Code review found the second defect: login set the session cookie to `SameSite=Strict`, which prevents a cross-site Capacitor WebView request from sending that cookie to `https://otp-os.vercel.app`. This explains why the login response could say “Unlocked” while following data requests failed.

Commit `858a59353c41721ff3b0a94532883e995f1a8361` now sets `SameSite=None; Secure` for trusted `capacitor://localhost` and `ionic://localhost` login origins, while preserving `SameSite=Strict` for normal web origins. Logout clears the cookie using the same origin policy. The security integration file passed 11/11, contracts passed, syntax checks passed, and pinned Gitleaks 8.30.1 found no leaks. Vercel deployment `dpl_Ghv1fCSd2dyuRQXuX7RKz6guXTne` is READY and aliased to `https://otp-os.vercel.app`; post-deploy health is 200 and the CORS preflight remains correct. The screenshot predates this second deployment, so no post-cookie-fix device login or live data success has yet been observed. The old cookie must be replaced by a fresh native login. Appium currently cannot rediscover the physical UDID, though Xcode and `devicectl` still see the connected iPhone.

The foundation remains blocked; there is no production intake record, replay/retry, duplicate-suppression, or FIXLINE linkage proof. The next action is a fresh OTP OS login on the iPhone after this cookie deployment, followed by live-data and intake QA.

FOUNDATION BLOCKED
