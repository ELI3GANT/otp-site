# OTP Terminal + OTP Oracle — system blueprint

This document is the **operating blueprint** for keeping every Terminal area healthy, with **OTP Oracle** as a first-class dependency where it applies. Use it for onboarding, regression planning, and bug triage.

## 1. Definitions

- **OTP Terminal**: Admin UI (`otp-terminal.html` + `admin-core.js`) for ops, knowledge, docs, inbox/leads, and site control.
- **OTP Oracle (product)**: The **recommendation + grounding layer** that turns lead/contact context + indexed knowledge into **package quote signals, required documents, next actions, and `knowledge_basis` citations**. Server implementation is centered on `runOracleRecommendation()` in `server.js`.
- **“Works”**: Section loads, primary actions complete without silent failure, errors are visible (toast/UI), auth rules are consistent, and **Oracle-backed flows stay fresh** after knowledge changes (see §4.4).

## 2. Architectural truth (single source of truth)

| Layer | Responsibility |
|--------|------------------|
| **Server** `POST /api/admin/knowledge/recommend` | Canonical Oracle run for a lead/contact; persists snapshot under `site_content` key `kb_lead_rec::<id>`; returns `recommendation`, `confidence`, `updated_at`, `kb_updated_at`. |
| **Server** `POST /api/admin/ops/jobs/from-oracle` | Runs the same Oracle + snapshot persist, then **creates/updates** an `ops_jobs` row (`source_type: oracleLead`) with package, totals (parsed from `quote_range` or safe default), and description — Terminal **JOB ⊕ ORACLE** / reply modal **JOB SHEET (ORACLE)**. |
| **Server** `POST /api/admin/knowledge/recommendations` | Bulk read of saved recommendations for lead cards. |
| **Server** `GET /api/admin/knowledge/meta` | Global **knowledge index** freshness stamp (`kb_meta::index`), bumped on upload/archive/delete/structured edits. |
| **Server** `POST /api/admin/docs/packet` | Doc packet path; calls **`runOracleRecommendation`** so packet HTML/DOCX aligns with the same Oracle as replies. |
| **Terminal** | Caches Oracle in `replyOracleCache` / `leadOracleCache`; uses **TTL + `kb_updated_at`** to avoid stale recommendations (see `ensureOracleRecommendationFresh`, `isOracleCacheFresh`). |

**Rule for engineers**: New features that “sound like Oracle” should call **`/api/admin/knowledge/recommend`** (or reuse `requestLeadBrain` / server helper), not duplicate scoring in the browser.

## 3. Terminal sections → systems map

Rough order as shown in `otp-terminal.html`. “Oracle?” indicates **direct** use of the recommendation API or packet path that embeds Oracle.

| Section | Primary surface | Key APIs / paths | Oracle? | Freshness / cache notes |
|---------|----------------|------------------|---------|-------------------------|
| **00 Site Command Pro** | Live toggles, theme, maintenance | `secureRead`/`secureWrite` via admin proxy, site config keys | Indirect (site-wide) | N/A for Oracle |
| **01 Visual analytics** | Charts, stats | Analytics endpoints / secure reads | No | N/A |
| **05 Secure Inbox** | Threads, reply modal | `contacts` via `secureRead`/`secureWrite`; reply gen `/api/ai/chat` | **Yes** — `runOracleForReplyContext`, `generateReplyForLead` uses `ensureOracleRecommendationFresh` + citations | Reply cache keyed by `contacts:<id>`; **inbox load** also refreshes KB meta so staleness detection works without opening Leads |
| **06 Perspective Audit Leads** | Lead list, brain cards | `leads` + `loadLeadBrainCache` → `/api/admin/knowledge/recommendations`; `runLeadBrain` → `/recommend` | **Yes** | Cards can show saved rec until re-run; opening settings/knowledge refresh helps meta; **RE-RUN** forces new recommend |
| **06.5 Knowledge Index** | PDF/DOCX upload, archive | `/api/admin/knowledge/*`, `/api/admin/knowledge/meta` | **Feeds Oracle** | Upload/structured change bumps **global KB meta**; invalidates client Oracle freshness |
| **06.5 Structured knowledge** | Priority rules, doc rules | `/api/admin/knowledge/structured/*` | **Feeds Oracle** | Same as above |
| **06.6 Quick Deal** | Fast deal → ops job | Ops jobs API | Usually no direct Oracle call | Validate intake fields; job then available for ops docs |
| **06.7 Job Sheet / Ops** | CRUD jobs, ops doc exports | Ops jobs + `/api/admin/ops/jobs/from-oracle` + `/api/admin/ops/docs/*` (and related) | **Yes** — `from-oracle` runs `runOracleRecommendation` + persists `kb_lead_rec::`; job row feeds invoice/doc paths | After KB changes, re-run **JOB ⊕ ORACLE** on a lead to refresh the sheet |
| **07 Session activity** | Logs | Reads local / server logs per implementation | No | N/A |
| **08 Broadcasts** | Broadcast UI | Config / secure writes | No | N/A |
| **Oracle Hub / Post composer / AI** | Long-form AI, archetypes | `/api/ai/generate`, `/api/ai/chat`, post writes | **Partial** — LLM features; not always the same as **knowledge recommend** | When copy should match business rules, **also** run Oracle or cite knowledge in prompt |
| **Doc packet modal** | Packet generate, approve, DOCX | `/api/admin/docs/packet`, download/approve/send endpoints | **Yes** | Uses server Oracle; master DOCX templates in Settings |
| **Settings** | Templates, session, AI defaults | `/api/admin/docs/templates/status`, `upload`, `/api/admin/knowledge/meta` | **Indirect** — templates + KB quality drive Oracle outputs | After template upload, status auto-refreshes |

