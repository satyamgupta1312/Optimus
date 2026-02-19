/**
 * PLP Ecosystem Configuration — Source of Truth
 *
 * Defines the universal 3-layer PLP (Product Listing Page) ecosystem
 * shared by ALL widgets that navigate to a page.
 *
 * Wiki Reference: wiki/PLP-PAGE-widget-support.md
 *
 * Architecture:
 *   Sub-Category Widget Items (products + location mapping)
 *           ↓ mapped to
 *   PLP Widget (product_listing)
 *           ↓ mapped to
 *   Page Layout (product_listing_page / category_page)
 *           ↓ mapped to
 *   Global Page Registry
 *
 * Every widget that creates a click-through page uses this same 3-layer
 * structure regardless of widget type.
 */

import { STATE_DEFINITIONS as STATE_DEFINITIONS_BASE } from './MastheadConfig';

// ── State / Location Definitions ──
// Single source of truth: MastheadConfig.js — imported and extended here with 'required' flag.
// Global is always required. Additional states are added dynamically via "Add State" button.
export const STATE_DEFINITIONS = {
    global: { ...STATE_DEFINITIONS_BASE.global, required: true },
    jh: { ...STATE_DEFINITIONS_BASE.jh, required: false },
    cg: { ...STATE_DEFINITIONS_BASE.cg, required: false },
    wb: { ...STATE_DEFINITIONS_BASE.wb, required: false },
    up: { ...STATE_DEFINITIONS_BASE.up, required: false },
    patna: { ...STATE_DEFINITIONS_BASE.patna, required: false },
};


// ── Page Types ──
export const PAGE_TYPES = {
    product_listing_page: {
        value: 'product_listing_page',
        label: 'Product Listing Page',
        description: 'Flat product grid — shows all products in a single list',
        showSubCatTabs: false,
    },
    category_page: {
        value: 'category_page',
        label: 'Category Page',
        description: 'Categorized browsing — shows sub-category tabs/cards',
        showSubCatTabs: true,
    },
};

// ── Widget → Page Type Support Matrix ──
// Defines which widgets support which page types and how the selection works
export const WIDGET_PAGE_TYPE_SUPPORT = {
    carousel: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_item',  // page type selected per carousel item
        navigationMechanism: 'click_action_params',
    },
    masthead_secondary_category_hp: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_item',
        navigationMechanism: 'click_action_params',
    },
    category: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_item',
        navigationMechanism: 'click_action_params',
    },
    single_product_row: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_widget',
        navigationMechanism: 'view_all_action_params',
    },
    single_product_row_v2: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_widget',
        navigationMechanism: 'view_all_action_params',
    },
    multimedia_single_product_row: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_widget',
        navigationMechanism: 'view_all_action_params',
    },
    multimedia_single_product_row_v2: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_widget',
        navigationMechanism: 'view_all_action_params',
    },
    double_product_row: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_widget',
        navigationMechanism: 'view_all_action_params',
    },
    double_product_row_v2: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_widget',
        navigationMechanism: 'view_all_action_params',
    },
    multimedia_double_product_row: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_widget',
        navigationMechanism: 'view_all_action_params',
    },
    multimedia_double_product_row_v2: {
        supportsProductListingPage: true,
        supportsCategoryPage: true,
        selectionLevel: 'per_widget',
        navigationMechanism: 'view_all_action_params',
    },
};

// ── Universal PLP 3-Layer Ecosystem ──
// Every widget that navigates to a page creates these 3 objects + 3 mappings.
export const PLP_ECOSYSTEM = {
    layers: [
        {
            name: 'Sub-Category Widget Item',
            itemType: 'sub_category',
            endpoint: '/api/app/post_widget_item/',
            position: 'bottom',
            description: 'Holds the product list + filters. One per state for location-wise mapping.',
        },
        {
            name: 'PLP Widget',
            widgetType: 'product_listing',
            endpoint: '/api/app/widget/',
            position: 'middle',
            description: 'Container for sub-categories. Controls show_sub_cat display.',
        },
        {
            name: 'Page Layout',
            pageTypes: ['product_listing_page', 'category_page'],
            endpoint: '/api/app/post_page_layout/',
            position: 'top',
            description: 'Navigation target. Registered in global page registry.',
        },
    ],
    mappings: [
        {
            name: 'Sub-Cat → PLP Widget',
            type: 'widget_item',
            endpoint: '/api/app/update_widget_widget_item_mapping/',
            description: 'Location-wise CSV mapping (level_tag + level_property + priority)',
        },
        {
            name: 'PLP Widget → Page Layout',
            type: 'layout_widget',
            endpoint: '/api/app/update_layout_widget_mapping/',
            description: 'Links PLP widget to the page layout',
        },
        {
            name: 'Page Layout → Global',
            type: 'page_layout',
            endpoint: '/api/app/update_page_page_layout_mapping/',
            description: 'Registers page layout in the global page registry for navigation',
        },
    ],
};

