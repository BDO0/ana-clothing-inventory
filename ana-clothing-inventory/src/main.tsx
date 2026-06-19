import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { syncEngine, SyncEngine } from "./sync/sync-engine";
import { setSupabaseConfigured, cleanStalePendingItems } from "./db/database";
import { startRealtimeSync } from "./sync/realtime";
import { logger } from "./lib/logger";
import "./index.css";
import App from "./App";

// Clean up any stale PENDING items that may have accumulated
// from previous sessions without Supabase configuration.
cleanStalePendingItems().then((deleted) => {
  if (deleted > 0) {
    logger.log(`[App] Cleaned ${deleted} stale pending sync items`);
  }
});

// Check if Supabase credentials are configured (e.g. via env vars or config).
// Without configuration, sync engine will skip processing and we won't
// create sync queue items for new events.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
const hasSupabaseConfig = !!(supabaseUrl && supabaseKey);

if (hasSupabaseConfig) {
  // Configure the sync engine with Supabase credentials
  SyncEngine.getInstance({ supabaseUrl, supabaseKey });
  setSupabaseConfigured(true);
  logger.log("[App] Supabase configured — sync engine active");
  // Start Realtime WebSocket for instant cross-device sync (~0ms delay)
  startRealtimeSync();
} else {
  logger.log(
    "[App] Supabase not configured — running local-only. " +
    "Set VITE_SUPABASE_URL and VITE_SUPABASE_KEY env vars to enable cloud sync."
  );
}

// Start background sync engine — runs silently for the app lifetime.
// Does NOT block rendering; Supabase config is optional (local-only mode).
syncEngine.start();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);