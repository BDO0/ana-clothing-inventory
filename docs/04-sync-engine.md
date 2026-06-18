# Sync Engine

## Purpose
Sync local events to Supabase.

## Flow

1. Get all PENDING items from sync_queue
2. Send to Supabase
3. If success → mark SYNCED
4. If fail → retry later

## Sync Triggers
- app startup
- internet reconnect
- periodic timer
- manual sync button

## Retry Strategy
- exponential backoff
- max retry limit

## Critical Rule
Sync NEVER modifies original event data.
Only status changes locally.