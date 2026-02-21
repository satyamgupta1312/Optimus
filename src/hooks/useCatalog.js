import { useState, useEffect, useRef } from 'react';
import { CATALOG_CSV_URL, CATALOG_COLUMNS, CATALOG_CACHE } from '../config/Feature/ProductCatalogConfig';

/**
 * useCatalog — fetches and caches the product catalog from Google Sheets CSV.
 *
 * Returns:
 *   catalog   — Map<itemCode (string), Product>
 *   loading   — boolean
 *   error     — string | null
 *   getProduct(code) — returns product or null
 *
 * Product shape:
 *   { id, itemCode, displayName, brand, imageUrl, mrp, price }
 *
 * Cache: sessionStorage with 30-min TTL.
 * On cache hit — returns immediately without network.
 * On miss — fetches CSV, parses, stores in sessionStorage.
 */

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    // Skip header row (row 0)
    const catalog = new Map();

    for (let i = 1; i < lines.length; i++) {
        const cols = splitCSVLine(lines[i]);
        if (cols.length < 5) continue;

        const itemCode = cols[CATALOG_COLUMNS.itemCode]?.trim();
        if (!itemCode) continue;

        catalog.set(itemCode, {
            id: cols[CATALOG_COLUMNS.id]?.trim() ?? '',
            itemCode,
            displayName: cols[CATALOG_COLUMNS.displayName]?.trim() ?? '',
            brand: cols[CATALOG_COLUMNS.brand]?.trim() ?? '',
            imageUrl: cols[CATALOG_COLUMNS.imageUrl]?.trim() ?? '',
            mrp: parseFloat(cols[CATALOG_COLUMNS.mrp]) || 0,
            price: parseFloat(cols[CATALOG_COLUMNS.price]) || 0,
        });
    }

    return catalog;
}

/** Basic CSV line splitter that handles quoted fields */
function splitCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result;
}

function loadFromCache() {
    try {
        const raw = sessionStorage.getItem(CATALOG_CACHE.storageKey);
        if (!raw) return null;
        const { timestamp, data } = JSON.parse(raw);
        if (Date.now() - timestamp > CATALOG_CACHE.ttlMs) return null;
        // Re-build Map from stored array
        return new Map(data);
    } catch {
        return null;
    }
}

function saveToCache(catalog) {
    try {
        sessionStorage.setItem(CATALOG_CACHE.storageKey, JSON.stringify({
            timestamp: Date.now(),
            data: [...catalog.entries()],
        }));
    } catch {
        // sessionStorage full or unavailable — ignore
    }
}

// Module-level singleton so all hook instances share the same fetch
let _sharedCatalog = null;
let _fetchPromise = null;

export function useCatalog() {
    const [catalog, setCatalog] = useState(() => {
        // Try cache on first render
        const cached = loadFromCache();
        if (cached) { _sharedCatalog = cached; return cached; }
        return _sharedCatalog ?? new Map();
    });
    const [loading, setLoading] = useState(!catalog.size);
    const [error, setError] = useState(null);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;

        // Already loaded
        if (_sharedCatalog?.size) {
            setCatalog(_sharedCatalog);
            setLoading(false);
            return;
        }

        // Already fetching — wait for the shared promise
        if (_fetchPromise) {
            _fetchPromise.then((map) => {
                if (mounted.current) {
                    setCatalog(map);
                    setLoading(false);
                }
            }).catch((err) => {
                if (mounted.current) setError(err.message);
                setLoading(false);
            });
            return;
        }

        // Start fetch
        setLoading(true);
        _fetchPromise = fetch(CATALOG_CSV_URL)
            .then((res) => {
                if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
                return res.text();
            })
            .then((text) => {
                const map = parseCSV(text);
                _sharedCatalog = map;
                saveToCache(map);
                return map;
            });

        _fetchPromise
            .then((map) => {
                if (mounted.current) {
                    setCatalog(map);
                    setLoading(false);
                }
            })
            .catch((err) => {
                console.error('[useCatalog]', err);
                if (mounted.current) {
                    setError(err.message);
                    setLoading(false);
                }
            });

        return () => { mounted.current = false; };
    }, []);

    const getProduct = (code) => catalog.get(String(code)) ?? null;

    return { catalog, loading, error, getProduct };
}
