import { useState, useEffect, useCallback } from 'react';
import { LocalApiService } from '../services/LocalApiService';
import { CATALOG_CACHE } from '../config/Feature/ProductCatalogConfig';

/**
 * useCatalog — lazy batch-fetching product catalog hook.
 *
 * Instead of downloading all 55k products upfront, this hook:
 * 1. Returns getProduct(code) — sync lookup from a shared Map
 * 2. Queues unknown codes for a debounced batch fetch (GET /kinetic/catalog/batch)
 * 3. After fetch completes, triggers re-render so getProduct returns the product
 *
 * Product shape:
 *   { id, itemCode, displayName, brand, imageUrl, mrp, price }
 *
 * Cache: sessionStorage stores previously fetched products (TTL 30 min).
 */

/** Map a server row to the product shape used by all consumers.
 *  Backend returns camelCase: { id, itemCode, name, brand, image, mrp, price } */
function mapRow(row) {
    return {
        id: String(row.id ?? ''),
        itemCode: String(row.itemCode ?? row.item_code ?? ''),
        displayName: row.name ?? row.display_name ?? '',
        brand: row.brand ?? '',
        imageUrl: row.image ?? row.product_image ?? '',
        mrp: parseFloat(row.mrp) || 0,
        price: parseFloat(row.price ?? row.selling_price) || 0,
    };
}

// ── Module-level shared state (singleton across all hook instances) ──

const _products = new Map();   // code → Product | null (null = "not found")
const _pending = new Set();    // codes queued for next batch fetch
const _subscribers = new Set(); // setState functions to trigger re-renders
let _fetchTimer = null;
let _loading = false;

// Load from sessionStorage on module init
try {
    const raw = sessionStorage.getItem(CATALOG_CACHE.storageKey);
    if (raw) {
        const { timestamp, data } = JSON.parse(raw);
        if (Date.now() - timestamp < CATALOG_CACHE.ttlMs) {
            for (const [k, v] of data) _products.set(k, v);
        }
    }
} catch { /* ignore */ }

function _saveToCache() {
    try {
        const entries = [..._products.entries()].filter(([, v]) => v !== null);
        sessionStorage.setItem(CATALOG_CACHE.storageKey, JSON.stringify({
            timestamp: Date.now(),
            data: entries,
        }));
    } catch { /* sessionStorage full — ignore */ }
}

function _notify() {
    for (const fn of _subscribers) fn(t => t + 1);
}

async function _flushPending() {
    if (_pending.size === 0) return;

    const codes = [..._pending];
    _pending.clear();

    // Filter to codes not already resolved
    const needed = codes.filter(c => !_products.has(c));
    if (needed.length === 0) return;

    _loading = true;
    _notify();

    try {
        const res = await LocalApiService.getCatalogBatch(needed);
        const products = res.products || {};

        for (const [code, row] of Object.entries(products)) {
            _products.set(String(code), mapRow(row));
        }

        // Mark unfound codes as null so we don't re-fetch them
        for (const code of needed) {
            if (!_products.has(code)) _products.set(code, null);
        }

        _saveToCache();
    } catch (err) {
        console.error('[useCatalog] batch fetch failed:', err);
    }

    _loading = false;
    _notify();
}

function _requestCodes(codes) {
    let hasNew = false;
    for (const c of codes) {
        if (!_products.has(c) && !_pending.has(c)) {
            _pending.add(c);
            hasNew = true;
        }
    }
    if (hasNew) {
        clearTimeout(_fetchTimer);
        _fetchTimer = setTimeout(_flushPending, 30); // batch within ~1 frame
    }
}

/**
 * Imperatively pre-fetch product codes into the shared cache.
 * Call this when you know which codes will be needed (e.g. after loading a widget).
 */
export function prefetchProducts(codes) {
    _requestCodes(codes.map(String));
}

export function useCatalog() {
    const [, setTick] = useState(0);

    useEffect(() => {
        _subscribers.add(setTick);
        return () => _subscribers.delete(setTick);
    }, []);

    const getProduct = useCallback((code) => {
        const c = String(code);
        const existing = _products.get(c);
        if (existing !== undefined) return existing; // Product or null (not found)
        // Not yet requested — queue batch fetch
        _requestCodes([c]);
        return null;
    }, []);

    return {
        catalog: _products,
        loading: _loading || _pending.size > 0,
        error: null,
        getProduct,
    };
}
