/**
 * Widget Creation Configuration — Source of Truth
 *
 * Defines the bottom-up creation pattern, API endpoints, creation paths,
 * and payload templates for every widget type in Optimus.
 *
 * Wiki Reference: wiki/Feature-Creation-Widget.md
 *
 * Architecture:
 *   Widget Items → Widgets → Page Layouts → Mappings
 *   (created first)  (second)  (third)       (last)
 */

// ── Creation API Endpoints ──
export const CREATION_ENDPOINTS = {
    widgetItem: {
        url: '/api/app/post_widget_item/',
        method: 'POST',
        contentType: 'multipart/form-data',
        creates: 'Widget Item',
    },
    widget: {
        url: '/api/app/widget/',
        method: 'POST',
        contentType: 'multipart/form-data',
        creates: 'Widget',
    },
    pageLayout: {
        url: '/api/app/post_page_layout/',
        method: 'POST',
        contentType: 'application/json',
        creates: 'Page Layout',
    },
    multimedia: {
        url: '/api/app/multimedia/',
        method: 'POST',
        contentType: 'multipart/form-data',
        creates: 'Multimedia Object',
    },
};

// ── Widget Type Summary ──
export const WIDGET_TYPE_SUMMARY = {
    product_rail: {
        label: 'Product Rail',
        backendTypes: [
            'single_product_row', 'single_product_row_v2',
            'double_product_row', 'double_product_row_v2',
            'multimedia_single_product_row', 'multimedia_single_product_row_v2',
            'multimedia_double_product_row', 'multimedia_double_product_row_v2',
        ],
        sidebarSelection: 'Rows × Optimized × Multimedia',
        complexity: 'Low–Medium',
    },
    collection_banner: {
        label: 'Collection Banner',
        backendTypes: ['carousel', 'category'],
        sidebarSelection: 'Display Mode toggle (Scroll / Stick)',
        complexity: 'Medium–High',
    },
    masthead: {
        label: 'Masthead',
        backendTypes: ['masthead_primary', 'masthead_secondary_category_hp'],
        sidebarSelection: 'Primary / Secondary toggle',
        complexity: 'Low / High',
    },
};

// ── Product Rail Variant Composition Matrix ──
// All 8 variants share the same creation flow — only widget_type differs
export const PRODUCT_RAIL_VARIANT_MATRIX = [
    { rows: 1, isOptimized: false, hasMultimedia: false, widgetType: 'single_product_row' },
    { rows: 1, isOptimized: true, hasMultimedia: false, widgetType: 'single_product_row_v2' },
    { rows: 1, isOptimized: false, hasMultimedia: true, widgetType: 'multimedia_single_product_row' },
    { rows: 1, isOptimized: true, hasMultimedia: true, widgetType: 'multimedia_single_product_row_v2' },
    { rows: 2, isOptimized: false, hasMultimedia: false, widgetType: 'double_product_row' },
    { rows: 2, isOptimized: true, hasMultimedia: false, widgetType: 'double_product_row_v2' },
    { rows: 2, isOptimized: false, hasMultimedia: true, widgetType: 'multimedia_double_product_row' },
    { rows: 2, isOptimized: true, hasMultimedia: true, widgetType: 'multimedia_double_product_row_v2' },
];

// ── Creation Paths ──
// Determines which creation flow to use based on widget properties

