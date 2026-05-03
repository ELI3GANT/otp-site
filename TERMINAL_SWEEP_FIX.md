# Terminal Sweep Script Fixes - Summary

## Issue
GitHub Actions `terminal-sweep` job was failing with:
```
page.evaluate: Execution context was destroyed, most likely because of a navigation.
```

## Root Cause Analysis
The error occurred due to race conditions between Playwright operations and page navigation:

1. **No load state waits after navigation** - After `page.goto()`, the script used arbitrary timeouts instead of waiting for the page to fully stabilize
2. **Fragile page.evaluate() calls** - Direct `page.evaluate()` calls without handling potential context destruction
3. **Navigation during async operations** - Modal opens and async handlers could trigger navigation while the execution context was being used
4. **Missing retry logic** - No recovery mechanism for transient "Execution context was destroyed" errors
5. **Inconsistent wait strategies** - Mixed use of `waitForSelector`, `waitForFunction`, and arbitrary timeouts

## Solutions Implemented

### 1. Added `safeEvaluate()` Helper Function
```javascript
async function safeEvaluate(page, fn, maxRetries = 3)
```
- Wraps all `page.evaluate()` calls
- Automatically retries up to 3 times if "Execution context was destroyed" error occurs
- Waits for `domcontentloaded` load state between retries
- Ensures execution context is stable before each retry

### 2. Proper Load State Management
After initial navigation:
```javascript
await page.waitForLoadState('domcontentloaded').catch(() => {});
await page.waitForTimeout(500);
```
- Added to stabilize page after `page.goto()`
- Added before/after all async operations that might trigger navigation
- Added after element clicks that open modals

### 3. Replaced Fragile Selectors with Locator-Based Waits
Changed from:
```javascript
await page.waitForSelector('#element', { timeout: 15000 });
```
To:
```javascript
await page.locator('#element').waitFor({ timeout: 15000 });
```
- Better Playwright API with built-in error handling
- More robust against context destruction

### 4. Enhanced `waitReplyModalVisible()` Function
Added fallback strategy:
- First attempts `waitForFunction` with DOM checks
- If that fails with "Execution context was destroyed", waits for load state
- Falls back to locator-based wait as secondary strategy
- Provides graceful degradation

### 5. Applied `safeEvaluate()` to All Critical Operations
Updated all `page.evaluate()` calls to use `safeEvaluate()`:
- `fetchOpsJobs()`
- `fetchKnowledgeFiles()`
- `fetchInbox()`
- `openReplyManager()` calls
- `fetchLeads()`
- `openDocPacket()`
- `__docPacketState` access

### 6. Consistent Navigation Wait Pattern
Before any async operation that might change page state:
```javascript
await page.waitForLoadState('domcontentloaded').catch(() => {});
```
Applied to:
- After button clicks that open modals
- Before checking for modal visibility
- After `openReplyManager()` calls
- Before accessing page state

## Changes File By File

### `/scripts/prod_terminal_sweep.js`

#### Added (Lines 22-42)
- `safeEvaluate()` helper function
- Retry logic for context-destroyed errors
- Load state waits between retries

#### Updated (Line 116+)
- After `page.goto()`: Added `waitForLoadState('domcontentloaded')`
- Terminal render check: Replaced `waitForSelector` with `locator.waitFor()`

#### Updated (Lines 132-135)
- `fetchOpsJobs()`: Changed to `safeEvaluate()`
- `fetchKnowledgeFiles()`: Changed to `safeEvaluate()`

#### Updated (Line 217)
- `fetchInbox()`: Changed to `safeEvaluate()`

#### Updated (Lines 295-318)
- `waitReplyModalVisible()`: Added error handling and fallback to locator-based wait

#### Updated (Line 324)
- `openReplyManager` for contacts: Changed to `safeEvaluate()`

#### Updated (Multiple locations in reply/lead flow)
- Added `waitForLoadState()` after clicks and async operations
- Changed to locator-based waits for modal visibility
- Changed to `safeEvaluate()` for lead operations

#### Updated (Line 428)
- `openDocPacket()`: Changed to `safeEvaluate()`
- Added `waitForLoadState()` after call

#### Updated (Line 468)
- `__docPacketState` access: Changed to `safeEvaluate()`

#### Updated (Line 157)
- Job editor wait: Replaced `waitForSelector` with `locator.waitFor()`

## Testing & Verification

### Pre-deployment Verification
- [x] Syntax check: `node -c scripts/prod_terminal_sweep.js`
- [ ] Local test with OTP_ADMIN_TOKEN (requires valid token)
- [ ] GitHub Actions CI run on main branch

### Monitoring After Deployment
- Watch GitHub Actions `terminal-sweep` job for success
- Monitor for any "Execution context was destroyed" errors in logs
- Verify `npm run health:terminal` passes locally when tested

## Backwards Compatibility
- No changes to command-line interface or output format
- No changes to CI/CD configuration needed
- All improvements are internal stability enhancements
- No functional behavior changed; only timing/retry logic improved

## Performance Impact
- Minimal: Retries only on error, otherwise same performance
- Load state waits ensure proper page stability (better than arbitrary timeouts)
- May slightly increase total execution time if retries are needed, but improves reliability

## Related Files
- `.github/workflows/ci.yml` - Terminal sweep job configuration (no changes needed)
- `package.json` - Contains `health:terminal` script (no changes needed)
