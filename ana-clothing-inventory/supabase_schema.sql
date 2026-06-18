-- ANA Clothing Inventory System — Supabase Initialization Schema
-- Run this script in your Supabase SQL Editor to configure the cloud database.

-------------------------------------------------------
-- 1. Create Tables
-------------------------------------------------------

-- Products Table
CREATE TABLE public.products (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    category_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Variants Table
CREATE TABLE public.variants (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT,
    color TEXT,
    sku TEXT UNIQUE,
    barcode TEXT
);

-- Inventory Events Table
-- This is the critical table that SyncEngine writes to.
CREATE TABLE public.inventory_events (
    id UUID PRIMARY KEY,
    variant_id UUID NOT NULL REFERENCES public.variants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('STOCK_IN', 'SALE', 'RETURN', 'ADJUSTMENT')),
    quantity INTEGER NOT NULL,
    reference TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    synced BOOLEAN DEFAULT true
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

-------------------------------------------------------
-- 3. Row Level Security (RLS) Setup
-------------------------------------------------------
-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_events ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: By default, RLS blocks all access. 
-- Since your app doesn't currently implement user authentication, 
-- we will create policies that allow anonymous access for the Sync Engine. 
-- (When you move to production, you should restrict this to authenticated users only).

-- Open Read/Write Policies (For Development / Private Setup)
CREATE POLICY "Allow anon read access on products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access on products" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on products" ON public.products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access on products" ON public.products FOR DELETE USING (true);

CREATE POLICY "Allow anon read access on variants" ON public.variants FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access on variants" ON public.variants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on variants" ON public.variants FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access on variants" ON public.variants FOR DELETE USING (true);

CREATE POLICY "Allow anon read access on inventory_events" ON public.inventory_events FOR SELECT USING (true);
CREATE POLICY "Allow anon insert access on inventory_events" ON public.inventory_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update access on inventory_events" ON public.inventory_events FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access on inventory_events" ON public.inventory_events FOR DELETE USING (true);

-- End of schema