export const CREATION_PATHS = {
    // ── Product Rail ──
    product_rail: {
        // Both STANDARD and OPTIMIZED follow the same dual-flow creation.
        // is_optimized only controls widget_type naming (_v2 suffix) and widget slug (_spr vs _spr_opt).
        // State-wise products are created in ALL variants.
        // Multimedia adds one extra step (multimedia object creation) to either path.
        STANDARD: {
            description: 'Standard — dual-flow: PLP ecosystem (state-wise) + homepage row. No _v2 suffix.',
            condition: (pnc) => !pnc.is_optimized,
            steps: [
                // Flow 1: PLP Ecosystem (state-wise — same as OPTIMIZED)
                { order: 1, entity: 'page_layout', endpoint: 'pageLayout', flow: 'plp' },
                { order: 2, entity: 'widget_item', itemType: 'sub_category', endpoint: 'widgetItem', flow: 'plp', iterateStates: true },
                { order: 3, entity: 'widget', widgetType: 'product_listing', endpoint: 'widget', flow: 'plp' },
                { order: 4, action: 'map_widget_item', description: 'Sub-Cats → PLP (location-wise CSV)', flow: 'plp' },
                { order: 5, action: 'map_layout_widget', description: 'PLP → Page Layout', flow: 'plp' },
                { order: 6, action: 'map_page_layout', description: 'Page → Global', flow: 'plp' },
                // Flow 2: Homepage Row
                { order: 7, entity: 'widget_item', itemType: 'item_rows', endpoint: 'widgetItem', flow: 'homepage' },
                { order: 8, entity: 'widget', endpoint: 'widget', flow: 'homepage' },
                { order: 9, action: 'map_widget_item', description: 'Row Item → Homepage Widget', flow: 'homepage' },
            ],
        },
        OPTIMIZED: {
            description: 'Optimized — dual-flow: PLP ecosystem (state-wise) + homepage row. _v2 suffix on widget_type.',
            condition: (pnc) => pnc.is_optimized,
            steps: [
                // Flow 1: PLP Ecosystem (state-wise)
                { order: 1, entity: 'page_layout', endpoint: 'pageLayout', flow: 'plp' },
                { order: 2, entity: 'widget_item', itemType: 'sub_category', endpoint: 'widgetItem', flow: 'plp', iterateStates: true },
                { order: 3, entity: 'widget', widgetType: 'product_listing', endpoint: 'widget', flow: 'plp' },
                { order: 4, action: 'map_widget_item', description: 'Sub-Cats → PLP (location-wise CSV)', flow: 'plp' },
                { order: 5, action: 'map_layout_widget', description: 'PLP → Page Layout', flow: 'plp' },
                { order: 6, action: 'map_page_layout', description: 'Page → Global', flow: 'plp' },
                // Flow 2: Homepage Row
                { order: 7, entity: 'widget_item', itemType: 'item_rows', endpoint: 'widgetItem', flow: 'homepage' },
                { order: 8, entity: 'widget', endpoint: 'widget', flow: 'homepage' },
                { order: 9, action: 'map_widget_item', description: 'Row Item → Homepage Widget', flow: 'homepage' },
            ],
        },
        MULTIMEDIA_ADDITION: {
            description: 'Extra step for multimedia_* variants — create before homepage widget',
            condition: (pnc) => pnc.has_multimedia,
            step: { entity: 'multimedia', endpoint: 'multimedia', insertBefore: 'homepage_widget' },
        },
    },

    // ── Collection Banner — Scroll Mode (Carousel) ──
    carousel: {
        description: 'Bottom-up: Sub-Cat → PLP → Page → Carousel Item → Carousel Widget',
        stepsPerItem: [
            { order: 1, entity: 'widget_item', itemType: 'sub_category', endpoint: 'widgetItem', iterateStates: true },
            { order: 2, entity: 'widget', widgetType: 'product_listing', endpoint: 'widget' },
            { order: 3, entity: 'page_layout', endpoint: 'pageLayout' },
            { order: 4, action: 'map_widget_item', description: 'Sub-Cats → PLP (location-wise CSV)' },
            { order: 5, action: 'map_layout_widget', description: 'PLP → Page Layout' },
            { order: 6, action: 'map_page_layout', description: 'Page → Global' },
            { order: 7, entity: 'widget_item', itemType: 'carousel', endpoint: 'widgetItem' },
        ],
        finalAssembly: [
            { order: 8, entity: 'widget', widgetType: 'carousel', endpoint: 'widget' },
            { order: 9, action: 'map_widget_item', description: 'All Carousel Items → Carousel Widget' },
        ],
    },

    // ── Collection Banner — Stick Mode (Category Grid) ──
    category_grid: {
        description: 'Bottom-up per item: Sub-Cats → PLP → Page → Cat Item → Grid Widget',
        stepsPerItem: [
            { order: 1, entity: 'widget_item', itemType: 'sub_category', endpoint: 'widgetItem', iterateStates: true },
            { order: 2, entity: 'widget', widgetType: 'product_listing', endpoint: 'widget' },
            { order: 3, entity: 'page_layout', endpoint: 'pageLayout' },
            { order: 4, action: 'map_widget_item', description: 'Sub-Cats → PLP (location-wise CSV)' },
            { order: 5, action: 'map_layout_widget', description: 'PLP → Page Layout' },
            { order: 6, action: 'map_page_layout', description: 'Page → Global' },
            { order: 7, entity: 'widget_item', itemType: 'category', endpoint: 'widgetItem' },
        ],
        finalAssembly: [
            { order: 8, entity: 'widget', widgetType: 'category', endpoint: 'widget' },
            { order: 9, action: 'map_widget_item', description: 'All Category Items → Category Grid Widget' },
        ],
    },

    // ── Primary Masthead ──
    primary_masthead: {
        description: 'Simple — Multimedia (optional) + Widget. No mappings.',
        steps: [
            { order: 1, entity: 'multimedia', endpoint: 'multimedia', optional: true },
            { order: 2, entity: 'widget', widgetType: 'masthead_primary', endpoint: 'widget' },
        ],
    },

    // ── Secondary Masthead (3-Phase) ──
    secondary_masthead: {
        description: '3-Phase: Parent Containers → Item Ecosystems → Final Mapping',
        phase1: {
            label: 'Parent Containers',
            steps: [
                { order: 1, entity: 'multimedia', endpoint: 'multimedia', optional: true },
                { order: 2, entity: 'widget', widgetType: 'masthead_secondary_category_hp', endpoint: 'widget' },
            ],
        },
        phase2: {
            label: 'Item Ecosystems (per carousel item)',
            stepsPerItem: [
                { order: 3, entity: 'widget_item', itemType: 'sub_category', endpoint: 'widgetItem', iterateStates: true },
                { order: 4, entity: 'widget', widgetType: 'product_listing', endpoint: 'widget' },
                { order: 5, entity: 'page_layout', endpoint: 'pageLayout' },
                { order: 6, action: 'map_widget_item', description: 'Sub-Cats → PLP' },
                { order: 7, action: 'map_layout_widget', description: 'PLP → Page Layout' },
                { order: 8, action: 'map_page_layout', description: 'Page → Global' },
                { order: 9, entity: 'widget_item', itemType: 'carousel', endpoint: 'widgetItem' },
            ],
        },
        phase3: {
            label: 'Final Mapping',
            steps: [
                { order: 10, action: 'map_widget_item', description: 'All Carousel Items → SM Widget' },
            ],
        },
    },
};

