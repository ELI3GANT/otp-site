-- OTP SYSTEM DEPLOYMENT V1.1 (LIVE EDITOR & STATUS)
-- Execute this script to enable "Site Command Pro" and "Live Editor" features.

-- 1. CMS CONTENT TABLE (Live Site Editor)
CREATE TABLE IF NOT EXISTS site_content (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    key text UNIQUE NOT NULL, -- e.g. 'hero-subtitle'
    content text NOT NULL,
    updated_by text
);

-- Enable RLS for CMS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON site_content;
CREATE POLICY "Allow All" ON site_content FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for CMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'site_content') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE site_content;
  END IF;
END $$;

-- 2. SYSTEM GLOBAL STATE (Proactive Alerts)
-- This row stores the shared state for Theme, Maintenance, and Status
INSERT INTO posts (title, slug, content, published, category)
VALUES ('SYSTEM_GLOBAL_STATE', 'system-global-state', '{"theme": "dark", "maintenance": "off", "visuals": "high", "kursor": "on", "status": "OPERATIONAL"}', false, 'System')
ON CONFLICT (slug) DO NOTHING;

-- 3. CONTACTS TABLE (Lead Capture)
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    name text,
    email text,
    service text,
    message text,
    budget text,
    timeline text,
    status text DEFAULT 'new'
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert" ON contacts;
CREATE POLICY "Public Insert" ON contacts FOR INSERT WITH CHECK (true);

-- 4. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
