# Supabase Schema — inventory_events

## Table: inventory_events

Supabase stores ONLY raw events. No computed stock, no aggregation, no UI state.

```sql
CREATE TABLE inventory_events (
  id         TEXT PRIMARY KEY,
  variant_id TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('STOCK_IN', 'SALE', 'RETURN', 'ADJUSTMENT')),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  reference  TEXT,
  note       TEXT,
  created_at TEXT NOT NULL,
  synced     BOOLEAN DEFAULT false
);

CREATE INDEX idx_inventory_events_variant ON inventory_events (variant_id);
CREATE INDEX idx_inventory_events_type ON inventory_events (type);
CREATE INDEX idx_inventory_events_created ON inventory_events (created_at);
```

## Row-Level Security

```sql
ALTER TABLE inventory_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert (for offline-first clients)
CREATE POLICY "insert_own_events" ON inventory_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow read for reconciliation
CREATE POLICY "read_own_events" ON inventory_events
  FOR SELECT
  TO anon
  USING (true);
```

## Rules

- ❌ No computed stock column
- ❌ No product aggregation tables
- ❌ No UI tables
- ❌ No updates or deletes (events are immutable)
- ✔ Only raw event log

## DTO Shape (mapped by `src/sync/dto.ts`)

| Column | Type | Source |
|---|---|---|
| id | TEXT | UUID from local event |
| variant_id | TEXT | From InventoryEvent |
| type | TEXT | STOCK_IN / SALE / RETURN / ADJUSTMENT |
| quantity | INTEGER | Positive integer |
| reference | TEXT | Optional |
| note | TEXT | Optional |
| created_at | TEXT | ISO 8601 string (converted by toDTO) |
| synced | BOOLEAN | Always false on insert (tracked locally) |