// ── Payload Templates ──
// Field templates for each entity type. $variables are resolved at deploy time.

export const PAYLOAD_TEMPLATES = {
    // Page Layout
    page_layout: {
        slug_name: '$slug',
        page_heading: '$title',
        page_layout_type: '2',
        page_type: '$pageType',
    },

    // Widget Item — item_rows
    widget_item_rows: {
        slug_name: '$slug',
        item_type: 'item_rows',
        text_en: '$title',
        text_hi: '$titleHi',
        product_list: '$productCodes',
        filter_lst: '$inStockFilter',
        item_click_action: 'deal-detail-redirect',
        is_clickable: 'no',
        deactivated_flag: 'no',
        start_time: '$startTime',
        end_time: '$endTime',
        media_en: '$blankBlob',
    },

    // Widget Item — sub_category
    widget_item_sub_category: {
        slug_name: '$slug',
        item_type: 'sub_category',
        text_en: '$title',
        text_hi: '$titleHi',
        product_list: '$stateProductCodes',
        filter_lst: '$inStockFilter',
        is_clickable: 'yes',
        item_click_action: 'deal-detail-redirect',
        deactivated_flag: 'no',
        start_time: '$startTime',
        end_time: '$endTime',
    },

    // Widget Item — carousel
    widget_item_carousel: {
        slug_name: '$slug',
        item_type: 'carousel',
        media_en: '$carouselImage',
        item_click_action: 'redirect-to-page',
        click_action_params: '$clickActionParams',
        is_clickable: 'yes',
        text_en: '$title',
    },

    // Widget Item — category
    widget_item_category: {
        slug_name: '$slug',
        item_type: 'category',
        text_en: '$categoryName',
        text_hi: '$categoryNameHi',
        media_en: '$categoryImage',
        item_click_action: 'redirect-to-page',
        click_action_params: '$clickActionParams',
        is_clickable: 'yes',
        deactivated_flag: 'no',
    },

    // Homepage Widget (Product Rail)
    widget_product_rail: {
        slug_name: '$slug',
        widget_type: '$resolvedWidgetType',
        heading_en: '$title',
        heading_hi: '$titleHi',
        view_all_action_name: 'redirect-to-page',
        view_all_action_params: '$viewAllParams',
        background_multimedia: '$backgroundMultimediaSlug',
        media_aspect_ratio: '1',
        start_time: '$startTime',
        end_time: '$endTime',
        filter_dict: '{}',
        app_configurations: '$appConfigurations',
    },

    // Carousel Widget
    widget_carousel: {
        slug_name: '$slug',
        widget_type: 'carousel',
        media_number: '$mediaNumber',
        heading_en: '$title',
        start_time: '$startTime',
        end_time: '$endTime',
    },

    // Category Grid Widget
    widget_category_grid: {
        slug_name: '$slug',
        widget_type: 'category',
        heading_en: '$title',
        heading_hi: '$titleHi',
        start_time: '$startTime',
        end_time: '$endTime',
        media_aspect_ratio: '1',
        filter_dict: '{}',
        app_configurations: '$appConfigurations',
    },

    // PLP Widget
    widget_plp: {
        slug_name: '$slug',
        widget_type: 'product_listing',
        heading: '$title',
        heading_en: '$title',
        start_time: '$startTime',
        end_time: '$endTime',
        app_configurations: '$plpAppConfig',
    },

    // Primary Masthead Widget
    widget_primary_masthead: {
        slug_name: '$slug',
        widget_type: 'masthead_primary',
        master_key: '$masterKey',
        background_multimedia: '$backgroundMultimediaSlug',
        media_aspect_ratio: '$mediaAspectRatio',
        start_time: '$startTime',
        end_time: '$endTime',
        heading: '',
        heading_en: '',
        filter_dict: '{}',
        app_configurations: '{}',
    },

    // Secondary Masthead Widget
    widget_secondary_masthead: {
        slug_name: '$slug',
        widget_type: 'masthead_secondary_category_hp',
        master_key: '$masterKey',
        background_multimedia: '$backgroundMultimediaSlug',
        media_aspect_ratio: '$mediaAspectRatio',
        start_time: '$startTime',
        end_time: '$endTime',
        heading: '',
        filter_dict: '{}',
        app_configurations: '{}',
    },

    // Multimedia Object
    multimedia: {
        name: '$slug',
        multimedia_type: '$multimediaType',
        aspect_ratio: '$aspectRatio',
        file_en: '$mediaFile',
        transition_color: '$transitionColor',
        accent_color: '$accentColor',
        text_color: '$textColor',
        icon_bg_color: '$iconBgColor',
        is_multimedia_dark: '$isMultimediaDark',
    },
};

