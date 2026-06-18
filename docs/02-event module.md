# Event Model (Core System)

## Concept
Inventory is event-sourced.

We never update stock directly.

## Entity: InventoryEvent

{
  id: string (UUID)
  variant_id: string
  type: "STOCK_IN" | "SALE" | "RETURN" | "ADJUSTMENT"
  quantity: number
  reference?: string
  note?: string
  created_at: timestamp
  synced: boolean
}

## Rules

- STOCK_IN → increases stock
- SALE → decreases stock
- RETURN → increases stock
- ADJUSTMENT → manual correction

## Critical Rule
Events are immutable.
Never update or delete events.
Only append new events.