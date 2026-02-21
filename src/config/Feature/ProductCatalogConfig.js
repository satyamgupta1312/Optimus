/**
 * Product Catalog Configuration — Source of Truth
 *
 * Defines the Google Sheet CSV source for product data lookup.
 * Used by the `useCatalog` hook to fetch and cache product details
 * that are shown when item codes are entered in any widget editor.
 *
 * Wiki Reference: wiki/DATA-Product-Catalog.md
 *
 * Sheet columns: id | item code | Display Name | Brand | main_image | MRP | Price
 */

// ── Google Sheet CSV Endpoint ──
export const CATALOG_CSV_URL =
    'https://docs.google.com/spreadsheets/d/1h_y6sQ075NMeEWRxBCrF5H6ZHQLv5q1yy_6qrs-hBcw/export?format=csv&gid=0';

// ── CSV Column Indices (0-based) ──
export const CATALOG_COLUMNS = {
    id: 0,   // Internal DB id
    itemCode: 1,   // "item code" — used as lookup key
    displayName: 2,   // "Display Name"
    brand: 3,   // "Brand"
    imageUrl: 4,   // "main_image"
    mrp: 5,   // "MRP"
    price: 6,   // "Price" (selling price)
};

// ── Cache Settings ──
export const CATALOG_CACHE = {
    // sessionStorage key
    storageKey: 'optimus_product_catalog_v1',
    // How long cache is fresh (ms) — 30 minutes
    ttlMs: 30 * 60 * 1000,
};

// ── UI Display Settings ──
export const CATALOG_UI = {
    // Max products to show full cards for (rest shown as code-only chips)
    maxFullCards: 30,
    // Placeholder image if imageUrl is empty
    fallbackImage: null,
    // Currency symbol
    currency: '₹',
};

/**
 * CATALOG_CONSUMERS — Registry of all components that use the catalog.
 * This is documentation only (not runtime config).
 *
 * | Component                                | Field            | Purpose                          |
 * |------------------------------------------|------------------|----------------------------------|
 * | ProductListInput.jsx                     | codes[]          | Sidebar cards w/ image+price     |
 * | Widgets/SPR/SingleProductRow.jsx         | widget.products  | Emulator SPR/DPR product rail    |
 * | Widgets/BannerWithProductListing.jsx     | widget.products  | PLP navigation on banner click   |
 *
 * To add a new consumer, import useCatalog and call getProduct(code) for each item code.
 * See wiki/DATA-Catalog-Integration.md for the integration guide.
 */
export const CATALOG_CONSUMERS = [
    {
        component: 'ProductListInput',
        field: 'codes[]',
        purpose: 'Sidebar cards with image, name, brand, price',
    },
    {
        component: 'Widgets/SPR/SingleProductRow',
        field: 'widget.products',
        purpose: 'Emulator SPR/DPR product rail',
    },
    {
        component: 'Widgets/BannerWithProductListing',
        field: 'widget.products',
        purpose: 'PLP navigation on banner click',
    },
];