// ── Slug Collision Handling ──
export const SLUG_COLLISION = {
    maxRetries: 5,
    suffixPattern: '_{n}', // Append _1, _2, etc.
};

// ── Automation Scripts Reference ──
export const AUTOMATION_SCRIPTS = {
    product_rail: { script: 'scripts/SPR_Optimized_Automation.gs', functions: ['createSPRStandardWidget', 'createSPROptimizedWidget'] },
    carousel: { script: 'scripts/CLP_Automation.gs', functions: ['createCLPWidget'] },
    category_grid: { script: 'scripts/Category_Grid_Backend.gs', functions: ['createCategoryGridFromApproval'] },
    secondary_masthead: { script: 'scripts/Secondary_Masthead_Backend.gs', functions: ['3-Phase creation'] },
    primary_masthead: { script: 'scripts/Primary_Masthead_Automation.gs', functions: ['createPrimaryMastheadFromApproval'] },
    approval_router: { script: 'scripts/Approval_Automation.gs', functions: ['handleApprove'] },
};

// ── Frontend Services Reference ──
export const FRONTEND_SERVICES = {
    BackendSyncService: { file: 'src/services/BackendSyncService.js', handles: 'Collection Banner, Masthead deployment' },
    WidgetApiService: { file: 'src/services/WidgetApiService.js', handles: 'Product Rail creation' },
    LocalApiService: { file: 'src/services/LocalApiService.js', handles: 'Submit, approve, widgets, users, catalog, activity, comments, media' },
};
