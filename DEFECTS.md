# Defect Log - Live Site Debugging
**Date:** 2026-01-13
**Environment:** Localhost / Static Analysis
**Tester:** Gemini CLI

## 1. Critical Defects
### [C-01] Mobile Menu Closes on Scroll (FIXED)
- **Location:** `site-init.js` (Line ~950)
- **Description:** The mobile menu (`.nav-drawer`) has a scroll listener on `window` that forces it to close.
- **Resolution:** Added a 50px threshold check and ensured `nav-open` class is removed from body. Added `body.nav-open { overflow: hidden }` to CSS.
- **Status:** Verified.

## 2. Major Defects
### [M-01] Server Startup Reliability (FIXED)
- **Location:** `server.js`
- **Description:** Server failed to bind to port 8080 reliably (IPv6 vs IPv4 conflict).
- **Resolution:** Modified `server.js` to explicitly listen on `0.0.0.0`.
- **Status:** Verified.

### [M-02] Admin Toast Dependency (FIXED)
- **Location:** `admin-core.js`
- **Description:** Global error handler uses `window.showToast` which might not be defined if the error occurs during early initialization.
- **Resolution:** Hoisted `showToast` definition to the top of the file.
- **Status:** Verified.

## 3. Minor Defects
### [m-01] Missing Timeout Command
- **Location:** System/Shell
- **Description:** `timeout` command missing on macOS environment.
- **Recommendation:** Use native node scripts or `perl` for timeouts.

## 4. Resolved - Perspective Audit Cycle (2026-01-14)
### [C-02] Admin Sync Crash (FIXED)
- **Location:** `admin-core.js`
- **Description:** Admin terminal crashed ("Syncing Error") when Supabase returned `answers` as a string instead of JSON.
- **Resolution:** Added `JSON.parse` safety check in `fetchLeads`.
- **Status:** Verified.

### [M-03] Missing Goal in Audit Data (FIXED)
- **Location:** `audit-engine.js`, `server.js`, `admin-core.js`
- **Description:** User's specific "Growth Goal" (Step 5) was not being captured or displayed.
- **Resolution:** Added `q5_goal` to capture flow, server prompt, and admin UI.
- **Status:** Verified.

### [M-04] Gemini Rate Limits (FIXED)
- **Location:** `server.js`
- **Description:** Frequent 429 errors from Gemini API caused audit generation to fail.
- **Resolution:** Implemented exponential backoff retry logic for 429 responses.
- **Status:** Verified.