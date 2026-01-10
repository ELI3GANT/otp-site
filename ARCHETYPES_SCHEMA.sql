-- CATEGORIES AND ARCHETYPES SCHEMA
-- OTP SYSTEM V1.2.5

-- 1. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    name text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL,
    description text,
    post_count int8 DEFAULT 0
);

-- 2. AI ARCHETYPES TABLE
CREATE TABLE IF NOT EXISTS ai_archetypes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    name text UNIQUE NOT NULL,
    slug text UNIQUE NOT NULL,
    system_prompt text NOT NULL,
    description text,
    tags text[], -- Array of tags
    usage_count int8 DEFAULT 0
);

-- 3. UPDATE POSTS TABLE
ALTER TABLE posts ADD COLUMN IF NOT EXISTS archetype_slug text;

-- 4. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE ai_archetypes;

-- 5. RLS (Open for demo/dev as per project convention)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ai_archetypes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON ai_archetypes FOR ALL USING (true) WITH CHECK (true);

-- 6. INITIAL DATA
INSERT INTO categories (name, slug, description) VALUES
('Strategy', 'strategy', 'Business and growth strategies'),
('Tech', 'tech', 'Technical breakdowns and innovation'),
('Production', 'production', 'Visual and media production'),
('Case Study', 'case-study', 'In-depth analysis of past projects')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO ai_archetypes (name, slug, system_prompt, description, tags) VALUES
('Technical Breakdown', 'technical', 'You are a technical specialist. Focus on code, architecture, and efficiency.', 'Detailed technical analysis', ARRAY['code', 'architecture']),
('Visual Launch', 'launch', 'You are a visual media expert. Focus on design, impact, and storytelling.', 'Impactful visual announcements', ARRAY['design', 'media']),
('Business Strategy', 'strategy', 'You are a business consultant. Focus on ROI, growth, and market positioning.', 'High-level business insights', ARRAY['business', 'growth']),
('Case Study', 'case-study', 'You are an analytical researcher. Focus on data, results, and lessons learned.', 'Evidence-based project reviews', ARRAY['data', 'results'])
ON CONFLICT (slug) DO NOTHING;
