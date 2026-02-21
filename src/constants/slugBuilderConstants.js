/**
 * Slug Builder Constants
 *
 * Single source of truth for all dropdown options and mappings
 * used by the SlugBuilder compound component.
 *
 * Final slug format:
 * {header}_{identifier}_{widgetType}_{widgetItemType}_{zone}_{state/city/store}_{user}_{device}
 */

// Part 1: Header section options
export const HEADER_OPTIONS = [
    'monthly_list',
    'kirana',
    'fresh',
    'body_care',
    'categories',
    'deals',
    'electronics',
    'kitchen',
    'stationery',
    'search_page',
];

// Part 3: Config-driven widget_type → short code
export const WIDGET_TYPE_CODES = {
    single_product_row: 'spr',
    single_product_row_v2: 'spr',
    double_product_row: 'dpr',
    double_product_row_v2: 'dpr',
    multimedia_single_product_row: 'mspr',
    multimedia_single_product_row_v2: 'mspr',
    multimedia_double_product_row: 'mdpr',
    masthead_primary: 'pm',
    masthead_secondary: 'sm',
    category_grid: 'cg',
    product_listing: 'plp',
    carousel: 'cl',
    banner_with_product_listing: 'bplp',
    collection_banner: 'cb',
};

// Part 3 fallback: Legacy UI type names → short code
export const LEGACY_WIDGET_TYPE_CODES = {
    'Primary Masthead': 'pm',
    'Secondary Masthead': 'sm',
    'Category Grid': 'cg',
    'Product Listing Page (CLP)': 'plp',
    'Single Product Row Optimize': 'spr',
    'Banner With Product Listing': 'bplp',
};

// Part 4: Widget item type → short code (for reference)
export const WIDGET_ITEM_TYPE_OPTIONS = {
    sub_category: 'sc',
    carousel: 'cl',
    item_rows: 'ir',
    category: 'cat',
};

// Part 4 (Auto): backend widget_type → item type code
// Used by SlugBuilder to auto-derive widgetItemType without user input.
// For optimized SPR/DPR variants, sub_category (sc) is used; otherwise item_rows (ir).
export const WIDGET_ITEM_TYPE_AUTO_MAP = {
    // Product Rail — non-optimized → item_rows
    single_product_row: 'ir',
    double_product_row: 'ir',
    multimedia_single_product_row: 'ir',
    multimedia_double_product_row: 'ir',
    // Product Rail — optimized → sub_category
    single_product_row_v2: 'sc',
    double_product_row_v2: 'sc',
    multimedia_single_product_row_v2: 'sc',
    multimedia_double_product_row_v2: 'sc',
    // Carousel / Collection Banner → carousel items
    carousel: 'cl',
    collection_banner: 'cl',
    banner_with_product_listing: 'cl',
    // Category Grid → category items
    category: 'cat',
    category_grid: 'cat',
    // Mastheads → carousel items
    masthead_primary: 'cl',
    masthead_secondary: 'cl',
    masthead_secondary_category_hp: 'cl',
    // PLP widget → sub_category
    product_listing: 'sc',
};

// Part 5: Zone options
export const ZONE_OPTIONS = [
    'intermediate_zone',
    'all_masthead',
    'category_section',
    'rohp',
    'rocp',
    'cp_masthead',
];

// Part 6: Location hierarchy
export const LOCATION_LEVELS = ['Global', 'State', 'City', 'Store'];

export const LOCATION_DATA = {
    State: ['jh', 'cg', 'wb', 'up', 'patna'],
    City: ['bengaluru', 'ranchi', 'kolkata'],
    Store: ['4', '166'],
};

// Part 7: User targeting options
export const USER_OPTIONS = ['FTU', 'allusers'];

// Part 8: Device options
export const DEVICE_OPTIONS = ['both', 'ios', 'android'];
