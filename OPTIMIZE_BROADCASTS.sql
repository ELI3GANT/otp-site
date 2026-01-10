-- BROADCASTS PERFORMANCE OPTIMIZATION
-- Run this in Supabase SQL Editor to implement indexing for fast dashboard filtering.

CREATE INDEX IF NOT EXISTS idx_broadcasts_status_created 
ON broadcasts (status, created_at DESC);

-- Optional: Index on slug for fast lookups if not already handled by UNIQUE constraint
CREATE INDEX IF NOT EXISTS idx_broadcasts_slug ON broadcasts (slug);
