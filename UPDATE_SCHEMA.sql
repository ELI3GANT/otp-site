-- 1. PURGE TRASH CONTENT (Length check)
-- Deletes any post with content shorter than 50 characters
DELETE FROM posts WHERE length(content) < 50;

-- 2. FIX MISSING COLUMNS
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text default 'OTP Admin';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_desc text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views int8 default 0;

-- 3. PERMISSIONS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

-- 4. INSERT HIGH-QUALITY CONTENT (Idempotent)
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
  'A look into the Phase 01 process of OTP. How alignment in the pre-production phase saves 10 hours of editing.',
  '<p class="lead">You can have the best camera in the world, but if you don''t know <em>what</em> you''re shooting, you''re just capturing noise.</p><div class="stat-box"><span class="stat-number">80%</span><span class="stat-label">of the edit happens in pre-production</span></div><h2>The Moodboard Trap</h2><p>Clients often send us 50 images that look "cool." But cool isn''t a strategy. We filter those down to 3 key pillars: Tone, Texture, and Pacing.</p>',
  true, 'Process', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f', 530
),
(
  'Spooky: Luh Ooky',
  'spooky-luh-ooky',
  'Visuals from the Morbid Musik project. Showcasing the best of RI underground talent.',
  '<p class="lead">Fresh off the release of his latest project <strong>Morbid Musik</strong>, RIs own <strong>Spooky</strong> delivers the visual for "Luh Ooky".</p><div class="media-container"><iframe src="https://www.youtube.com/embed/7Zx5fRPmrCU" frameborder="0" allowfullscreen></iframe></div><h2>The Morbid Aesthetic</h2><p>The <em>Morbid Musik</em> era is defined by its refusal to compromise. High contrast and kinetic pacing.</p><blockquote>"It is not just about the music. It is about the movement."</blockquote>',
  true, 'Music Video', 'https://img.youtube.com/vi/7Zx5fRPmrCU/maxresdefault.jpg', 1240
)
ON CONFLICT (slug) DO NOTHING;

-- 5. REFRESH CACHE
NOTIFY pgrst, 'reload schema';