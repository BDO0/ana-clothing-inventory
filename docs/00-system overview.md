# Clothing Inventory System — Overview

## Purpose
This system is a local-first inventory management platform for clothing businesses.

It replaces manual Excel/notebook tracking with:
- event-based inventory tracking
- offline-first operation
- cloud sync backup (Supabase)

## Core Philosophy
- Events are the source of truth
- Stock is always computed, never stored
- Offline-first is mandatory
- Cloud is secondary backup

## Key Features
- Product and variant management
- Inventory event tracking
- Sales recording
- Stock computation engine
- Offline IndexedDB storage
- Sync engine to Supabase
- Reporting dashboard

## Critical Rule
NEVER store stock values directly.
Only store inventory events.