-- ==============================================
-- 🚀  HOTFIX: SECURITY & 406 ERROR RESOLUTION
-- ==============================================
-- The `system-global-state` post has `published: false` so it doesn't show up in your CMS feed.
-- However, our recent `SECURITY_HARDENING.sql` strictly blocked all unpublished posts.
-- This caused the public site to throw a '406 Not Acceptable' error when trying to fetch the global system state.
-- RUN THIS IN YOUR SUPABASE SQL EDITOR TO FIX THE ERROR.

DROP POLICY IF EXISTS "Public Read" ON posts;

-- Allows the public to strictly read published posts AND the system-global-state row
CREATE POLICY "Public Read" ON posts 
    FOR SELECT 
    USING (published = true OR slug = 'system-global-state');
