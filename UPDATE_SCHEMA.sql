-- OTP SYSTEM UPGRADE V3.5
-- Run this in Supabase SQL Editor to enable all features.

-- 1. FIX COLUMNS
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text default 'OTP Admin';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_desc text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views int8 default 0;

-- 2. PERMISSIONS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

-- 3. STORAGE POLICIES
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'uploads' );
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'uploads' );

-- 4. ANALYTICS FUNCTION (Crucial for View Tracking)
CREATE OR REPLACE FUNCTION increment_view_count(post_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts
  SET views = COALESCE(views, 0) + 1
  WHERE slug = post_slug;
END;
$$;

-- 5. CLEANUP OLD DATA (Reset views to 0 for a fresh start)
UPDATE posts SET views = 0;

-- 6. REFRESH CACHE
NOTIFY pgrst, 'reload schema';