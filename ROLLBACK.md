# 🔄 DEPLOYMENT ROLLBACK PROCEDURES (v1.0.0)

## 🚨 CRITICAL INCIDENT PROTOCOL

**Triggers for Rollback:**
1.  **500/502 Errors:** Sustained error rate > 1% on `otp-terminal.html` or main site.
2.  **Data Loss:** Confirmed reports of missing `posts` or broken `increment_view_count`.
3.  **UI Regression:** Admin Dashboard inaccessible or Theme Toggle causing crashes.

---

## 🛠 PHASE 1: CODE REVERSION

### Option A: Git Revert (Preferred)
Run these commands in your local terminal:

```bash
# 1. Checkout the previous stable release (or main before merge)
git checkout main

# 2. Revert the specific deployment commit
git revert -m 1 HEAD

# 3. Verify local stability
open index.html
open otp-terminal.html

# 4. Push the reversion
git push origin main
```

### Option B: Hard Reset (Emergency Only)
*Use only if the commit history is corrupted.*

```bash
git reset --hard HEAD~1
git push origin main --force
```

---

## 💾 PHASE 2: DATABASE ROLLBACK

If `DEPLOY_V1.sql` caused data issues (e.g., the permissions reset locked everyone out):

1.  **Access Supabase Dashboard** > **SQL Editor**.
2.  **Run Emergency Restore Script**:

```sql
-- REVERT PERMISSIONS TO PERMISSIVE STATE
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

-- DROP NEW FUNCTION IF CAUSING ERRORS
DROP FUNCTION IF EXISTS increment_view_count(text);

-- RESET STORAGE POLICIES
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'uploads' );
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'uploads' );
```

---

## 📢 PHASE 3: COMMUNICATION

1.  **Notify Team:** "Deployment v1.0.0 rolled back due to [REASON]."
2.  **Status Page:** Update status to "Investigating".
3.  **Logs:** Download `server.log` and Supabase logs for post-mortem.
