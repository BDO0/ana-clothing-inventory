# Local Database (IndexedDB)

## Library
Use Dexie.js

## Tables

### products
- id
- name
- category_id
- description
- created_at

### variants
- id
- product_id
- size
- color
- sku
- barcode

### inventory_events
- event model

### sync_queue
Tracks unsynced operations:

{
  id,
  type,
  payload,
  status: PENDING | SYNCED | FAILED,
  retries,
  created_at
}

## Rule
All writes go to IndexedDB first.
UI reads ONLY from IndexedDB.