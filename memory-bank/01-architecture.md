# System Architecture

## Layer Diagram

```
┌─────────────────────────────────────────────┐
│  UI Layer (React 19 + Tailwind CSS + Radix)  │
│  Pages: Dashboard, Products, StockIn, Sales, │
│         History, Reports, Analytics           │
│  Layout: AppShell, Sidebar, Topbar            │
│  Components: shadcn/ui + custom components    │
├─────────────────────────────────────────────┤
│  Engine Layer (Business Logic)               │
│  • stock-engine.ts — stock computation        │
│  • inventory-service.ts — event recording     │
│  • product-service.ts — product/variant CRUD  │
│  • analytics-engine.ts — metrics derivation   │
│  • report-engine.ts — structured reports      │
│  • queries.ts — read helpers                  │
│  • analytics-queries.ts — event filters       │
├─────────────────────────────────────────────┤
│  Local Database (IndexedDB via Dexie.js)     │
│  Tables: products, variants,                  │
│          inventory_events, sync_queue         │
│  models.ts — TypeScript interfaces            │
│  validators.ts — event validation             │
├─────────────────────────────────────────────┤
│  Sync Engine                                 │
│  • sync-engine.ts — orchestrator (singleton)  │
│  • supabase-client.ts — fetch-based REST API  │
│  • sync-queue.ts — queue CRUD helpers         │
│  • dto.ts — event → Supabase DTO transform    │
│  • sync-recovery.ts — retry & reconcile       │
│  • sync-monitor.ts — observability            │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Cloud Layer (Supabase)                      │
│  Table: inventory_events (raw events only)    │
│  NO computed stock, NO aggregation tables     │
└─────────────────────────────────────────────┘
```

## Data Flow

```
User Action
  → UI calls engine layer (inventory-service, product-service)
    → Engine validates + calls appendEvent() in database.ts
      → Validator checks event (assertValidEvent)
        → IndexedDB write (inventory_events table)
          → If Supabase configured: sync_queue entry (PENDING)
            → SyncEngine.processQueue() picks up pending items
              → toDTOBatch() transforms events
                → SupabaseClient.postEvents() sends to Supabase
                  → On success: markSynced()
                  → On failure: markFailed() with retry logic
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI Framework | React 19 + TypeScript 6 | Component-based SPA |
| Routing | React Router 7 | Client-side routing |
| Styling | Tailwind CSS 4 + Radix UI | Utility-first CSS + accessible primitives |
| Charts | Recharts | Analytics/Reports charts |
| Local DB | Dexie.js 4 | IndexedDB wrapper |
| Cloud DB | Supabase (REST API) | Event backup storage |
| Unit/Int Tests | Vitest 4 | Component + service testing |
| E2E Tests | Playwright | Full browser flows |
| API Mocking | MSW 2 | Mock Supabase responses |
| Fake DB | fake-indexeddb | In-memory IndexedDB for tests |
| UUID | uuid v14 | Event/entity ID generation |

## Source Code Structure

```
ana-clothing-inventory/
├── src/
│   ├── main.tsx                    # App entry: sync init, Supabase config
│   ├── App.tsx                     # Route definitions
│   ├── index.css                   # Tailwind + global styles
│   ├── lib/utils.ts               # clsx/cn utility
│   ├── db/
│   │   ├── models.ts              # TypeScript interfaces (Product, Variant, InventoryEvent, SyncQueueItem)
│   │   ├── database.ts            # Dexie DB class, appendEvent(), product/variant helpers
│   │   └── validators.ts          # Event validation (validateEvent, assertValidEvent)
│   ├── engine/
│   │   ├── stock-engine.ts        # getStock(variant_id) — computes stock from events
│   │   ├── inventory-service.ts   # stockIn(), recordSale() — domain-level event creation
│   │   ├── product-service.ts     # createProduct(), createVariant()
│   │   ├── queries.ts             # Read-only: getAllProducts, getRecentEvents, etc.
│   │   ├── analytics-engine.ts    # getDailySales, getTopProducts, getStockSummary, getEventTrends
│   │   ├── analytics-queries.ts   # filterEventsByDate, filterEventsByProduct, filterEventsByType
│   │   ├── report-engine.ts       # generateInventoryReport, generateSalesReport, generateBusinessOverview
│   │   └── __test__.ts            # Smoke test runner
│   ├── sync/
│   │   ├── sync-engine.ts         # Singleton orchestrator: processQueue(), start(), stop()
│   │   ├── supabase-client.ts     # fetch() wrapper: postEvent, postEvents, getEvents
│   │   ├── sync-queue.ts          # Queue CRUD: getPendingItems, markSynced, markFailed, getQueueStats
│   │   ├── dto.ts                 # toDTO() — InventoryEvent → InventoryEventDTO
│   │   ├── sync-recovery.ts       # retryFailedEvents(), reconcileLocalVsCloud()
│   │   └── sync-monitor.ts        # getSyncMetrics(), recordSync(), getSyncStatusReport()
│   ├── pages/
│   │   ├── Dashboard.tsx          # Stock summary, recent activity
│   │   ├── Products.tsx           # Product list + variant management
│   │   ├── StockIn.tsx            # Add stock event form
│   │   ├── Sales.tsx              # Record sale event form
│   │   ├── History.tsx            # Full event log with filters
│   │   ├── Reports.tsx            # Inventory + sales reports
│   │   └── Analytics.tsx          # Charts, trends, top products
│   ├── ui/
│   │   ├── tokens.ts              # Design tokens
│   │   ├── layout/
│   │   │   ├── AppShell.tsx       # Main layout container
│   │   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   │   └── Topbar.tsx         # Top bar with search/user
│   │   └── components/
│   │       ├── Card.tsx, Badge.tsx, Modal.tsx
│   │       ├── StatCard.tsx, Skeleton.tsx, Timeline.tsx
│   │       └── ErrorBoundary.tsx
│   ├── components/ui/             # shadcn/ui primitives
│   │   └── button.tsx, card.tsx, badge.tsx, input.tsx,
│   │       label.tsx, dialog.tsx, select.tsx, table.tsx, skeleton.tsx
│   └── dev/
│       ├── SmokeTest.tsx          # In-app smoke test UI
│       ├── SystemTest.tsx         # System test UI
│       └── system-test.ts         # System test runner
├── tests/
│   ├── unit/                      # validators, stockCalculator, inventory-service, product-service, queries
│   ├── integration/               # indexedDB, sync-engine, inventory-flow
│   ├── ui/                        # Products, History, StockIn component tests
│   ├── e2e/                       # product-flow, inventory-history, offline-mode
│   ├── mocks/                     # MSW server + Supabase handlers
│   ├── utils/testHelpers.ts       # Test data factories
│   └── setup.ts                   # Test environment setup
├── docs/                          # System documentation (8 files)
└── memory-bank/                   # Project memory bank (this directory)
```

## Architecture Principles

1. **Append-Only Events**: Events are never updated or deleted. Only new events are appended.
2. **Stock Computation**: Stock is derived from event summation: `sum(STOCK_IN) - sum(SALE) + sum(RETURN) - sum(ADJUSTMENT)`
3. **Engine as Middleware**: UI never calls IndexedDB or Supabase directly. All access goes through the engine layer.
4. **DTO Layer**: Events are transformed through `toDTO()` before being sent to Supabase (epoch → ISO 8601).
5. **Singleton SyncEngine**: Single instance manages all sync operations with throttle, backoff, and batch processing.
6. **Optional Cloud**: Sync engine gracefully degrades when Supabase is not configured (local-only mode).