-- FIX MISSING COLUMNS & FORCE REFRESH
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author text default 'OTP Admin';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS seo_desc text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views int8 default 0;

-- OPEN ACCESS FOR ADMIN TOOL
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow All" ON posts;
CREATE POLICY "Allow All" ON posts FOR ALL USING (true) WITH CHECK (true);

-- STORAGE POLICIES (Idempotent)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'uploads' );
CREATE POLICY "Public Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'uploads' );

-- ATOMIC INCREMENT FUNCTION (Prevents Race Conditions)
CREATE OR REPLACE FUNCTION increment_view_count(post_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE posts
  SET views = views + 1
  WHERE slug = post_slug;
END;
$$;

-- INSERT SPOOKY LUH OOKY (Idempotent)
INSERT INTO posts (title, slug, excerpt, content, published, category, image_url, views)
VALUES (
  'Spooky: Luh Ooky',
  'spooky-luh-ooky',
  'Visuals from the Morbid Musik project. Showcasing the best of RI underground talent.',
  '<p class="lead">Fresh off the release of his latest project <strong>Morbid Musik</strong>, RIs own <strong>Spooky</strong> delivers the visual for "Luh Ooky".</p><div class="media-container"><iframe src="https://www.youtube.com/embed/7Zx5fRPmrCU" frameborder="0" allowfullscreen></iframe></div><h2>The Morbid Aesthetic</h2><p>The <em>Morbid Musik</em> era is defined by its refusal to compromise. High contrast and kinetic pacing.</p><blockquote>"It is not just about the music. It is about the movement."</blockquote>',
  true,
  'Music Video',
  'https://img.youtube.com/vi/7Zx5fRPmrCU/maxresdefault.jpg',
  1240
) ON CONFLICT (slug) DO NOTHING;

-- FORCE REFRESH TRICK
COMMENT ON TABLE posts IS 'OTP Posts Table (Refreshed)';
NOTIFY pgrst, 'reload schema';