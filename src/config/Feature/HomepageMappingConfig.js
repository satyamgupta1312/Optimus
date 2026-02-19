/**
 * Homepage Mapping Configuration — Source of Truth
 *
 * Defines all configuration for the Homepage Mapping dashboard:
 *   - GL-HP-global page slug and API
 *   - Location hierarchy and resolution priority
 *   - Mapping table columns and status logic
 *   - Widget type → editor routing
 *   - Environment endpoints (Prod + UAT)
 *
 * Wiki Reference: wiki/Homepage_mapping.md
 */

// ── Homepage Page Slug ──
export const HOMEPAGE_SLUG = 'GL-HP-global';

// ── View API Config ──
// GET /api/app/get_paginated_page_widget_mappings/
export const HOMEPAGE_VIEW_API = {
    endpoint: '/api/app/get_paginated_page_widget_mappings/',
    method: 'GET',
    defaultParams: {
        slug_name: HOMEPAGE_SLUG,
        status: 'active',
        limit: 50,
        page_no: 1,
    },
    // Optional params (can be appended at call time)
    optionalParams: {
        store_id: { type: 'int', description: 'Filter by specific store' },
        timestamp: { type: 'string', description: 'ISO 8601 — point-in-time status check', example: '2026-02-17T11:05:00.000Z' },
    },
};

// ── Response Schema ──
// Shape returned by get_paginated_page_widget_mappings
export const HOMEPAGE_RESPONSE_SCHEMA = {
    code: { type: 'int', description: '0 = success' },
    message: { type: 'string', description: '"success!"' },
    data: {
        type: 'array',
        items: {
            widget_id: { type: 'int', description: 'Unique widget ID' },
            widget__slug_name: { type: 'string', description: 'Widget slug name' },
            priority: { type: 'int', description: 'Display order — lower = higher position' },
            event_id: { type: 'int|null', description: 'Associated event (if any)' },
            widget__start_time: { type: 'datetime', description: 'Widget activation time (ISO 8601)' },
            widget__end_time: { type: 'datetime', description: 'Widget expiry time (ISO 8601)' },
            updated_at: { type: 'datetime', description: 'Last mapping update time' },
            level_tag: { type: 'string', description: 'Location level: global | state | city | store_id' },
            level_property: { type: 'string', description: 'Location value: global | jharkhand | 166 | etc.' },
            cohort: { type: 'string|null', description: 'Cohort targeting (if any)' },
            widget__deactivated_flag: { type: 'boolean', description: 'Manual deactivation override' },
        },
    },
    pagination: {
        has_previous: { type: 'boolean' },
        has_next: { type: 'boolean' },
        page_size: { type: 'int' },
        current_page: { type: 'int' },
    },
};

// ── Mapping Table Columns ──
// Defines what each column means in the HomepageMapping UI table
export const MAPPING_TABLE_COLUMNS = [
    { key: '#', label: '#', description: 'Row index' },
    { key: 'slug', label: 'Widget Slug', description: 'widget__slug_name from API', apiField: 'widget__slug_name' },
    { key: 'widgetType', label: 'Widget Type', description: 'Backend widget_type' },
    { key: 'heading', label: 'Heading', description: 'Display title of the widget' },
    { key: 'levelTag', label: 'Location Level', description: 'global | state | city | store_id', apiField: 'level_tag' },
    { key: 'levelProperty', label: 'Location Value', description: 'global | jharkhand | bengaluru | 166', apiField: 'level_property' },
    { key: 'priority', label: 'Priority', description: 'Sort order within location level', apiField: 'priority' },
    { key: 'startTime', label: 'Start Time', description: 'Widget activation timestamp', apiField: 'widget__start_time' },
    { key: 'endTime', label: 'End Time', description: 'Widget expiry timestamp', apiField: 'widget__end_time' },
    { key: 'status', label: 'Status', description: 'Active | Inactive — derived from start/end time' },
];

// ── Status Logic ──
// Active = now >= start_time AND now < end_time
export const STATUS_LOGIC = {
    ACTIVE: { label: 'Active', condition: 'now >= start_time AND now < end_time' },
    INACTIVE: { label: 'Inactive', condition: 'now < start_time OR now >= end_time' },
};

// ── Location Hierarchy ──
// Most-specific-first fallback: store → city → state → global
export const LOCATION_HIERARCHY = [
    {
        level: 'store',
        levelTag: 'store_id',
        levelPropertyType: 'int',
        description: 'Most specific — matches exact store',
        example: '166',
        priority: 1,
    },
    {
        level: 'city',
        levelTag: 'city',
        levelPropertyType: 'string',
        description: 'City-level match',
        example: 'bengaluru',
        priority: 2,
    },
    {
        level: 'state',
        levelTag: 'state',
        levelPropertyType: 'string',
        description: 'State-level match',
        example: 'jharkhand',
        priority: 3,
    },
    {
        level: 'global',
        levelTag: 'global',
        levelPropertyType: 'string',
        description: 'Fallback — shown to all users',
        example: 'global',
        priority: 4,
    },
];

