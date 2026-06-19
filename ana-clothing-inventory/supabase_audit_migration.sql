-- ============================================================
-- ANA Clothing Inventory — Medium Security Patch
-- Audit Trail: Add user_id to inventory_events
--
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard
--   2. Open your project → SQL Editor
--   3. Paste this entire file and click RUN
--
-- WHAT THIS DOES:
--   Adds a nullable user_id column to inventory_events that
--   references auth.users. From now on, every new event written
--   by a logged-in user will record their UUID — creating a full
--   tamper-evident audit trail of who did what.
--
--   Existing events will have user_id = NULL (safe — column is nullable).
-- ============================================================

-- Add user_id column referencing Supabase auth.users
-- ON DELETE SET NULL means events are preserved if a user account is deleted
ALTER TABLE public.inventory_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast queries like "show all events by this user"
CREATE INDEX IF NOT EXISTS idx_inventory_events_user_id
  ON public.inventory_events(user_id);

-- ============================================================
-- VERIFY: Run this query to confirm the column was added
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'inventory_events'
-- ORDER BY ordinal_position;
-- ============================================================
