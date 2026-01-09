
-- 1. SMART DEDUPLICATION (The "Highlander" Logic)
-- Keeps the version of the post with the longest content. Deletes duplicates/stubs.
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY slug 
           ORDER BY length(content) DESC, created_at DESC
         ) as rank
  FROM posts
)
DELETE FROM posts
WHERE id IN (SELECT id FROM duplicates WHERE rank > 1);

-- 2. PURGE LOW QUALITY STUBS
-- Deletes any remaining unique posts that are still too short (under 50 chars)
DELETE FROM posts WHERE length(content) < 50;

-- 3. FIX MISSING COLUMNS
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text default 'OTP Admin';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_desc text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views int8 default 0;

-- 4. PERMISSIONS & STORAGE
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'uploads' );
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'uploads' );

-- 5. ENSURE CONTENT EXISTS (Idempotent Insert)
INSERT INTO posts (title, slug, excerpt, content, published, category, image_url, views) VALUES
(
  'The Architecture of a Visual Drop',
  'architecture-visual-drop',
  'Why pacing and cinematic color are the most underrated tools in your rollout strategy.',
  '<p class="lead">In the age of infinite scroll, "good" visuals aren''t enough. You need visuals that stop time.</p><div class="feature-grid"><div class="feature-card"><strong>The 3-Second Rule is Dead</strong><p>It''s about the first frame. If the very first pixel doesn''t communicate the vibe, you''ve lost them.</p></div><div class="feature-card"><strong>Pacing as a Weapon</strong><p>Most editors cut too fast. They think speed equals energy. But <em>tension</em> equals energy.</p></div></div><blockquote>"Silence is the loudest sound in the room if you frame it right."</blockquote>',
  true, 'Creative Strategy', 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4', 842
),
(
  'Beyond the Edit: Brand Identity',
  'beyond-the-edit',
  'How we build consistency across 9:16 and 16:9 formats without losing the soul of the project.',
  '<p class="lead">A video is not just a file; it''s a piece of a larger puzzle. When we approach a campaign, we don''t just edit for the screen; we edit for the ecosystem.</p><h2>The 9:16 vs 16:9 Paradox</h2><p>Vertical demands intimacy. Horizontal content demands scope. You cannot simply crop one to fit the other.</p><blockquote>"Format is temporary. Story is permanent."</blockquote>',
  true, 'Brand Identity', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f', 621
),
(
  'Turning Vision into Strategy',
  'turning-vision-into-strategy',
  'A look into the Phase 01 process of OTP.',
  '<p class="lead">You can have the best camera in the world, but if you don''t know what you''re shooting, it''s noise.</p>',
  true, 'Process', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f', 530
),
(
  'Spooky: Luh Ooky',
  'spooky-luh-ooky',
  'Visuals from the Morbid Musik project.',
  '<p class="lead">Fresh off the release of his latest project.</p>',
  true, 'Music Video', 'https://img.youtube.com/vi/7Zx5fRPmrCU/maxresdefault.jpg', 1240
)
ON CONFLICT (slug) DO UPDATE 
SET content = EXCLUDED.content 
WHERE length(posts.content) < length(EXCLUDED.content);

-- 6. REFRESH CACHE
NOTIFY pgrst, 'reload schema';
