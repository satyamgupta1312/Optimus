import { STATE_DEFINITIONS as STATE_DEFINITIONS_BASE } from '../widgets/MastheadConfig';

/**
 * Widget Mapping Configuration — Source of Truth
 *
 * Defines the 3-layer CSV-based mapping system that wires widgets,
 * widget items, and page layouts together.
 *
 * Wiki Reference: wiki/Feature-Mapping-Widget.md
 *
 * Architecture (3 Layers):
 *   Layer 1: Widget Item → Widget          (items belong to a widget)
 *   Layer 2: Widget → Page Layout          (widget is placed on a page)
 *   Layer 3: Page Layout → Global Registry (page is discoverable globally)
 */


// ── Mapping API Endpoints ──
export const MAPPING_ENDPOINTS = {
    layer1: {
        url: '/api/app/update_widget_widget_item_mapping/',
        method: 'POST',
        contentType: 'multipart/form-data',
        description: 'Widget Item → Widget',
        payloadFields: {
            parentSlugField: 'widget_slug',
            csvField: 'mapping_file',
        },
    },
    layer2: {
        url: '/api/app/update_layout_widget_mapping/',
        method: 'POST',
        contentType: 'multipart/form-data',
        description: 'Widget → Page Layout',
        payloadFields: {
            parentSlugField: 'page_layout_slug',
            csvField: 'mapping_file',
        },
    },
    layer3: {
        url: '/api/app/update_page_page_layout_mapping/',
        method: 'POST',
        contentType: 'multipart/form-data',
        description: 'Page Layout → Global Registry',
        payloadFields: {
            parentSlugField: 'page_layout_slug',
            pageTypeField: 'page_type',
            csvField: 'mapping_file',
        },
    },
};

// ── CSV Formats ──
export const CSV_FORMATS = {
    // Layer 1: Widget Item → Widget
    widgetItemMapping: {
        headers: ['widget_item_slug_name', 'level_tag', 'level_property', 'priority', 'cohort'],
        description: 'Maps widget items (products, banners, categories) to their parent widget',
    },
    // Layer 2: Widget → Page Layout
    layoutWidgetMapping: {
        headers: ['widget_slug_name', 'level_tag', 'level_property', 'priority', 'cohort'],
        description: 'Maps a widget to the page layout it belongs to',
    },
    // Layer 3: Page Layout → Global
    pageLayoutMapping: {
        headers: ['level_tag', 'level_property'],
        description: 'Registers a page layout in the global page registry',
        // Always global,global — making the page accessible from anywhere
        defaultRow: 'global,global',
    },
};

// ── Location Resolution Priority ──
// Backend resolves the best match using this priority (most specific wins)
export const LOCATION_RESOLUTION_PRIORITY = [
    { level: 'store_id', description: 'Most specific — matches exact store', example: '166' },
    { level: 'city', description: 'City-level match', example: 'bengaluru' },
    { level: 'state', description: 'State-level match', example: 'jharkhand' },
    { level: 'global', description: 'Fallback — matches all users', example: 'global' },
];

// ── State Reference ──
// Imported from MastheadConfig (single source of truth) + store-level entry added here.
export const STATE_DEFINITIONS = {
    ...STATE_DEFINITIONS_BASE,
    store_166: { levelTag: 'store_id', levelProperty: '166', slugSuffix: '_store_166', required: false },
    // Dynamic states added via "Add State" button
};

// ── Widget → Mapping Layers Matrix ──
// Which widgets use which mapping layers
export const WIDGET_MAPPING_MATRIX = {
    single_product_row: {
        layer1: [
            { itemType: 'item_rows', targetWidget: 'SPR Widget', mapping: 'global' },
        ],
        layer2: { description: 'PLP → Page Layout' },
        layer3: { description: 'Page → Global' },
        totalCalls: 3,
    },
    single_product_row_v2: {
        layer1: [
            { itemType: 'sub_category', targetWidget: 'PLP Widget', mapping: 'location-wise' },
            { itemType: 'item_rows', targetWidget: 'SPR Widget', mapping: 'global' },
        ],
        layer2: { description: 'PLP → Page Layout' },
        layer3: { description: 'Page → Global' },
        totalCalls: 4,
    },
    carousel: {
        layer1: [
            { itemType: 'sub_category', targetWidget: 'PLP Widget', mapping: 'location-wise' },
            { itemType: 'carousel', targetWidget: 'Carousel Widget', mapping: 'global' },
        ],
        layer2: { description: 'PLP → Page Layout' },
        layer3: { description: 'Page → Global' },
        totalCalls: 4,
    },
    category: {
        // N = number of category items
        layer1: [
            { itemType: 'sub_category', targetWidget: 'PLP Widget (per item)', mapping: 'location-wise', count: 'N' },
            { itemType: 'category', targetWidget: 'Category Grid Widget', mapping: 'global', count: '1' },
        ],
        layer2: { description: 'PLP → Page Layout (per item)', count: 'N' },
        layer3: { description: 'Page → Global (per item)', count: 'N' },
        totalCallsFormula: '3N + 1',
    },
    masthead_secondary_category_hp: {
        // N = number of carousel items
        layer1: [
            { itemType: 'sub_category', targetWidget: 'PLP Widget (per item)', mapping: 'location-wise', count: 'N' },
            { itemType: 'carousel', targetWidget: 'SM Widget', mapping: 'global', count: '1' },
        ],
        layer2: { description: 'PLP → Page Layout (per item)', count: 'N' },
        layer3: { description: 'Page → Global (per item)', count: 'N' },
        totalCallsFormula: '3N + 1',
    },
    masthead_primary: {
        layer1: null,
        layer2: null,
        layer3: null,
        totalCalls: 0,
        note: 'Primary Masthead is the only widget with NO mappings — standalone widget',
    },
};

