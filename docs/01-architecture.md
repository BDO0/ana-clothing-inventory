# System Architecture

## Layers

1. UI Layer (React PWA)
   - Handles user interaction
   - Never stores real stock

2. Local Database (IndexedDB via Dexie)
   - Source of truth
   - Stores products, variants, events, sync queue

3. Sync Engine
   - Sends events to Supabase
   - Handles retries and failures

4. Cloud Layer (Supabase)
   - Backup storage only
   - Stores events only

## Data Flow

User Action
→ IndexedDB write
→ Sync Queue
→ Sync Engine
→ Supabase

## Important Rule
Cloud is NOT authoritative.
Local database is always primary.