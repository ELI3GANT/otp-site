-- EXPANDED SCHEMA MIGRATION
-- OTP SYSTEM V1.2.7

-- 1. MIGRATE CATEGORIES TO INTEGER ID
-- Drop and recreate to ensure clean integer transition as requested
DROP TABLE IF EXISTS ai_archetypes;
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
    id SERIAL PRIMARY KEY, -- Using Serial for integer auto-increment
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    name text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    post_count int8 DEFAULT 0
);

-- 2. CREATE EXPANDED AI ARCHETYPES
CREATE TABLE ai_archetypes (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    category_id integer REFERENCES categories(id) ON DELETE SET NULL, -- Foreign Key
    name text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL,
    system_prompt text NOT NULL,
    description text,
    model_config jsonb DEFAULT '{}', -- Expanded model settings
    tags text[],
    usage_count int8 DEFAULT 0
);

-- 3. UPDATED AT TRIGGERS
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_categories_modtime BEFORE UPDATE ON categories FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_archetypes_modtime BEFORE UPDATE ON ai_archetypes FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- 4. RE-ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_archetypes;

-- 5. RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ai_archetypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON ai_archetypes FOR ALL USING (true) WITH CHECK (true);

-- 6. SEED DATA
INSERT INTO categories (name, slug, description) VALUES
('Strategy', 'strategy', 'Business and growth strategies'),
('Tech', 'tech', 'Technical breakdowns and innovation'),
('Production', 'production', 'Visual and media production'),
('Case Study', 'case-study', 'In-depth analysis of past projects');

INSERT INTO ai_archetypes (category_id, name, slug, system_prompt, description, tags, model_config) VALUES
(1, 'Business Strategy', 'strategy', 'You are a business consultant. Focus on ROI, growth, and market positioning.', 'High-level business insights', ARRAY['business', 'growth'], '{"temperature": 0.7, "top_p": 1}'),
(2, 'Technical Breakdown', 'technical', 'You are a technical specialist. Focus on code, architecture, and efficiency.', 'Detailed technical analysis', ARRAY['code', 'architecture'], '{"temperature": 0.3, "top_p": 1}'),
(3, 'Visual Launch', 'launch', 'You are a visual media expert. Focus on design, impact, and storytelling.', 'Impactful visual announcements', ARRAY['design', 'media'], '{"temperature": 0.8, "top_p": 1}'),
(4, 'Case Study', 'case-study', 'You are an analytical researcher. Focus on data, results, and lessons learned.', 'Evidence-based project reviews', ARRAY['data', 'results'], '{"temperature": 0.5, "top_p": 1}');
-- TAGGING SYSTEM SCHEMA (PERFORMANCE OPTIMIZED)
-- OTP SYSTEM V1.2.6

-- 1. ADD TAGS TO POSTS (with existence check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='tags') THEN
        ALTER TABLE posts ADD COLUMN tags text[] DEFAULT '{}';
    END IF;
END $$;

-- 2. ADD TAGS TO BROADCASTS (with existence check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='broadcasts' AND column_name='tags') THEN
        ALTER TABLE broadcasts ADD COLUMN tags text[] DEFAULT '{}';
    END IF;
END $$;

-- 3. PERFORMANCE INDEXING
-- GIN (Generalized Inverted Index) is required for fast searching inside arrays
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_broadcasts_tags ON broadcasts USING GIN (tags);

-- 4. REFRESH CACHE
NOTIFY pgrst, 'reload schema';