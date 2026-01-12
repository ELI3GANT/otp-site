-- OTP SYSTEM DEPLOYMENT V4.0 (MASTER)
-- One Script to Rule Them All.
-- Use this file to initialize or update the entire project database.
-- It is Idempotent (Safe to run multiple times).

-- =================================================================
-- 1. STORAGE CONFIGURATION
-- =================================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'uploads' );
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'uploads' );

-- =================================================================
-- 2. POSTS TABLE (Core Content)
-- =================================================================
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    title text,
    slug text UNIQUE,
    content text,
    published boolean DEFAULT false,
    author text DEFAULT 'OTP Admin',
    seo_title text,
    seo_desc text,
    category text,
    views int8 DEFAULT 0,
    image_url text,
    archetype_slug text
);

-- Ensure Columns Exist (for migrations)
DO $$ BEGIN
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text default 'OTP Admin';
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title text;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_desc text;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS views int8 default 0;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS published boolean default false;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url text;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS archetype_slug text;
END $$;

-- RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

-- =================================================================
-- 3. SITE CONTENT (Live Editor)
-- =================================================================
CREATE TABLE IF NOT EXISTS site_content (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    key text UNIQUE NOT NULL,
    content text NOT NULL,
    updated_by text
);

-- RLS
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON site_content;
CREATE POLICY "Allow All" ON site_content FOR ALL USING (true) WITH CHECK (true);

-- Realtime
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'site_content') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE site_content;
  END IF;
END $$;

-- =================================================================
-- 4. SYSTEM GLOBAL STATE (Init Data)
-- =================================================================
INSERT INTO posts (title, slug, content, published, category)
VALUES ('SYSTEM_GLOBAL_STATE', 'system-global-state', '{"theme": "dark", "maintenance": "off", "visuals": "high", "kursor": "on", "status": "OPERATIONAL", "api_base": "https://otp-site.vercel.app"}', false, 'System')
ON CONFLICT (slug) DO NOTHING;

-- =================================================================
-- 5. CONTACTS & AGENT SYSTEM
-- =================================================================
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    name text,
    email text,
    service text,
    message text,
    budget text,
    timeline text,
    status text DEFAULT 'new',
    draft_reply text,
    ai_analysis jsonb,
    ai_status text DEFAULT 'pending'
);

-- Ensure Columns (Backwards Compat)
DO $$ BEGIN
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS status text DEFAULT 'new';
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS draft_reply text;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_analysis jsonb;
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ai_status text DEFAULT 'pending';
END $$;

-- RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Insert" ON contacts;
CREATE POLICY "Public Insert" ON contacts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin Access" ON contacts;
CREATE POLICY "Admin Access" ON contacts USING (true) WITH CHECK (true);

-- =================================================================
-- 6. CATEGORIES & ARCHETYPES (Taxonomy)
-- =================================================================
-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    name text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    post_count int8 DEFAULT 0
);
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON categories;
CREATE POLICY "Allow All" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Archetypes
CREATE TABLE IF NOT EXISTS ai_archetypes (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    category_id integer REFERENCES categories(id) ON DELETE SET NULL,
    name text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL,
    system_prompt text NOT NULL,
    description text,
    model_config jsonb DEFAULT '{}',
    tags text[],
    usage_count int8 DEFAULT 0
);
ALTER TABLE ai_archetypes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON ai_archetypes;
CREATE POLICY "Allow All" ON ai_archetypes FOR ALL USING (true) WITH CHECK (true);

-- Realtime for Taxonomy
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'categories') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE categories;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ai_archetypes') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE ai_archetypes;
    END IF;
END $$;

-- Seed Categories
INSERT INTO categories (name, slug, description)
SELECT 'Strategy', 'strategy', 'Business and growth' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'strategy');
INSERT INTO categories (name, slug, description)
SELECT 'Tech', 'tech', 'Innovation and code' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'tech');
INSERT INTO categories (name, slug, description)
SELECT 'Production', 'production', 'Media and visuals' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'production');

-- =================================================================
-- 7. BROADCASTS (Legacy/Alternative)
-- =================================================================
CREATE TABLE IF NOT EXISTS broadcasts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    title text NOT NULL,
    slug text UNIQUE NOT NULL,
    content text,
    status text DEFAULT 'active',
    views int8 DEFAULT 0,
    tags text[] DEFAULT '{}',
    image_url text,
    author text DEFAULT 'OTP Admin'
);
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON broadcasts;
CREATE POLICY "Allow All" ON broadcasts FOR ALL USING (true) WITH CHECK (true);
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'broadcasts') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE broadcasts;
    END IF;
END $$;

-- =================================================================
-- 8. FUNCTIONS
-- =================================================================
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

-- =================================================================
-- 9. FINAL REFRESH
-- =================================================================
NOTIFY pgrst, 'reload schema';