## 4. Verification stack (how we “ensure everything works”)

### Post-deploy health ritual (recommended after meaningful deploys)

1. **Local contract suite**: `npm run health:local` (same as `npm test`).
2. **Production Terminal sweep** (needs a real admin JWT — never commit it):  
   `OTP_ADMIN_TOKEN=<jwt> npm run health:terminal`  
   Expect JSON with `"ok": true` and no `pageerror` / console `error` events in `events`.
3. **One-shot both** (fails if `OTP_ADMIN_TOKEN` is missing — export it first):  
   `OTP_ADMIN_TOKEN=<jwt> npm run health:post-deploy`

### 4.1 Automated (required before merge)

1. **`npm test`** — `tests/master_runner.js` (contracts: Oracle, terminal, ops, docs, etc.).
2. **`OTP_ADMIN_TOKEN=<jwt> node scripts/prod_terminal_sweep.js`** (or `npm run health:terminal`) — headless Playwright against production Terminal: ops docs, packet zip, knowledge index, quick deal UI; inbox/reply/doc-packet when data exists.

### 4.2 Client journey (website + audit, public API)

Automated contract: `tests/client_journey_contract.test.js` (also in master runner).

- **What it simulates**: A visitor submitting the **contact form** (`POST /api/contact/submit` with `project_type`, `project_details`, etc.) and completing the **Perspective Audit** (`POST /api/audit/submit` with `answers.q1`–`q5_goal`).
- **When it runs**: Only if `GET /api/health` succeeds on `http://127.0.0.1:$PORT` (start `npm start`), or if you set `CLIENT_JOURNEY_API_BASE` (non-local URLs require `CLIENT_JOURNEY_ALLOW_REMOTE=1` so you do not accidentally spam real inboxes from CI).
- **In-person parity**: The same business data often enters via **06.7 Job Sheet** or **06.6 Quick Deal** in the Terminal; Oracle and packets then consume **leads** / **contacts** / **ops_jobs** depending on the path. After this test, open the Terminal **Inbox** / **Leads** and run **OTP Oracle** on the new row.

### 4.3 Manual smoke (high value, short)

- **Homepage contact**: Submit the index form with a throwaway email → success state; repeat with airplane mode / bad network → inline error without crashing (non-JSON responses are handled in `site-init.js`).
- **Knowledge**: Upload a small DOCX → confirm index count increases → run Oracle on a lead → confirm `knowledge_basis` / structured rules surface in recommendation.
- **Reply**: Open thread → **OTP Oracle** → **Generate reply** → confirm tone aligns with required docs + citations block.
- **Packet**: Generate packet → approve → download DOCX for proposal/agreement → confirm merge fields.
- **Settings**: Open **MASTER DOCX** → status shows bucket/prefix and timestamps after upload.

### 4.4 Oracle-specific regression triggers

Run **`/api/admin/knowledge/recommend`** again after:

- Knowledge file upload / replace / archive / delete  
- Structured knowledge save / archive  
- Any change to pricing PDFs that affect chunk text  

Expect Terminal to **not** reuse stale recs (TTL + `kb_updated_at` vs `window.__kbUpdatedAt`).

## 5. Known limitations (communicate to stakeholders)

- **No OCR**: Scanned PDFs with no extractable text will not index usefully.
- **Retrieval is heuristic**, not full embedding RAG; quality depends on chunking and wording.
- **Automation is gated**: Sending contracts/invoices and approvals are intentionally human-in-the-loop.

## 6. Bug intake checklist (for each report)

1. **Section + action** (e.g. “06.5 upload”, “05 generate reply”).  
2. **Token mode** (JWT vs local bypass).  
3. **Network**: failing URL + status + response body snippet.  
4. **Oracle**: last knowledge change time vs recommendation timestamp (`updated_at` / `kb_updated_at`).  
5. **Repro on prod vs local** and whether **`npm test`** / **prod sweep** catch it.

## 7. Next improvements (backlog tied to this blueprint)

- Extend **prod sweep** to force a minimal **Oracle** + **doc packet** path when inbox is empty (e.g. seed QA contact/lead or use `leadData`-only recommend if exposed).  
- Surface **“stale Oracle”** badge on lead brain cards when `kb_updated_at` lags global meta.  
- Optional: **embeddings** or stronger retrieval (post-V1).

---

*Maintainers: keep this file updated when adding a new Terminal section or Oracle entrypoint.*
