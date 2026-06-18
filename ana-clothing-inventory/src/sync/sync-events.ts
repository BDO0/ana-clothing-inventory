// Sync Events — lightweight event bus for notifying the UI after a remote pull.
// The sync engine dispatches "sync:pulled" after mergeFromCloud() completes.
// React pages subscribe to this event to trigger a data reload.

const SYNC_PULLED_EVENT = "sync:pulled";

/**
 * Dispatch a notification that remote data has been pulled and merged.
 * Called by the sync engine after a successful pullFromCloud().
 */
export function dispatchSyncPulled(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_PULLED_EVENT));
  }
}

/**
 * Subscribe to the sync:pulled event.
 * Returns a cleanup function to remove the listener.
 * Use inside a React useEffect.
 *
 * @example
 * useEffect(() => {
 *   return onSyncPulled(() => loadData());
 * }, []);
 */
export function onSyncPulled(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SYNC_PULLED_EVENT, callback);
  return () => window.removeEventListener(SYNC_PULLED_EVENT, callback);
}
