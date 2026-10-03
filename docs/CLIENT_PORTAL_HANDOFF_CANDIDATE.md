# Client portal handoff candidate

NOT DEPLOYED. This candidate depends on the matching OTP OS canonical client reader.

Changed files: server.js; server/client-portal-handoff.js; client-portal-v2.js; client-portal-utils.js; docs/OTP_SITE_WRITER_BOUNDARY.md; tests/client_portal_handoff.test.js; tests/api_surface_security_contract.test.js.

GET /api/client-portal/:token delegates server-side to OS GET /api/v1/client/portal/:token. New GET /api/v1/client/portal/:token/documents/:type/:format delegates token-bound documents. No staff JWT is used for these reads: the opaque token is checked against one active project by the OS reader. That explains the exact document-route security allowlist entry. Privileged staff APIs are unaffected.

/client/:portalToken, /portal, booking aliases, and /os routing are preserved. No Vercel route changes. Portal handoff failures return private no-store generic responses. No automatic legacy database fallback; OTP_CLIENT_PORTAL_READER_MODE=legacy_direct is an explicit rollback setting only.

Local checks: full Site suite passed after updating the token-route security contract, handoff tests passed, four pinned contracts verified, build:speed-insights passed, secret scan passed across 314 files, git diff --check passed. The master suite's optional online audit skipped because its default API URL was offline; targeted QA API checks ran separately.

Isolated QA: saved OS project and real invoice HTML/PDF returned through canonical reads; public booking persisted with exactly one record across retries. Authenticated OS review promoted the public inquiry into one operational project; replay reused its project and invite. The promoted client workspace and reviewed scope were observed inside the native simulator.

Vercel checklist: deploy OS canonical reader only after its required exact-commit release gate; verify production client API; validate a clean scoped Site manifest; run production-release.yml with CLEAN_RELEASE; verify all booking aliases, token privacy, document readiness, PDFs, payments, /os, and mobile layouts. No production deployment has been performed for this candidate.

Next migration: retire the documented legacy direct portal reader after production canonical handoff and its rollback path are verified.
