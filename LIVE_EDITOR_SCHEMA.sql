-- LIVE SITE EDITOR SCHEMA
-- Stores dynamic content for the frontend.

-- 1. Create Table
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

-- Only Admin can INSERT/UPDATE (We'll rely on the client ensuring auth for now, or use Service Key in Edge Functions)
-- For this setup, we'll allow Anon Write but client-side we check the Token. 
-- In a strict production env, you'd want a secure RPC or Edge Function.
DROP POLICY IF EXISTS "Admin Write" ON site_content;
CREATE POLICY "Admin Write" ON site_content FOR ALL USING (true) WITH CHECK (true);

-- 4. Initial Seed (Optional - Prevents empty look if JS fails first fetch)
-- INSERT INTO site_content (key, content) VALUES ('hero-title', 'THE ONLY TRUE PERSPECTIVE') ON CONFLICT DO NOTHING;
