# Terminal Sweep Fixes - Verification Checklist

## Code Changes Verification

### ✓ safeEvaluate() Helper
- [x] Function added at top of script (lines 22-42)
- [x] Retries up to 3 times on "Execution context was destroyed" error
- [x] Waits for load state between retries
- [x] All page.evaluate() calls routed through this helper

### ✓ Load State Management
- [x] After page.goto(): Added waitForLoadState('domcontentloaded')
- [x] Before modal visibility checks: Added waitForLoadState('domcontentloaded')
- [x] After element clicks that open modals: Added waitForLoadState('domcontentloaded')
- [x] After async operations (openReplyManager): Added waitForLoadState('domcontentloaded')

### ✓ Locator-Based Waits
- [x] Terminal render check: #opsJobsBadge uses locator.waitFor()
- [x] Job editor: #opsJobsEditor uses locator.waitFor()
- [x] Reply modal fallback: Uses locator.waitFor() as secondary strategy

### ✓ Safe Evaluate Implementations
- [x] fetchOpsJobs(): safeEvaluate()
- [x] fetchKnowledgeFiles(): safeEvaluate()
- [x] fetchInbox(): safeEvaluate()
- [x] openReplyManager() calls: safeEvaluate()
- [x] fetchLeads(): safeEvaluate()
- [x] openDocPacket(): safeEvaluate()
- [x] __docPacketState access: safeEvaluate()

### ✓ Error Handling
- [x] waitReplyModalVisible() has error handling with fallback
- [x] Navigation errors caught and re-thrown with context
- [x] All .catch(() => {}) handlers preserve functionality

## Script Validation

### ✓ Syntax
- [x] node -c scripts/prod_terminal_sweep.js passes

### ✓ Logic Flow
- [x] Token validation happens before browser launch
- [x] Gate redirect detection happens after first navigation
- [x] All operations maintain strict failure modes for real issues
- [x] Retry logic only for transient navigation errors

## CI/CD Configuration

### ✓ GitHub Actions Workflow
- [x] No changes needed to .github/workflows/ci.yml
- [x] Terminal-sweep job remains properly configured
- [x] 20-minute timeout is adequate for improved script
- [x] Playwright Chromium installation step present

### ✓ Package.json Scripts
- [x] "health:terminal": "node scripts/prod_terminal_sweep.js" unchanged
- [x] Can be run locally with: npm run health:terminal
- [x] Requires OTP_ADMIN_TOKEN environment variable

## Quality Assurance

### Retry Logic Verification
- Condition: "Execution context was destroyed" error
- Action: Retry up to 3 times with load state waits
- Result: Should recover from transient navigation conflicts

### Timing Robustness Improvements
1. **Before**: Arbitrary 800ms timeout after navigation
   **After**: Proper waitForLoadState('domcontentloaded')

2. **Before**: Direct page.evaluate() calls without retry
   **After**: safeEvaluate() with automatic retry on context destruction

3. **Before**: Modal visibility checks could race with navigation
   **After**: Added load state waits before checks

4. **Before**: Mixed wait strategies (selector/function/timeout)
   **After**: Consistent locator-based waits

## Real Failure Detection
✓ Script preserves strict failure modes:
- Token validation errors: Still thrown
- Gate redirect: Still thrown
- Terminal UI not rendering: Still thrown
- Job editor not opening: Still thrown
- Page errors: Still captured and reported
- Request failures: Still captured and reported

Note: Only adds retry logic for transient context-destruction errors.

## Testing Recommendations

### Local Testing (with valid OTP_ADMIN_TOKEN)
```bash
OTP_ADMIN_TOKEN="your.jwt.token" npm run health:terminal
```
Expected: JSON output with { ok: true/false, events: [...] }

### GitHub Actions Testing
1. Push changes to main branch
2. Monitor terminal-sweep job in Actions tab
3. Verify no "Execution context was destroyed" errors in logs
4. Confirm job completes successfully

### Regression Testing
Ensure these features still work as expected:
- [ ] OPS Jobs loading and badge display
- [ ] Knowledge base file listing
- [ ] Doc generation (Proposal, Invoice, Agreement, etc.)
- [ ] PDF/DOCX exports
- [ ] Packet preview and ZIP export
- [ ] Reply modal opens with inbox threads
- [ ] Doc packet modal opens and toggles work
- [ ] Send button gate transitions correctly
- [ ] Quick deal mode math calculations work
- [ ] All console errors/page errors are captured

## Deployment Checklist
- [x] Code review completed
- [x] Syntax validation passed
- [x] No breaking changes to output format
- [x] CI/CD workflow remains unchanged
- [x] Backwards compatible with existing scripts
- [x] Error handling preserves real failure detection
- [x] Retry logic handles transient errors only
- [x] Documentation updated (TERMINAL_SWEEP_FIX.md)

## Post-Deployment Monitoring
1. Watch GitHub Actions for successful terminal-sweep runs
2. Monitor for any patterns of "Execution context was destroyed" errors (should be rare)
3. Confirm JSON output format remains valid
4. Check that real failures are still properly detected and reported

## Rollback Plan
If issues arise:
1. Revert scripts/prod_terminal_sweep.js to previous version
2. Push fix to main branch
3. Terminal-sweep job will use reverted version on next run
4. No other files need reversion
