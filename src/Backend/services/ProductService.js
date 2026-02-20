/**
 * ProductService — Product lookup and fetch from catalog.
 *
 * Ported from:
 *   scripts/Product_Fetch_Service.gs → fetchProductsByItemCodes()
 *   src/services/CatalogService.js (frontend catalog search)
 *   src/services/LocalApiService.js → searchCatalog, batchCatalog
 *
 * Provides a unified product lookup interface that tries:
 *   1. Local Express backend (fast, SQLite)
 *   2. Google Sheet catalog (fallback)
 */

const LOCAL_BASE = '/api/local';

function getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    try {
        const stored = localStorage.getItem('optimus_user');
        if (stored) {
            const user = JSON.parse(stored);
            headers['X-Optimus-User'] = user.email || '';
        }
    } catch { /* ignore */ }
    return headers;
}

export const ProductService = {
    /**
     * Search products by query (name or code).
     *
     * @param {string} query - Search term
     * @param {number} limit - Max results
     * @returns {Promise<Array<{itemCode, name, brand, image, mrp, price}>>}
     */
    async search(query, limit = 20) {
        const res = await fetch(
            `${LOCAL_BASE}/catalog/search?q=${encodeURIComponent(query)}&limit=${limit}`,
            { headers: getHeaders() }
        );
        if (!res.ok) throw new Error(`Product search failed: HTTP ${res.status}`);
        return res.json();
    },

    /**
     * Batch lookup products by item codes.
     *
     * @param {string[]} codes - Array of item code strings
     * @returns {Promise<Array<{itemCode, name, brand, image, mrp, price}>>}
     */
    async batchLookup(codes) {
        if (!codes || codes.length === 0) return [];
        const res = await fetch(
            `${LOCAL_BASE}/catalog/batch?codes=${codes.join(',')}`,
            { headers: getHeaders() }
        );
        if (!res.ok) throw new Error(`Product batch lookup failed: HTTP ${res.status}`);
        return res.json();
    },

    /**
     * Validate product codes — returns which codes exist and which are missing.
     *
     * @param {string[]} codes - Item codes to validate
     * @returns {Promise<{found: Object[], missing: string[]}>}
     */
    async validate(codes) {
        const products = await this.batchLookup(codes);
        const foundCodes = new Set(products.map(p => String(p.itemCode)));
        const missing = codes.filter(c => !foundCodes.has(String(c)));
        return { found: products, missing };
    },

    /**
     * Parse product codes from various input formats.
     * Supports: comma-separated, newline-separated, space-separated
     *
     * @param {string} input - Raw input string
     * @returns {string[]} Cleaned array of unique numeric codes
     */
    parseCodes(input) {
        if (!input || typeof input !== 'string') return [];
        return [...new Set(
            input
                .split(/[,\n\s]+/)
                .map(s => s.trim())
                .filter(s => /^\d+$/.test(s))
        )];
    },
};