// ── CSV Generation Utilities ──
export const CSV_UTILS = {
    /**
     * Generate a Layer 1 CSV for widget_item → widget mapping.
     * @param {Array<{slug: string, levelTag: string, levelProperty: string}>} items
     * @returns {string} CSV content
     */
    generateWidgetItemCSV(items) {
        const header = CSV_FORMATS.widgetItemMapping.headers.join(',');
        const rows = items.map((item, idx) =>
            `${item.slug},${item.levelTag},${item.levelProperty},${idx + 1},`
        );
        return [header, ...rows].join('\n');
    },

    /**
     * Generate a Layer 2 CSV for widget → page layout mapping.
     * @param {Array<{slug: string, levelTag: string, levelProperty: string}>} widgets
     * @returns {string} CSV content
     */
    generateLayoutWidgetCSV(widgets) {
        const header = CSV_FORMATS.layoutWidgetMapping.headers.join(',');
        const rows = widgets.map((w, idx) =>
            `${w.slug},${w.levelTag},${w.levelProperty},${idx + 1},`
        );
        return [header, ...rows].join('\n');
    },

    /**
     * Generate a Layer 3 CSV for page → global mapping.
     * Always returns global,global.
     * @returns {string} CSV content
     */
    generatePageLayoutCSV() {
        const header = CSV_FORMATS.pageLayoutMapping.headers.join(',');
        return `${header}\n${CSV_FORMATS.pageLayoutMapping.defaultRow}`;
    },

    /**
     * Create a Blob from CSV string for FormData upload.
     * @param {string} csvContent
     * @param {string} [filename='mapping.csv']
     * @returns {Blob}
     */
    csvToBlob(csvContent, filename = 'mapping.csv') {
        return new Blob([csvContent], { type: 'text/csv' });
    },
};

// ── Homepage Mapping ──
// Special case: GL-HP-global uses Layer 2 to place widgets on the homepage
export const HOMEPAGE_MAPPING = {
    slug: 'GL-HP-global',
    viewEndpoint: '/api/app/get_paginated_page_widget_mappings/',
    queryParams: {
        slug_name: 'GL-HP-global',
        status: 'active',
        limit: 50,
        page_no: 1,
    },
    responseFields: {
        widgetId: 'widget_id',
        widgetSlug: 'widget__slug_name',
        priority: 'priority',
        levelTag: 'level_tag',
        levelProperty: 'level_property',
        startTime: 'widget__start_time',
        endTime: 'widget__end_time',
        updatedAt: 'updated_at',
        deactivated: 'widget__deactivated_flag',
    },
};

// ── Mapping Examples (Pre-built CSV Templates) ──
export const MAPPING_EXAMPLES = {
    // SPR Standard — single item, global
    sprStandard: {
        layer1: 'widget_item_slug_name,level_tag,level_property,priority,cohort\n{base}_wi,global,global,1,',
    },
    // SPR Optimized — state-wise sub-categories
    sprOptimized: {
        layer1: [
            'widget_item_slug_name,level_tag,level_property,priority,cohort',
            '{base}_sc_wi_global,global,global,1,',
            '{base}_sc_wi_jh,state,jharkhand,2,',
            '{base}_sc_wi_cg,state,chhattisgarh,3,',
            '{base}_sc_wi_wb,state,west bengal,4,',
        ].join('\n'),
    },
    // Carousel — carousel items mapped globally
    carousel: {
        layer1: [
            'widget_item_slug_name,level_tag,level_property,priority,cohort',
            '{base}_1_cl_wi,global,global,1,',
            '{base}_2_cl_wi,global,global,2,',
            '{base}_3_cl_wi,global,global,3,',
        ].join('\n'),
    },
    // Category Grid — category items mapped globally
    categoryGrid: {
        layer1: [
            'widget_item_slug_name,level_tag,level_property,priority,cohort',
            '{base}_item_1_cat_wi,global,global,1,',
            '{base}_item_2_cat_wi,global,global,2,',
            '{base}_item_3_cat_wi,global,global,3,',
            '{base}_item_4_cat_wi,global,global,4,',
        ].join('\n'),
    },
    // Layer 2 — simple global
    layoutWidget: 'widget_slug_name,level_tag,level_property,priority,cohort\n{base}_plp_w,global,global,1,',
    // Layer 3 — always global
    pageLayout: 'level_tag,level_property\nglobal,global',
};
