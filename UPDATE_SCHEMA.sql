-- 1. PURGE FAKE '441' DATA FROM ALL POSTS
UPDATE posts SET views = 0 WHERE views = 441;

-- 2. RESET 'ELI3GANT' POST SPECIFICALLY (Clean Slate)
UPDATE posts 
SET views = 0 
WHERE slug = 'whats-so-elegant-about-eli3gant' OR title ILIKE '%eli3gant%';

-- 3. ENSURE TRACKING FUNCTION EXISTS
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

-- 4. REFRESH CACHE
NOTIFY pgrst, 'reload schema';