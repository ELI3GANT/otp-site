-- FIX MISSING AUTHOR COLUMN & FORCE REFRESH
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text default 'OTP Admin';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_desc text;

-- FORCE REFRESH TRICK
COMMENT ON TABLE posts IS 'OTP Posts Table (Refreshed)';
NOTIFY pgrst, 'reload schema';