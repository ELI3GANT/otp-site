-- OTP SYSTEM DEPLOYMENT V1.0 (RELEASE CANDIDATE)
-- Execute this script in the Supabase SQL Editor to finalize the database schema.

-- 1. ENSURE COLUMNS EXIST
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text default 'OTP Admin';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_desc text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views int8 default 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS published boolean default false;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url text;

-- 2. RESET/ENSURE PERMISSIONS (Open Access for Demo/Dev)
-- Note: For strict production, restrict INSERT/UPDATE/DELETE to authenticated users.
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

-- 3. STORAGE CONFIGURATION
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'uploads' );
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'uploads' );

-- 4. ANALYTICS FUNCTION (REQUIRED FOR VIEW TRACKING)
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

-- 5. REFRESH SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
