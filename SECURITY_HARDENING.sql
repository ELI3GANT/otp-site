-- OTP SECURITY HARDENING V1.0
-- Run this in Supabase SQL Editor to secure your database.

-- 1. LEADS TABLE (Secure user data)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow Public Insert" ON leads;
DROP POLICY IF EXISTS "Admin Full Access" ON leads;
CREATE POLICY "Allow Public Insert" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin Full Access" ON leads TO service_role USING (true) WITH CHECK (true);

-- 2. CONTACTS TABLE (Secure messages)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow Public Insert" ON contacts;
DROP POLICY IF EXISTS "Admin Full Access" ON contacts;
CREATE POLICY "Allow Public Insert" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin Full Access" ON contacts TO service_role USING (true) WITH CHECK (true);

-- 3. POSTS TABLE (Blog content)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON posts;
DROP POLICY IF EXISTS "Admin Full Access" ON posts;
CREATE POLICY "Public Read" ON posts FOR SELECT USING (published = true);
CREATE POLICY "Admin Full Access" ON posts TO service_role USING (true) WITH CHECK (true);

-- 4. BROADCASTS TABLE (Live updates)
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON broadcasts;
DROP POLICY IF EXISTS "Admin Full Access" ON broadcasts;
CREATE POLICY "Public Read" ON broadcasts FOR SELECT USING (status = 'active');
CREATE POLICY "Admin Full Access" ON broadcasts TO service_role USING (true) WITH CHECK (true);

-- 5. SITE CONTENT (Dynamic components)
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Content" ON site_content;
DROP POLICY IF EXISTS "Admin Full Access" ON site_content;
CREATE POLICY "Public Read Content" ON site_content FOR SELECT USING (true);
CREATE POLICY "Admin Full Access" ON site_content TO service_role USING (true) WITH CHECK (true);

-- NOTE: STORAGE POLICIES
-- Due to permissions on the 'storage' schema, please configure your 'uploads' bucket policies 
-- via the Supabase Dashboard (Storage > Policies) rather than this SQL script.
-- 1. Ensure 'uploads' bucket is PUBLIC for reading.
-- 2. Restrict INSERT/UPDATE/DELETE to 'authenticated' or use the Dashboard UI to set specific rules.
