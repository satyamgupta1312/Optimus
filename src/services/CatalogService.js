import catalogData from '../data/catalog.csv?raw';
import { LocalApiService } from './LocalApiService';

// Helper to parse CSV line correctly handling quotes
const parseCSVLine = (text) => {
    const result = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cell.trim());
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell.trim());
    return result;
};

// Parse the local CSV once (instant fallback for sync searchProduct)
const rows = catalogData.split('\n').slice(1); // Skip header
const items = rows.map(row => {
    if (!row.trim()) return null;
    const cols = parseCSVLine(row);
    // Columns: id(0), item code(1), Display Name(2), Brand(3), main_image(4), MRP(5), Price(6)

    // Clean item code (remove commas inside quotes e.g. "5,005" -> 5005)
    let itemCode = cols[1] ? cols[1].replace(/"/g, '').replace(/,/g, '').trim() : '';

    return {
        itemCode: itemCode,
        name: cols[2] ? cols[2].replace(/"/g, '') : '',
        brand: cols[3],
        image: cols[4],
        mrp: parseFloat((cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
        price: parseFloat((cols[6] || cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
        priceDisplay: "₹" + (cols[6] || cols[5] || '0')
    };
}).filter(Boolean);

// Cache for remotely fetched items
const remoteCache = {};

/** Map a server row to the CatalogService product shape */
function mapRow(row) {
    return {
        itemCode: String(row.item_code ?? row.itemCode ?? ''),
        name: row.display_name ?? row.name ?? '',
        brand: row.brand ?? '',
        image: row.product_image ?? row.image ?? '',
        mrp: parseFloat(row.mrp) || 0,
        price: parseFloat(row.selling_price ?? row.price) || 0,
        priceDisplay: '₹' + (row.selling_price || row.price || row.mrp || '0'),
    };
}

/**
 * Sync search - looks in local CSV + remote cache only (instant)
 */
export const searchProduct = (code) => {
    const cleanCode = code.toString().trim().replace(/,/g, '');
    // Check local first
    const local = items.find(item => item.itemCode === cleanCode);
    if (local) return local;
    // Check remote cache
    return remoteCache[cleanCode] || null;
};

/**
 * Async search - looks in local CSV first, then fetches from server batch endpoint
 */
export const searchProductAsync = async (code) => {
    const cleanCode = code.toString().trim().replace(/,/g, '');

    // Check local first
    const local = items.find(item => item.itemCode === cleanCode);
    if (local) return local;

    // Check remote cache
    if (remoteCache[cleanCode]) return remoteCache[cleanCode];

    // Fetch from batch endpoint
    try {
        const res = await LocalApiService.getCatalogBatch([cleanCode]);
        const products = res.products || {};
        if (products[cleanCode]) {
            const mapped = mapRow(products[cleanCode]);
            remoteCache[cleanCode] = mapped;
            return mapped;
        }
    } catch (err) {
        console.error('[CatalogService] batch fetch failed:', err);
    }

    return null;
};

/**
 * Batch search - efficiently search multiple codes at once via server batch endpoint.
 * Returns a map of code -> product
 */
export const searchProductsBatch = async (codes) => {
    const cleanCodes = codes.map(c => c.toString().trim().replace(/,/g, ''));
    const results = {};
    const missing = [];

    // Check local + cache first
    for (const code of cleanCodes) {
        const local = items.find(item => item.itemCode === code);
        if (local) {
            results[code] = local;
        } else if (remoteCache[code]) {
            results[code] = remoteCache[code];
        } else {
            missing.push(code);
        }
    }

    // If all found locally, return immediately
    if (missing.length === 0) return results;

    // Fetch missing from batch endpoint
    try {
        const res = await LocalApiService.getCatalogBatch(missing);
        const products = res.products || {};
        for (const code of missing) {
            if (products[code]) {
                const mapped = mapRow(products[code]);
                remoteCache[code] = mapped;
                results[code] = mapped;
            }
        }
    } catch (err) {
        console.error('[CatalogService] batch fetch failed:', err);
    }

    return results;
};