// ── Known Location Values ──
export const KNOWN_LOCATIONS = {
    states: [
        { levelProperty: 'jharkhand', slugSuffix: '_jh' },
        { levelProperty: 'chhattisgarh', slugSuffix: '_cg' },
        { levelProperty: 'west bengal', slugSuffix: '_wb' },
        { levelProperty: 'uttar pradesh', slugSuffix: '_up' },
        { levelProperty: 'patna', slugSuffix: '_patna' },
    ],
    stores: [
        { storeId: 166, city: 'bengaluru', levelTag: 'store_id', levelProperty: '166' },
    ],
};

// ── Widget Type → Editor Route ──
// When user clicks a widget row in the mapping table, open the correct editor
export const WIDGET_EDITOR_ROUTES = {
    carousel: { editor: 'CollectionBanner', mode: 'scroll', label: 'Collection Banner (Scroll)' },
    category: { editor: 'CollectionBanner', mode: 'stick', label: 'Collection Banner (Stick)' },
    single_product_row: { editor: 'ProductRail', variant: 'standard', label: 'Product Rail (Standard)' },
    single_product_row_v2: { editor: 'ProductRail', variant: 'optimized', label: 'Product Rail (Optimized)' },
    multimedia_single_product_row: { editor: 'ProductRail', variant: 'multimedia', label: 'Product Rail (Multimedia)' },
    multimedia_single_product_row_v2: { editor: 'ProductRail', variant: 'multimedia-optimized', label: 'Product Rail (Multimedia Optimized)' },
    double_product_row: { editor: 'ProductRail', variant: 'double-standard', label: 'Double Product Row (Standard)' },
    double_product_row_v2: { editor: 'ProductRail', variant: 'double-optimized', label: 'Double Product Row (Optimized)' },
    multimedia_double_product_row: { editor: 'ProductRail', variant: 'double-multimedia', label: 'Double Product Row (Multimedia)' },
    multimedia_double_product_row_v2: { editor: 'ProductRail', variant: 'double-multimedia-optimized', label: 'Double Product Row (Multimedia Optimized)' },
    masthead_primary: { editor: 'Masthead', variant: 'primary', label: 'Primary Masthead' },
    masthead_secondary_category_hp: { editor: 'Masthead', variant: 'secondary', label: 'Secondary Masthead' },
};

// ── Editable Fields ──
// Which fields can be changed when editing a widget from the mapping table
export const HOMEPAGE_EDITABLE_FIELDS = {
    heading: { editable: true, label: 'Heading / Title', notes: 'English + Hindi' },
    items: { editable: true, label: 'Widget Items / Products', notes: 'Add, remove, reorder' },
    locationLevel: { editable: true, label: 'Location Mapping', notes: 'level_tag / level_property' },
    startTime: { editable: true, label: 'Start Time', notes: 'Controls Active status' },
    endTime: { editable: true, label: 'End Time', notes: 'Controls Inactive status' },
    media: { editable: true, label: 'Images / Media', notes: 'Upload or URL' },
    pageType: { editable: true, label: 'Page Type', notes: 'product_listing_page | category_page' },
    slugName: { editable: false, label: 'Slug Name', notes: 'Immutable after creation' },
};

// ── Emulator API ──
// Used by the emulator preview to load widgets for a selected location
export const EMULATOR_API = {
    endpoint: '/api/app/get_page/',
    method: 'GET',
    params: {
        page_layout_slug_name: HOMEPAGE_SLUG,
        city: { type: 'string', description: 'City name (e.g. bengaluru)' },
        store_id: { type: 'int', description: 'Store ID (e.g. 166)' },
    },
};

// ── Widget Types Rendered in Emulator ──
export const EMULATOR_WIDGET_COMPONENTS = {
    masthead_primary: { component: 'PrimaryMasthead', displayAs: 'App header background + category nav' },
    masthead_secondary_category_hp: { component: 'PrimaryMasthead', displayAs: 'Scrollable category banners' },
    carousel: { component: 'CollectionBanner', mode: 'scroll', displayAs: 'Swipeable banner carousel' },
    category: { component: 'CollectionBanner', mode: 'stick', displayAs: '4-column category grid' },
    single_product_row: { component: 'ProductRail', displayAs: 'Horizontal product scroll (1 row)' },
    single_product_row_v2: { component: 'ProductRail', displayAs: 'Horizontal product scroll (1 row, optimized)' },
    double_product_row: { component: 'ProductRail', displayAs: '2-row product scroll' },
    double_product_row_v2: { component: 'ProductRail', displayAs: '2-row product scroll (optimized)' },
    multimedia_single_product_row: { component: 'ProductRail', displayAs: 'Product scroll + background media' },
    multimedia_single_product_row_v2: { component: 'ProductRail', displayAs: 'Product scroll + background media (optimized)' },
    multimedia_double_product_row: { component: 'ProductRail', displayAs: '2-row product scroll + background media' },
    multimedia_double_product_row_v2: { component: 'ProductRail', displayAs: '2-row product scroll + background media (optimized)' },
};

