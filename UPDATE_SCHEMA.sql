
-- FIX MISSING COLUMNS & FORCE REFRESH
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text default 'OTP Admin';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_desc text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views int8 default 0;

-- OPEN ACCESS FOR ADMIN TOOL (Since we use a custom gatekeeper, not Supabase Auth)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All" ON posts;

CREATE POLICY "Allow All" ON posts
FOR ALL
USING (true)
WITH CHECK (true);

-- FORCE REFRESH TRICK
COMMENT ON TABLE posts IS 'OTP Posts Table (Refreshed)';
NOTIFY pgrst, 'reload schema';
