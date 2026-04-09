-- OTP SECURITY HARDENING V1.5.0
-- This script secures all database tables against unauthorized access from the public frontend.
-- ONLY THE SERVER-SIDE BACKEND (via the Supabase Service Role Key) will have write access.
-- Public users can only read content required to view the site.

-- 1. POSTS (Articles, Insights, Global State)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON posts;
DROP POLICY IF EXISTS "Public Select" ON posts;
CREATE POLICY "Public Select" ON posts FOR SELECT USING (true);
-- Note: INSERTS/UPDATES/DELETES are implicitly denied via RLS-enabled + no matching policy

-- 2. CONTACTS (Leads / Form Submissions)
-- These contain PII (Email, Name) and MUST NOT BE PUBLICLY READABLE.
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON contacts;
-- This table remains fully secured. No 'SELECT' or 'INSERT' policies exist for 'anon'.
-- The 'server.js' backend uses 'service_role' to bypass these restrictions.

-- 3. BROADCASTS (Live Transmissions)
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON broadcasts;
DROP POLICY IF EXISTS "Public Select" ON broadcasts;
CREATE POLICY "Public Select" ON broadcasts FOR SELECT USING (true);

-- 4. SITE_CONTENT (Live Site Editor Storage)
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON site_content;
DROP POLICY IF EXISTS "Public Select" ON site_content;
CREATE POLICY "Public Select" ON site_content FOR SELECT USING (true);

-- 5. CATEGORIES & ARCHETYPES (CMS Metadata)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON categories;
DROP POLICY IF EXISTS "Public Select" ON categories;
CREATE POLICY "Public Select" ON categories FOR SELECT USING (true);

ALTER TABLE ai_archetypes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON ai_archetypes;
DROP POLICY IF EXISTS "Public Select" ON ai_archetypes;
CREATE POLICY "Public Select" ON ai_archetypes FOR SELECT USING (true);

-- 6. LEADS (Deprecated/Backup Leads Table)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON leads;
-- Fully secured. Backend access only.

-- 7. STORAGE SECURITY (Public Access only for Downloads)
-- Restrict bucket 'uploads' to public read, but restricted write.
-- This assumes policies for storage.objects for bucket_id = 'uploads'.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'uploads' );
-- All uploads now happen via Admin Portal using Service Role, so Public Insert is NO LONGER REQUIRED.

-- 8. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