// ── Navigation Mechanisms ──
// Different widgets use different fields to link to their Page Layout
export const NAVIGATION_MECHANISMS = {
    // Used by widget items (carousel items, category items)
    click_action_params: {
        field: 'click_action_params',
        actionField: 'item_click_action',
        actionValue: 'redirect-to-page',
        paramsShape: {
            page_type: '$pageType',                    // "product_listing_page" or "category_page"
            page_layout_slug_name: '$pageLayoutSlug',  // slug of the page layout
        },
        usedBy: ['carousel', 'masthead_secondary_category_hp', 'category'],
    },
    // Used by widgets (SPR, Double Row) via "View All" button
    view_all_action_params: {
        field: 'view_all_action_params',
        actionField: 'view_all_action_name',
        actionValue: 'redirect-to-page',
        paramsShape: {
            page_type: '$pageType',
            page_layout_slug_name: '$pageLayoutSlug',
        },
        usedBy: [
            'single_product_row', 'single_product_row_v2',
            'double_product_row', 'double_product_row_v2',
            'multimedia_single_product_row', 'multimedia_single_product_row_v2',
            'multimedia_double_product_row', 'multimedia_double_product_row_v2',
        ],
    },
};

// ── PLP App Configurations ──
// Controls display behavior of the PLP Widget
export const PLP_APP_CONFIGURATIONS = {
    show_sub_cat: {
        type: 'boolean',
        default: false,
        description: 'Show sub-category tabs on the page',
        // Widgets that should set this to true:
        enabledFor: [
            'carousel',                            // has multiple state-wise sub-categories
            'masthead_secondary_category_hp',      // always — has multiple sub-categories
            'category',                            // always — has multiple sub-categories
        ],
        // Widgets that should leave false or omit:
        disabledFor: [
            'single_product_row',                  // uses item_rows, not sub-categories
            'single_product_row_v2',               // single global sub-category
            'multimedia_single_product_row',
            'multimedia_single_product_row_v2',
        ],
    },
};

// ── Widget → Location Mapping Support ──
// All widgets support dynamic state-based location mapping
export const LOCATION_MAPPING_SUPPORT = {
    carousel: { supported: true, stateAddition: 'dynamic' },
    masthead_secondary_category_hp: { supported: true, stateAddition: 'dynamic' },
    category: { supported: true, stateAddition: 'dynamic' },
    single_product_row: { supported: true, stateAddition: 'dynamic' },
    single_product_row_v2: { supported: true, stateAddition: 'dynamic' },
    multimedia_single_product_row: { supported: true, stateAddition: 'dynamic' },
    multimedia_single_product_row_v2: { supported: true, stateAddition: 'dynamic' },
    double_product_row: { supported: true, stateAddition: 'dynamic' },
    double_product_row_v2: { supported: true, stateAddition: 'dynamic' },
    multimedia_double_product_row: { supported: true, stateAddition: 'dynamic' },
    multimedia_double_product_row_v2: { supported: true, stateAddition: 'dynamic' },
};

// ── Universal Filters & Configurations ──
// These apply to ALL widget types across the PLP ecosystem.
// Handled by WidgetItemHelper / PageViewUtils on the backend.
export const UNIVERSAL_FILTERS = {
    // Widget-level (filter_dict on Widget model)
    widget: {
        max_order_constraint: { type: 'int', label: 'Max Order Count', component: 'NumberInput', description: 'Show widget only if user total orders <= Y' },
        min_order_constraint: { type: 'int', label: 'Min Order Count', component: 'NumberInput', description: 'Show widget only if user total orders >= X' },
    },
    // Item-level (filter_dict on WidgetItem model)
    item: {
        in_stk_item_codes: { type: 'list_of_int', label: 'Mandatory In-Stock Items', component: 'ProductListInput', description: 'Widget item only shown if these items are in stock' },
    },
    // Product-level (product_filter_dict on WidgetItem model)
    product: {
        category: { operators: ['in', 'equal'], component: 'TextInput', description: 'Filter by product category' },
        sub_category: { operators: ['in', 'equal'], component: 'TextInput', description: 'Filter by sub-category' },
        mrp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput', description: 'Filter by MRP' },
        sp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput', description: 'Filter by Selling Price' },
        discount: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput', description: 'Filter by discount percentage' },
    },
};

