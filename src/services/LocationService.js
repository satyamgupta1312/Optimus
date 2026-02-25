/**
 * LocationService — Shared async fetcher with in-memory cache.
 *
 * Replaces the old sync getEffectiveStateDefinitions() from StateManagerModal.
 * All enabled locations are fetched from the backend and cached in memory.
 */
import { LocalApiService } from './LocalApiService';
import { STATE_DEFINITIONS } from '../config/widgets/MastheadConfig';

// In-memory cache
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 60_000; // 1 minute

/**
 * Async fetch: returns effective state definitions from backend.
 * Shape: { [key]: { levelTag, levelProperty, slugSuffix, label, type } }
 * Always includes the hardcoded 'global' entry.
 */
export async function fetchEffectiveStateDefinitions() {
  // Return cache if fresh
  if (_cache && Date.now() - _cacheTs < CACHE_TTL) {
    return _cache;
  }

  try {
    const locations = await LocalApiService.getLocations({ enabledOnly: 'true' });
    const result = {
      global: { levelTag: 'global', levelProperty: 'global', slugSuffix: '_global' },
    };
    for (const loc of locations) {
      result[loc.key] = {
        levelTag: loc.levelTag,
        levelProperty: loc.levelProperty,
        slugSuffix: loc.slugSuffix,
        label: loc.label,
        type: loc.type,
      };
    }
    _cache = result;
    _cacheTs = Date.now();
    return result;
  } catch (err) {
    console.warn('[LocationService] Failed to fetch locations, using fallback:', err.message);
    return getEffectiveStateDefinitionsSync();
  }
}

/**
 * Sync fallback: returns cached value or hardcoded defaults.
 * Use when async isn't possible.
 */
export function getEffectiveStateDefinitionsSync() {
  if (_cache) return _cache;
  // Fallback to hardcoded STATE_DEFINITIONS
  return { ...STATE_DEFINITIONS };
}

/**
 * Invalidate the in-memory cache.
 * Call after StateManagerModal saves changes.
 */
export function invalidateLocationCache() {
  _cache = null;
  _cacheTs = 0;
}
