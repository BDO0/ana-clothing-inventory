-- ANA Clothing Inventory System — Supabase Initialization Schema
-- ⚠️  This is the AUTHORITATIVE, PRODUCTION-READY schema.
-- Run this script in your Supabase SQL Editor ONLY when initializing a fresh database.
-- For an existing database, use the individual patch files:
--   • supabase_rls_patch.sql      — RLS policy migration
--   • supabase_audit_migration.sql — user_id audit column

-------------------------------------------------------
-- 1. Create Tables
-------------------------------------------------------

-- Products Table
CREATE TABLE public.products (
    id          UUID        PRIMARY KEY,
    name        TEXT        NOT NULL,
    category_id UUID,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Variants Table
CREATE TABLE public.variants (
    id         UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size       TEXT,
    color      TEXT,
    sku        TEXT UNIQUE,
    barcode    TEXT
);

-- Inventory Events Table
-- Append-only ledger — events are NEVER updated or deleted.
-- The SyncEngine writes to this table.
CREATE TABLE public.inventory_events (
    id         UUID        PRIMARY KEY,
    variant_id UUID        NOT NULL REFERENCES public.variants(id) ON DELETE CASCADE,
    type       TEXT        NOT NULL CHECK (type IN ('STOCK_IN', 'SALE', 'RETURN', 'ADJUSTMENT')),
    quantity   INTEGER     NOT NULL CHECK (quantity > 0),   -- enforced at DB level
    reference  TEXT,
    note       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced     BOOLEAN     NOT NULL DEFAULT true,
    user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL  -- audit trail
);

-------------------------------------------------------
-- 2. Performance Indexes
-------------------------------------------------------
-- Fast lookup for events by variant
CREATE INDEX idx_inventory_events_variant_id ON public.inventory_events(variant_id);
-- Fast chronological sorting for history
CREATE INDEX idx_inventory_events_created_at ON public.inventory_events(created_at);
-- Fast lookup for variants by product
CREATE INDEX idx_variants_product_id ON public.variants(product_id);
-- Fast per-user audit queries
CREATE INDEX idx_inventory_events_user_id ON public.inventory_events(user_id);

-------------------------------------------------------
-- 3. Row Level Security (RLS)
-------------------------------------------------------
-- Enable RLS on all tables — blocks ALL access by default
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;

-- Authenticated-only policies
-- auth.role() = 'authenticated' requires a valid Supabase Auth JWT.
-- The anon key alone is NOT sufficient — the user must be logged in.

-- Products
CREATE POLICY "Auth read on products"   ON public.products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert on products" ON public.products FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update on products" ON public.products FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth delete on products" ON public.products FOR DELETE USING (auth.role() = 'authenticated');

-- Variants
CREATE POLICY "Auth read on variants"   ON public.variants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert on variants" ON public.variants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update on variants" ON public.variants FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth delete on variants" ON public.variants FOR DELETE USING (auth.role() = 'authenticated');

-- Inventory Events
CREATE POLICY "Auth read on inventory_events"   ON public.inventory_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth insert on inventory_events" ON public.inventory_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth update on inventory_events" ON public.inventory_events FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Auth delete on inventory_events" ON public.inventory_events FOR DELETE USING (auth.role() = 'authenticated');

-- End of schema
