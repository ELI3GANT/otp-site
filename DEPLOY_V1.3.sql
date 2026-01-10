-- OTP SYSTEM MIGRATION V1.3.0
-- Finalizing CMS & Real-time Integration

-- 1. CMS CONTENT TABLE
-- This table stores dynamic content blocks for the Live Site Editor
CREATE TABLE IF NOT EXISTS site_content (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    key text UNIQUE NOT NULL, -- e.g. 'hero-title'
    content text NOT NULL,
    updated_by text
);

-- 2. ENABLE RLS FOR SITE_CONTENT
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON site_content;
CREATE POLICY "Allow All" ON site_content FOR ALL USING (true) WITH CHECK (true);

-- 3. ENABLE REALTIME FOR SITE_CONTENT
ALTER PUBLICATION supabase_realtime ADD TABLE site_content;

-- 4. ENSURE SYSTEM GLOBAL STATE EXISTS
-- This row is used to sync theme, maintenance mode, and visuals across all users
INSERT INTO posts (title, slug, content, published)
VALUES ('SYSTEM_GLOBAL_STATE', 'system-global-state', '{"theme": "dark", "maintenance": "off", "visuals": "high", "kursor": "on"}', false)
ON CONFLICT (slug) DO NOTHING;

-- 5. UPGRADE BROADCASTS TABLE
-- Ensure broadcasts has views and tags
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='broadcasts' AND column_name='views') THEN
        ALTER TABLE broadcasts ADD COLUMN views int8 DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='broadcasts' AND column_name='tags') THEN
        ALTER TABLE broadcasts ADD COLUMN tags text[] DEFAULT '{}';
    END IF;
END $$;

-- 6. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
