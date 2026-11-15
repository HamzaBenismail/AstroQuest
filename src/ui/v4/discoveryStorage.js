import { sanitizeDiscoveryIds } from '../../logic/v4/discoveries.js';

export const DISCOVERY_STORAGE_KEY = 'smp.discovery-collection.v1';

export function browserDiscoveryStorage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null; }
  catch { return null; }
}

/** Browser-only; the game also works if storage is unavailable or blocked. */
export function loadDiscoveryIds(storage, catalog) {
  try {
    const raw = storage?.getItem(DISCOVERY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return sanitizeDiscoveryIds(parsed, catalog);
  } catch {
    return [];
  }
}

export function saveDiscoveryIds(storage, ids, catalog) {
  try {
    storage?.setItem(DISCOVERY_STORAGE_KEY, JSON.stringify(sanitizeDiscoveryIds(ids, catalog)));
    return true;
  } catch {
    return false;
  }
}

/** Remove a previously saved collection. Caller also resets reducer state; if storage
 * is blocked, the current session still reflects the user's choice. */
export function clearDiscoveryIds(storage) {
  try {
    storage?.removeItem(DISCOVERY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
