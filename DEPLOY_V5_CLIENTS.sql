-- DEPLOY_V5_CLIENTS.sql
-- Schema for Phase 3: Client Portal Integration

-- =================================================================
-- 1. CLIENTS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    passcode text NOT NULL, -- Simple access code
    status text DEFAULT 'active', -- active, archived
    logo_url text,
    notes text
);

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Select" ON clients;
-- Public can select only slug/name to verify existence on login page (or maybe just keep it hidden?)
-- For now, let's allow public read for the login check logic (which might filter client-side or use RPC).
-- Safer: Only allow admin full access. Public (Client) uses a specific RPC to login.
CREATE POLICY "Admin All" ON clients FOR ALL USING (true) WITH CHECK (true);

-- =================================================================
-- 2. CLIENT ASSETS (Private Content)
-- =================================================================
CREATE TABLE IF NOT EXISTS client_assets (
    id SERIAL PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    client_id integer REFERENCES clients(id) ON DELETE CASCADE,
    title text NOT NULL,
    type text NOT NULL, -- 'video', 'link', 'file', 'invoice', 'contract'
    url text,
    content text, -- Description or embedded content
    status text DEFAULT 'new' -- 'new', 'viewed', 'signed'
);

-- RLS
ALTER TABLE client_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin All" ON client_assets FOR ALL USING (true) WITH CHECK (true);
-- Clients will access via RPC or specific policy using a session token (to be implemented)

-- =================================================================
-- 3. REALTIME
-- =================================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'clients') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE clients;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'client_assets') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE client_assets;
    END IF;
END $$;
