# Project Brief

## Purpose

ANA Clothing Inventory System is a local-first inventory management platform for clothing businesses. It replaces manual Excel/notebook tracking with an event-sourced, offline-first, cloud-backed system.

## Core Philosophy

1. **Events are the source of truth** — all inventory changes are recorded as immutable events
2. **Stock is always computed, never stored** — stock values are derived from event history
3. **Offline-first is mandatory** — the app must work fully without internet
4. **Cloud is secondary backup** — Supabase stores events for backup/reconciliation, never as the primary source

## Key Features

- Product and variant management (size, color, SKU, barcode)
- Inventory event tracking (STOCK_IN, SALE, RETURN, ADJUSTMENT)
- Sales recording
- Stock computation engine (derived from events)
- Offline IndexedDB storage (Dexie.js)
- Background sync engine to Supabase (fetch-based, no SDK)
- Sync recovery and reconciliation
- Reporting dashboard (daily sales, top products, stock summary)
- Analytics (trends, business overview)
- PWA-ready architecture

## Critical System Rules

1. **Stock is NEVER stored** — only inventory events are persisted
2. **Only events are stored for inventory** — no stock columns, no cache tables
3. **No deletion of events allowed** — events are immutable, only append
4. **All events must have UUID + timestamp** — every event has `id` and `created_at`
5. **Offline-first is mandatory** — app functions fully without internet
6. **Sync is background-only and optional** — cloud sync is non-blocking
7. **Cloud is backup only, not source of truth** — local IndexedDB always wins

## Target Users

Clothing business owners and staff who need reliable inventory tracking that works with or without internet connectivity.