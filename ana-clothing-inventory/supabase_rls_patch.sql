-- ============================================================
-- ANA Clothing Inventory — CRITICAL Security Patch
-- RLS Policy Fix (Critical Finding #1 & #2)
--
-- HOW TO RUN:
--   1. Go to https://supabase.com/dashboard
--   2. Open your project → SQL Editor
--   3. Paste this entire file and click RUN
--
-- WHAT THIS DOES:
--   Replaces the open "anon can do anything" policies with
--   policies that REQUIRE a valid authenticated user session.
--   This makes the login screen a real security gate.
-- ============================================================

-- ============================================================
-- STEP 1: Drop all existing open anon policies
-- ============================================================

DROP POLICY IF EXISTS "Allow anon read access on products"    ON public.products;
DROP POLICY IF EXISTS "Allow anon insert access on products"  ON public.products;
DROP POLICY IF EXISTS "Allow anon update access on products"  ON public.products;
DROP POLICY IF EXISTS "Allow anon delete access on products"  ON public.products;

DROP POLICY IF EXISTS "Allow anon read access on variants"    ON public.variants;
DROP POLICY IF EXISTS "Allow anon insert access on variants"  ON public.variants;
DROP POLICY IF EXISTS "Allow anon update access on variants"  ON public.variants;
DROP POLICY IF EXISTS "Allow anon delete access on variants"  ON public.variants;

DROP POLICY IF EXISTS "Allow anon read access on inventory_events"   ON public.inventory_events;
DROP POLICY IF EXISTS "Allow anon insert access on inventory_events" ON public.inventory_events;
DROP POLICY IF EXISTS "Allow anon update access on inventory_events" ON public.inventory_events;
DROP POLICY IF EXISTS "Allow anon delete access on inventory_events" ON public.inventory_events;

-- ============================================================
-- STEP 2: Create authenticated-only policies
-- auth.role() = 'authenticated' means the request MUST carry
-- a valid JWT issued by Supabase Auth (i.e. a logged-in user).
-- The anon key alone is no longer sufficient.
-- ============================================================

-- Products
CREATE POLICY "Auth read on products"
  ON public.products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth insert on products"
  ON public.products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth update on products"
  ON public.products FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth delete on products"
  ON public.products FOR DELETE
  USING (auth.role() = 'authenticated');

-- Variants
CREATE POLICY "Auth read on variants"
  ON public.variants FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth insert on variants"
  ON public.variants FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth update on variants"
  ON public.variants FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth delete on variants"
  ON public.variants FOR DELETE
  USING (auth.role() = 'authenticated');

-- Inventory Events
CREATE POLICY "Auth read on inventory_events"
  ON public.inventory_events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Auth insert on inventory_events"
  ON public.inventory_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth update on inventory_events"
  ON public.inventory_events FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Auth delete on inventory_events"
  ON public.inventory_events FOR DELETE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- STEP 3: Add server-side constraint — quantity must be > 0
-- This is a bonus Medium fix that prevents any client
-- (even one calling the API directly) from inserting 0
-- or negative quantities into the events ledger.
-- (Only run if you haven't added this constraint before)
-- ============================================================

ALTER TABLE public.inventory_events
  DROP CONSTRAINT IF EXISTS quantity_positive;

ALTER TABLE public.inventory_events
  ADD CONSTRAINT quantity_positive CHECK (quantity > 0);

-- ============================================================
-- Done. Verify by checking:
--   Authentication > Policies in the Supabase dashboard.
-- All tables should now show only "Auth *" policies.
-- ============================================================
