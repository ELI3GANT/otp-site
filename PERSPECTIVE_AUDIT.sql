-- PERSPECTIVE AUDIT SYSTEM UPGRADE
-- Run this in Supabase SQL Editor to enable Lead Capture and Audit storage.

-- 1. Create Leads Table
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    email TEXT NOT NULL,
    answers JSONB,
    advice TEXT,
    status TEXT DEFAULT 'pending',
    type TEXT DEFAULT 'perspective_audit'
);

-- 2. Permissions (Allow public insert for the quiz)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow Public Insert Leads" ON leads;
CREATE POLICY "Allow Public Insert Leads" ON leads FOR INSERT WITH CHECK (true);

-- 3. Allow Admin Read
DROP POLICY IF EXISTS "Allow Admin Read Leads" ON leads;
CREATE POLICY "Allow Admin Read Leads" ON leads FOR SELECT USING (true); -- Simple for now

-- 4. Refresh Schema
NOTIFY pgrst, 'reload schema';
