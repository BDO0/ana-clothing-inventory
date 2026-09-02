Project Overview: ANA Clothing Inventory System

The ANA Clothing Inventory System is a modern, local-first, offline-ready Progressive Web Application (PWA) built specifically for retail inventory control, point-of-sale (POS) tracking, stock adjustments, customer returns, and business analytics.

Key Features

1. Local-First & Offline Ready
   - Built using Dexie.js (IndexedDB) so all data operations run locally on the client device.
   - Operations function 100% offline without network latency.

2. Real-Time Supabase Sync
   - Automatically queues and syncs local transactions to a cloud Supabase (PostgreSQL) database whenever internet connectivity is available.
   - Supports live real-time sync across devices via Supabase Realtime subscriptions.

3. Catalog & Variant Management
   - Track clothing items by SKU, barcode, color, size, unit cost, selling price, and real-time inventory count.

4. Point of Sale & Barcode Scanning
   - Quick checkout flow with camera-based barcode scanning using `@zxing/library`.

5. Stock Intake & Adjustments
   - Register new stock arrivals, handle supplier orders, and log manual inventory reconciliations (loss, damage, audit checks).

6. Returns & Audit Ledger
   - Process item returns or customer exchanges.
   - Full transaction audit trail for ledger tracking and event history.

7. Analytics & Exportable Reports
   - Interactive charts powered by Recharts for visualizing sales trends, revenue, profit margins, and stock turnover.

Technology Stack

| Component | Technology |
| :--- | :--- |
| Frontend Framework | React 19 + TypeScript |
| **Build Tool** | Vite |
| Styling & UI | Tailwind CSS v4, Radix UI, Lucide Icons |
| Local Database | Dexie.js (IndexedDB) |
| Cloud Backend & Sync | Supabase (PostgreSQL, Auth, Realtime) |
| Data Visualization | Recharts |
| Barcode Scanner | `@zxing/library` |
| Testing | Vitest (Unit/Integration) & Playwright (E2E) |

Key Project Folders

ANA CLOTHING INVENTORY SYSTEM/
├── docs/                             # System specifications & architectural docs
└── ana-clothing-inventory/
    ├── src/
    │   ├── auth/                     # Supabase authentication services
    │   ├── db/                       # Dexie local database schemas & validation
    │   ├── engine/                   # Business logic (Stock, Sales, Analytics)
    │   ├── sync/                     # Queue-based offline sync engine & Supabase client
    │   ├── pages/                    # App views (Dashboard, Products, Sales, StockIn, etc.)
    │   └── ui/                       # UI components, layout shell & styles
    ├── supabase_schema.sql           # Database tables, RLS policies & SQL scripts
    ├── README.md                     # Updated project documentation
    └── package.json                  # Dependencies & scripts

 How to Run the Project

1. Navigate to the application folder:
   bash
   cd ana-clothing-inventory
   

2. Install dependencies:
   bash
   npm install


3. Configure environment variables:
   Ensure `.env` contains your Supabase credentials (refer to `.env.example`):
   env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   VITE_DISABLE_AUTH=false
   

4. Start the local server:
   bash
   npm run dev
   
   Open `http://localhost:5173` in your browser.
