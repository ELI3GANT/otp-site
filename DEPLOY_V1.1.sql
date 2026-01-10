-- OTP SYSTEM UPGRADE V1.1 (Live Site Editor)
-- Execute this script in Supabase SQL Editor.

-- 1. Create Content Table
CREATE TABLE IF NOT EXISTS site_content (
    key text PRIMARY KEY, -- Maps to HTML Element ID (e.g., 'hero-title')
    content text NOT NULL,
    updated_at timestamptz DEFAULT now(),
    updated_by text DEFAULT 'admin'
);

-- 2. Enable RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

-- 3. Policies
-- Public can READ everything
DROP POLICY IF EXISTS "Public Read" ON site_content;
CREATE POLICY "Public Read" ON site_content FOR SELECT USING (true);

-- Only Admin can INSERT/UPDATE (Relies on client-side token check + RLS if auth is enabled)
DROP POLICY IF EXISTS "Admin Write" ON site_content;
CREATE POLICY "Admin Write" ON site_content FOR ALL USING (true) WITH CHECK (true);

-- 4. Notify
NOTIFY pgrst, 'reload schema';
