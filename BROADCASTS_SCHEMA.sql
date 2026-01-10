-- BROADCASTS TABLE SCHEMA
-- Execute this in Supabase SQL Editor to support the new Broadcasts system.

CREATE TABLE IF NOT EXISTS broadcasts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    title text NOT NULL,
    slug text UNIQUE NOT NULL,
    content text,
    status text DEFAULT 'active', -- 'active', 'ended', 'archived'
    views int8 DEFAULT 0,
    image_url text,
    author text DEFAULT 'OTP Admin'
);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE broadcasts;

-- RLS (Open for now as per project convention)
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON broadcasts FOR ALL USING (true) WITH CHECK (true);
