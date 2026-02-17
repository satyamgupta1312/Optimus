/**
 * Slug Patterns Configuration — Source of Truth
 *
 * Central registry of all slug suffix patterns, sanitization rules,
 * and timestamp formats used across every widget type.
 *
 * Wiki Reference: wiki/SLUG_NAME.md
 *
 * Usage:
 * - SlugBuilder component uses this for validation and auto-resolution
 * - Deploy strategies reference suffix patterns from here
 * - Backend sync services use this for slug generation
 */

// ── Slug Sanitization ──
// Matches sanitizeSlug() used in all backend scripts
export const SLUG_RULES = {
    pattern: /^[a-z0-9_]+$/,
    maxBaseLength: 50,
    replacementChar: '_',
    /**
     * Sanitize a raw text string into a valid slug.
     * @param {string} text - Raw input text
     * @returns {string} Sanitized slug
     */
    sanitize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .substring(0, this.maxBaseLength);
    },
};

// ── Timestamp Format ──
// YYMMDD_HHmmss — used for uniqueness when slugs may collide
export const TIMESTAMP_FORMAT = {
    pattern: 'YYMMDD_HHmmss',
    example: '260215_143022',
    /**
     * Generate a timestamp string for slug uniqueness.
     * @param {Date} [date] - Optional date (defaults to now)
     * @returns {string} Formatted timestamp
     */
    generate(date = new Date()) {
        const yy = String(date.getFullYear()).slice(-2);
        const MM = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const HH = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${yy}${MM}${dd}_${HH}${mm}${ss}`;
    },
};

// ── Widget Slug Suffix Patterns ──
// Every backend object created by a widget uses a suffix appended to the {base} slug.
// {base} is produced by SlugBuilder (8-part composition).
// {ts} = timestamp, {n} = item index, {m} = sub-category index, {state} = state key

export const SLUG_SUFFIXES = {
    // ── Collection Banner — Scroll Mode (Carousel) ──
    carousel: {
        subCategoryItem: '_sub_cat_wi',
        subCategoryStateItem: '_sub_cat_wi_{state}',
        plpWidget: '_plp_w',
        pageLayout: '_Page_p',
        carouselItem: '_cl_wi',
        carouselWidget: '_Cl_w_HP',
    },

    // ── Collection Banner — Stick Mode (Category Grid) ──
    categoryGrid: {
        subCategoryItem: '_item_{n}_subcat_{m}_{state}',
        plpWidget: '_item_{n}_plp',
        pageLayout: '_item_{n}_page',
        categoryItem: '_item_{n}_cat_wi',
        categoryWidget: '_cm_hp',
    },

    // ── Primary Masthead ──
    primaryMasthead: {
        widget: '_pm_hp',
        multimedia: '_bg',
        fallback: 'primary_masthead_{ts}',
    },

    // ── Secondary Masthead ──
    secondaryMasthead: {
        carouselItem: '_item_{n}_carousel',
        widget: '_sm_hp',
        multimedia: '_bg',
        pageLayout: '_item_{n}_page',
        plpWidget: '_item_{n}_plp',
        subCategoryItem: '_item_{n}_subcat_{m}_{state}',
        fallback: 'secondary_masthead_{ts}',
    },

    // ── Product Rail — Standard ──
    productRailStandard: {
        pageLayout: '_page',
        widgetItem: '_wi',
        widget: '_spr',
    },

    // ── Product Rail — Optimized ──
    productRailOptimized: {
        subCategoryItem: '_sc_wi',
        subCategoryStateItem: '_sc_wi_{state}',
        plpWidget: '_plp_w',
        pageLayout: '_page',
        rowItem: '_pr_wi',
        widget: '_spr_opt',
    },
};

// ── Widget Type Short Codes ──
// Used by SlugBuilder Part 3 (auto-populated badge).
// Config-driven widgets resolve via WidgetRegistry.resolveVariant() → this map.
export const WIDGET_TYPE_SHORT_CODES = {
    single_product_row: 'spr',
    single_product_row_v2: 'spr',
    double_product_row: 'dpr',
    double_product_row_v2: 'dpr',
    multimedia_single_product_row: 'mspr',
    multimedia_single_product_row_v2: 'mspr',
    multimedia_double_product_row: 'mdpr',
    masthead_primary: 'pm',
    masthead_secondary_category_hp: 'sm',
    category: 'cg',
    product_listing: 'plp',
    carousel: 'cl',
    banner_with_product_listing: 'bplp',
    collection_banner: 'cb',
};

// ── Widget Item Type Short Codes ──
// Used by SlugBuilder Part 4.
export const WIDGET_ITEM_TYPE_SHORT_CODES = {
    sub_category: 'sc',
    carousel: 'cl',
    item_rows: 'ir',
    category: 'cat',
};

// ── Backend Widget Type Values ──
// All valid widget_type strings accepted by the backend API
export const WIDGET_TYPES = {
    // Mastheads
    masthead_primary: 'masthead_primary',
    masthead_secondary: 'masthead_secondary_category_hp',

    // Product Rows
    single_product_row: 'single_product_row',
    single_product_row_v2: 'single_product_row_v2',
    double_product_row: 'double_product_row',
    double_product_row_v2: 'double_product_row_v2',
    multimedia_single_product_row: 'multimedia_single_product_row',
    multimedia_single_product_row_v2: 'multimedia_single_product_row_v2',
    multimedia_double_product_row: 'multimedia_double_product_row',
    multimedia_double_product_row_v2: 'multimedia_double_product_row_v2',

    // Listings & Categories
    product_listing: 'product_listing',
    category: 'category',
    carousel: 'carousel',
};

// ── Widget Item Type Values ──
// All valid item_type strings accepted by the backend API
export const WIDGET_ITEM_TYPES = {
    item_rows: 'item_rows',
    sub_category: 'sub_category',
    carousel: 'carousel',
    category: 'category',
};

// ── Page Type Values ──
// All valid page_type strings for Page Layout
export const PAGE_TYPES = {
    product_listing_page: 'product_listing_page',
    category_page: 'category_page',
};

// ── Multimedia Type Values ──
export const MULTIMEDIA_TYPES = {
    lottie: '1',
    video: '2',
    image: '3',
};

// ── Quick Reference: All Suffixes ──
// Flat lookup for any suffix → { object, widget }
export const SUFFIX_REFERENCE = [
    { suffix: '_sub_cat_wi', object: 'Sub-Category Widget Item', widget: 'Carousel' },
    { suffix: '_sub_cat_wi_{state}', object: 'Sub-Category Widget Item (state)', widget: 'Carousel' },
    { suffix: '_sc_wi', object: 'Sub-Category Widget Item', widget: 'Product Rail (Optimized)' },
    { suffix: '_sc_wi_{state}', object: 'Sub-Category Widget Item (state)', widget: 'Product Rail (Optimized)' },
    { suffix: '_plp_w', object: 'PLP Widget', widget: 'Carousel / Product Rail (Optimized)' },
    { suffix: '_Page_p', object: 'Page Layout', widget: 'Carousel' },
    { suffix: '_page', object: 'Page Layout', widget: 'Product Rail / Category Grid' },
    { suffix: '_cl_wi', object: 'Carousel Widget Item', widget: 'Carousel' },
    { suffix: '_Cl_w_HP', object: 'Carousel Widget', widget: 'Carousel' },
    { suffix: '_pm_hp', object: 'Primary Masthead Widget', widget: 'Primary Masthead' },
    { suffix: '_sm_hp', object: 'Secondary Masthead Widget', widget: 'Secondary Masthead' },
    { suffix: '_bg', object: 'Multimedia', widget: 'Mastheads' },
    { suffix: '_wi', object: 'Row Widget Item', widget: 'Product Rail (Standard)' },
    { suffix: '_pr_wi', object: 'Row Widget Item', widget: 'Product Rail (Optimized)' },
    { suffix: '_spr', object: 'SPR Widget', widget: 'Product Rail (Standard)' },
    { suffix: '_spr_opt', object: 'SPR Optimized Widget', widget: 'Product Rail (Optimized)' },
    { suffix: '_cat_wi', object: 'Category Widget Item', widget: 'Category Grid' },
    { suffix: '_cm_hp', object: 'Category Widget', widget: 'Category Grid' },
    { suffix: '_item_{n}_carousel', object: 'Carousel Item', widget: 'Secondary Masthead' },
    { suffix: '_item_{n}_page', object: 'Page Layout', widget: 'Secondary Masthead / Category Grid' },
    { suffix: '_item_{n}_plp', object: 'PLP Widget', widget: 'Secondary Masthead / Category Grid' },
    { suffix: '_item_{n}_subcat_{m}_{state}', object: 'Sub-Category Item', widget: 'Secondary Masthead / Category Grid' },
    { suffix: '_item_{n}_cat_wi', object: 'Category Item', widget: 'Category Grid' },
];
