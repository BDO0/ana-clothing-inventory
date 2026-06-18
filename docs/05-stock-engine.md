# Stock Calculation Engine

## Principle
Stock is derived, not stored.

## Formula

stock =
  sum(STOCK_IN)
- sum(SALE)
+ sum(RETURN)
- sum(ADJUSTMENT)

## Function
getStock(variant_id)

Reads all events from IndexedDB.

## Rule
- Never cache as source of truth
- Always recompute or optionally cache derived result