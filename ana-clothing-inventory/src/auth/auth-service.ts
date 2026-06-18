import { createClient, type Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// Only initialize if environment variables exist
export const supabase = SUPABASE_URL && SUPABASE_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

// Global listener to track session state across the app
let currentSession: Session | null = null;

if (supabase) {
  // Sync initial session on load
  supabase.auth.getSession().then(({ data: { session } }) => {
    currentSession = session;
  });

  // Listen for changes (login, logout, token refresh)
  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
  });
}

/**
 * Get the currently active authentication token.
 * Used by our custom SyncEngine to securely post data to Supabase.
 */
export function getAuthToken(): string | null {
  return currentSession?.access_token || null;
}

export function isAuthEnabled(): boolean {
  return supabase !== null;
}