// ── Mapping CSV Templates ──
export const HOMEPAGE_MAPPING_CSVS = {
    // Layer 2: Widget → Homepage Page Layout
    layoutWidget: {
        endpoint: '/api/app/update_layout_widget_mapping/',
        headers: ['widget_slug_name', 'level_tag', 'level_property', 'priority', 'cohort'],
        example: [
            'Ramadan_Essentials_spr_opt,state,jharkhand,1,',
            'bau_plp_firstfold_sale_Best_Sellers_spr_w_all_both_OPT_w,state,jharkhand,2,',
            'Fresh_Fruits_Everyday_spr_opt,state,jharkhand,6,',
        ].join('\n'),
    },
    // Layer 3: Page Layout → Global Registry
    pageLayout: {
        endpoint: '/api/app/update_page_page_layout_mapping/',
        headers: ['level_tag', 'level_property'],
        fixedRow: 'global,global',
    },
};

// ── GL-HP Slug Naming Convention ──
// Homepage widget items use GL-HP or GL_HP prefix patterns
export const HOMEPAGE_SLUG_CONVENTION = {
    prefixes: ['GL-HP-', 'GL_HP_'],
    note: 'Both hyphen (GL-HP-) and underscore (GL_HP_) conventions exist in live data',
    examples: [
        { slug: 'GL_HP_milk_dairy_crausel_wi_listing_wb', category: 'Dairy & Breakfast' },
        { slug: 'GL-HP-atta_besan_sooji_cat-wi', category: 'Grocery' },
        { slug: 'GL-HP-oils-ghee_cat-wi', category: 'Grocery' },
        { slug: 'GL-HP-pulses_cat-wi', category: 'Grocery' },
        { slug: 'GL-HP-cereals-rice_cat-wi', category: 'Grocery' },
        { slug: 'GL_HP_Chips_Namkeen_listing_wi', category: 'Snacks & Drinks' },
        { slug: 'GL_HP_Bath_BodyWash_listing_wi_cg', category: 'Beauty & Personal Care' },
    ],
};

// ── Environment Endpoints ──
export const HOMEPAGE_ENVIRONMENTS = {
    PROD: {
        label: 'Production',
        baseUrl: 'https://samaan.apnamart.in',
        adminPanel: 'https://samaan.apnamart.in/page-layout-widget-list/',
        homepageSlug: HOMEPAGE_SLUG,
    },
    UAT: {
        label: 'UAT',
        baseUrl: 'https://uat.apnamart.in',
        adminPanel: 'https://uat.apnamart.in/page-layout-widget-list/',
        homepageSlug: HOMEPAGE_SLUG,
    },
};

// ── All API Endpoints ──
// Same path on both Prod and UAT — only base URL changes
export const HOMEPAGE_API_ENDPOINTS = {
    viewMappings: '/api/app/get_paginated_page_widget_mappings/',
    getPage: '/api/app/get_page/',
    createWidget: '/api/app/widget/',
    createWidgetItem: '/api/app/post_widget_item/',
    createPageLayout: '/api/app/post_page_layout/',
    mapWidgetItems: '/api/app/update_widget_widget_item_mapping/',
    mapLayoutWidget: '/api/app/update_layout_widget_mapping/',
    mapPageLayout: '/api/app/update_page_page_layout_mapping/',
    getWidgetProducts: '/api/app/get_paginated_widget_product_list/v2/',
    multimedia: '/api/app/multimedia/',
    pageSkeleton: '/api/app/page_skeleton/v2/',
    getWidget: '/api/app/get_widget/',
    getWidgetItem: '/api/app/get_widget_item/',
};

// ── Live Data Snapshot ──
// ⚠️  Static snapshot — update periodically via HomepageMapping dashboard
// Last updated: 2026-02-19
export const HOMEPAGE_LIVE_SNAPSHOT = {
    totalActiveMappings: 143,
    uniqueWidgets: 60,
    distributionByLocation: [
        { location: 'state/west bengal', widgetCount: 42 },
        { location: 'state/chhattisgarh', widgetCount: 40 },
        { location: 'state/jharkhand', widgetCount: 40 },
        { location: 'store_id/166', widgetCount: 21 },
    ],
    sampleWidgets: [
        { widgetId: 5735, type: 'single_product_row_v2', heading: 'Thursday Bazaar', slug: 'bau_plp_firstfold_sale_malamaal_thursday_spr_opt_w_all_both' },
        { widgetId: 7101, type: 'single_product_row_v2', heading: 'Rice Mela', slug: 'bau_plp_firstfold_sale_rice_mela_spr_w_all_both_OPT_w' },
        { widgetId: 6123, type: 'category', heading: 'Dairy & Breakfast', slug: 'CAT_BREAK_FAST_W_Pane', itemCount: 4 },
        { widgetId: 6124, type: 'category', heading: 'Grocery', slug: 'CAT_GROCERY_W_Pane', itemCount: 8 },
        { widgetId: 7177, type: 'double_product_row_v2', heading: 'Namkeens', slug: 'event_plp_firstfold_sale_Namkeen_dspr_w_all_both_copy' },
        { widgetId: 6806, type: 'carousel', heading: 'Featured this Week', slug: 'bau_plp_firstfold_sale_christmas_widgets_cl_w_all_both', itemCount: 5 },
    ],
};
