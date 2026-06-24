-- OTP SCHEMA & REALTIME FIX
-- Fixes two classes of issues found during stats flow audit:
--   1. Core tables had no CREATE TABLE statement in any migration (only ALTER TABLE),
--      so a fresh Supabase project would fail to run any other migration.
--   2. `posts` and `broadcasts` were never added to supabase_realtime, so the
--      Live Traffic Uplink feed in the admin terminal never received real-time events.
--
-- Run this script ONCE in the Supabase SQL Editor (service role / admin).
-- It is fully idempotent — safe to re-run.

-- ============================================================
-- 1. POSTS (primary content / CMS table)
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    title       text        NOT NULL DEFAULT '',
    slug        text        UNIQUE NOT NULL,
    content     text        NOT NULL DEFAULT '',
    excerpt     text,
    author      text        NOT NULL DEFAULT 'OTP Admin',
    seo_title   text,
    seo_desc    text,
    category    text,
    image_url   text,
    views       int8        NOT NULL DEFAULT 0,
    published   boolean     NOT NULL DEFAULT false
);

-- ============================================================
-- 2. BROADCASTS (live transmissions / secondary content)
-- ============================================================
CREATE TABLE IF NOT EXISTS broadcasts (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    title       text        NOT NULL DEFAULT '',
    slug        text        UNIQUE NOT NULL,
    content     text        NOT NULL DEFAULT '',
    image_url   text,
    views       int8        NOT NULL DEFAULT 0,
    tags        text[]      NOT NULL DEFAULT '{}',
    published   boolean     NOT NULL DEFAULT false
);

-- ============================================================
-- 3. CONTACTS (inbound leads from the contact form — PII)
-- ============================================================
CREATE TABLE IF NOT EXISTS contacts (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    name        text        NOT NULL DEFAULT '',
    email       text        NOT NULL DEFAULT '',
    service     text,
    message     text,
    budget      text,
    timeline    text,
    ai_status   text        NOT NULL DEFAULT 'processing',
    draft_reply text,
    ai_analysis jsonb
);

-- ============================================================
-- 4. LEADS (perspective audit engine submissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL DEFAULT now(),
    email       text        NOT NULL DEFAULT '',
    answers     jsonb,
    advice      text,
    status      text        NOT NULL DEFAULT 'pending',
    type        text        NOT NULL DEFAULT 'perspective_audit'
);

-- ============================================================
-- 5. RLS: ensure policies match the hardened security baseline
--    (mirrors SECURE_HARDENING_PRO.sql — safe to re-apply)
-- ============================================================
ALTER TABLE posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;

-- Public can read published posts and broadcasts
DROP POLICY IF EXISTS "Public Select" ON posts;
CREATE POLICY "Public Select" ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Select" ON broadcasts;
CREATE POLICY "Public Select" ON broadcasts FOR SELECT USING (true);

-- Contacts and leads: no anon access (server.js uses service_role only)
-- No SELECT or INSERT policy for 'anon' — intentional.

-- ============================================================
-- 6. SUPABASE REALTIME: enable row-level change events
--    for the tables the admin Live Traffic Uplink subscribes to.
--
--    posts      → subscribed to in the admin Live Traffic Uplink channel (live-traffic-posts)
--    broadcasts → subscribed to in the admin Live Traffic Uplink channel for view-count changes
--
--    NOTE: contacts and leads are NOT added here because:
--      • Their RLS has no anon SELECT policy (SECURE_HARDENING_PRO.sql:14-18),
--        so Supabase Realtime would silently deliver zero row-change events to
--        an anon subscriber anyway.
--      • Adding PII tables to the publication without a row-filter risks
--        leaking data if RLS is misconfigured in future.
-- ============================================================
DO $$
BEGIN
    -- posts
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'posts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE posts;
    END IF;

    -- broadcasts
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'broadcasts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE broadcasts;
    END IF;
END $$;

-- ============================================================
-- 7. REFRESH SCHEMA CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
