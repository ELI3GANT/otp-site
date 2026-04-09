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

-- 6. MIGRATE CATEGORIES & ARCHETYPES (FROM V1.2)
-- 6.1 Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    name text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    post_count int8 DEFAULT 0
);

-- 6.2 Archetypes Table
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

-- 6.3 Enable Realtime & RLS
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_archetypes;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON categories;
CREATE POLICY "Allow All" ON categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ai_archetypes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON ai_archetypes;
CREATE POLICY "Allow All" ON ai_archetypes FOR ALL USING (true) WITH CHECK (true);

-- 6.4 Seed Default Data (If Empty)
INSERT INTO categories (name, slug, description)
SELECT 'Strategy', 'strategy', 'Business and growth strategies'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'strategy');

INSERT INTO categories (name, slug, description)
SELECT 'Tech', 'tech', 'Technical breakdowns and innovation'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'tech');

INSERT INTO categories (name, slug, description)
SELECT 'Production', 'production', 'Visual and media production'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'production');

-- 7. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
