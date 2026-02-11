import catalogData from '../data/catalog.csv?raw';

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

// Parse the local CSV once
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

// Full catalog cache (fetched from Google Sheet)
let fullCatalogItems = null;
let fetchPromise = null;

// Google Sheet published CSV URL (Catalog sheet)
const CATALOG_SHEET_ID = '1h_y6sQ075NMeEWRxBCrF5H6ZHQLv5q1yy_6qrs-hBcw';
const CATALOG_CSV_URL = `https://docs.google.com/spreadsheets/d/${CATALOG_SHEET_ID}/export?format=csv&gid=0`;

/**
 * Fetch the full catalog from Google Sheet (cached)
 */
const fetchFullCatalog = async () => {
    if (fullCatalogItems) return fullCatalogItems;
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
        try {
            console.log('[CatalogService] Fetching full catalog from Google Sheet...');
            const response = await fetch(CATALOG_CSV_URL);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const csvText = await response.text();

            const csvRows = csvText.split('\n').slice(1);
            fullCatalogItems = csvRows.map(row => {
                if (!row.trim()) return null;
                const cols = parseCSVLine(row);
                let itemCode = cols[1] ? cols[1].replace(/"/g, '').replace(/,/g, '').trim() : '';
                if (!itemCode) return null;

                return {
                    itemCode: itemCode,
                    name: cols[2] ? cols[2].replace(/"/g, '') : '',
                    brand: cols[3] || '',
                    image: cols[4] || '',
                    mrp: parseFloat((cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
                    price: parseFloat((cols[6] || cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
                    priceDisplay: "₹" + (cols[6] || cols[5] || '0')
                };
            }).filter(Boolean);

            console.log(`[CatalogService] Loaded ${fullCatalogItems.length} products from Google Sheet`);
            return fullCatalogItems;
        } catch (error) {
            console.error('[CatalogService] Failed to fetch catalog:', error);
            fullCatalogItems = [];
            return [];
        }
    })();

    return fetchPromise;
};

/**
 * Sync search - looks in local CSV only (instant)
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
 * Async search - looks in local CSV first, then fetches from Google Sheet
 */
export const searchProductAsync = async (code) => {
    const cleanCode = code.toString().trim().replace(/,/g, '');

    // Check local first
    const local = items.find(item => item.itemCode === cleanCode);
    if (local) return local;

    // Check remote cache
    if (remoteCache[cleanCode]) return remoteCache[cleanCode];

    // Fetch full catalog and search
    const catalog = await fetchFullCatalog();
    const found = catalog.find(item => item.itemCode === cleanCode);
    if (found) {
        remoteCache[cleanCode] = found;
    }
    return found || null;
};

/**
 * Batch search - efficiently search multiple codes at once
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

    // Fetch full catalog for missing items
    const catalog = await fetchFullCatalog();
    for (const code of missing) {
        const found = catalog.find(item => item.itemCode === code);
        if (found) {
            remoteCache[code] = found;
            results[code] = found;
        }
    }

    return results;
};

// Pre-fetch the catalog on module load (non-blocking)
fetchFullCatalog().catch(() => { });