// ── App Configurations ──
// Applied by PageViewUtils.__filter_by_app_version for all widget types
// Same keys used in all widget configs (appConfigurations field)
export const APP_CONFIGURATIONS = {
    allow_android: { type: 'boolean', default: true, component: 'ToggleInput', description: 'Toggle visibility on Android' },
    allow_ios: { type: 'boolean', default: true, component: 'ToggleInput', description: 'Toggle visibility on iOS' },
    min_android_version: { type: 'version', default: null, component: 'VersionInput', description: 'Show only on Android >= V (e.g. 2.4.7)' },
    max_android_version: { type: 'version', default: null, component: 'VersionInput', description: 'Show only on Android <= V' },
    min_ios_version: { type: 'version', default: null, component: 'VersionInput', description: 'Show only on iOS >= V' },
    max_ios_version: { type: 'version', default: null, component: 'VersionInput', description: 'Show only on iOS <= V' },
};

// Alias for backward compatibility
export const UNIVERSAL_APP_CONFIGURATIONS = APP_CONFIGURATIONS;


// ── Widget Item Additional Properties ──
// Backend-processed by WidgetItemHelper for all item types
export const WIDGET_ITEM_ADDITIONAL_PROPERTIES = {
    oos_product_count: { type: 'int', default: 0, label: 'OOS Product Count', component: 'NumberInput', description: 'Number of Out-of-Stock products to append at end' },
    show_pb_tag: { type: 'boolean', default: true, label: 'Show PB Tag', component: 'ToggleInput', description: 'Show "Previously Bought" tag on product cards' },
    pb_reorder: { type: 'boolean', default: true, label: 'PB Reorder', component: 'ToggleInput', description: 'Re-sort to show Previously Bought items first' },
};

// ── Filter Support Matrix ──
// Which widgets support which filter types
// All filters are applied at serve-time by the backend — they do NOT affect the widget creation payload
export const FILTER_SUPPORT_MATRIX = {
    carousel: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    masthead_secondary_category_hp: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    category: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    single_product_row: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    single_product_row_v2: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    multimedia_single_product_row: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    multimedia_single_product_row_v2: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    double_product_row: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    double_product_row_v2: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    multimedia_double_product_row: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    multimedia_double_product_row_v2: { widgetFilters: true, itemFilters: true, productFilters: true, appConfig: true, additionalProperties: true },
    masthead_primary: { widgetFilters: true, itemFilters: false, productFilters: false, appConfig: true, additionalProperties: false },
};

// ── CSV Mapping Format ──
// Template for location-wise widget_item mapping CSV
export const MAPPING_CSV_TEMPLATE = {
    headers: ['widget_item_slug_name', 'level_tag', 'level_property', 'priority', 'cohort'],
    /**
     * Generate a CSV row for a state mapping entry.
     * @param {string} slugName - Full widget item slug
     * @param {string} stateKey - State key (e.g. 'global', 'jh', 'up')
     * @param {number} priority - Priority number (global = 1, then incremental)
     * @returns {string} CSV row
     */
    generateRow(slugName, stateKey, priority) {
        const state = STATE_DEFINITIONS[stateKey];
        if (!state) {
            // Dynamic state — derive from key
            return `${slugName},state,${stateKey.toLowerCase()},${priority},`;
        }
        return `${slugName},${state.levelTag},${state.levelProperty},${priority},`;
    },
    /**
     * Generate full CSV content for a set of state mappings.
     * @param {Array<{slug: string, stateKey: string}>} entries
     * @returns {string} Full CSV with headers
     */
    generateCSV(entries) {
        const header = this.headers.join(',');
        const rows = entries.map((entry, index) =>
            this.generateRow(entry.slug, entry.stateKey, index + 1)
        );
        return [header, ...rows].join('\n');
    },
};

// ── API Endpoints ──
// All endpoints used by the PLP ecosystem
export const PLP_ENDPOINTS = {
    widgetItem: '/api/app/post_widget_item/',
    widget: '/api/app/widget/',
    pageLayout: '/api/app/post_page_layout/',
    mapWidgetItem: '/api/app/update_widget_widget_item_mapping/',
    mapLayoutWidget: '/api/app/update_layout_widget_mapping/',
    mapPageLayout: '/api/app/update_page_page_layout_mapping/',
};
