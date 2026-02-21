/**
 * Fetch Widget Configuration — Source of Truth
 *
 * Defines the Fetch → Edit → Submit → Approve → API Update lifecycle,
 * widget/item type mappings, editable fields per widget, and API references.
 *
 * Wiki Reference: wiki/FEATURE-Fetch-Widget.md
 *
 * Flow:
 *   Fetch (slug) → Edit (all fields) → Submit (Maker) → Approve (Checker) → API Update (Backend)
 *
 * Source Component: src/components/FetchWidget.jsx
 * Location: Sidebar → top section (above Widget Library)
 */

// ── Fetch API Endpoints ──
// Phase 1: Try as Widget, Phase 2: Try as Widget Item
export const FETCH_ENDPOINTS = {
    widget: {
        primary: '/api/app/widget/',
        fallback: '/api/app/get_widget/',
        paramKey: 'slug_name',
    },
    widgetItem: {
        primary: '/api/app/widget_item/',
        fallback: '/api/app/get_widget_item/',
        paramKey: 'slug_name',
        fallbackParamKey: 'widget_item_slug_name',
    },
};

// ── Fetch Flow Phases ──
export const FETCH_FLOW = [
    {
        phase: 1,
        label: 'Try as Widget',
        endpoints: ['widget.primary', 'widget.fallback'],
        formatter: 'formatWidgetData',
    },
    {
        phase: 2,
        label: 'Try as Widget Item',
        endpoints: ['widgetItem.primary', 'widgetItem.fallback'],
        formatter: 'formatWidgetItemData',
    },
];

// ── Widget Type Mapping (formatWidgetData) ──
// Maps backend API widget_type → internal builder type, emulator component, and editor
export const WIDGET_TYPE_MAP = {
    carousel: {
        builderType: 'Banner With Product Listing',
        emulatorComponent: 'CollectionBanner',
        displayMode: 'scroll',
        editor: 'LegacyPropertyEditor',
    },
    category: {
        builderType: 'Category Grid',
        emulatorComponent: 'CollectionBanner',
        displayMode: 'stick',
        editor: 'LegacyPropertyEditor',
    },
    single_product_row: {
        builderType: 'Single Product Row',
        emulatorComponent: 'SingleProductRow',
        editor: 'LegacyPropertyEditor',
    },
    single_product_row_v2: {
        builderType: 'Single Product Row Optimize',
        emulatorComponent: 'SingleProductRow',
        editor: 'LegacyPropertyEditor',
    },
    double_product_row: {
        builderType: 'Double Product Row',
        emulatorComponent: 'SingleProductRow',
        editor: 'PropertyEditor',
    },
    double_product_row_v2: {
        builderType: 'Double Product Row Optimize',
        emulatorComponent: 'SingleProductRow',
        editor: 'PropertyEditor',
    },
    multimedia_single_product_row: {
        builderType: 'Multimedia Single Product Row',
        emulatorComponent: 'SingleProductRow',
        editor: 'PropertyEditor',
    },
    multimedia_single_product_row_v2: {
        builderType: 'Multimedia Single Product Row V2',
        emulatorComponent: 'SingleProductRow',
        editor: 'PropertyEditor',
    },
    multimedia_double_product_row: {
        builderType: 'Multimedia Double Product Row',
        emulatorComponent: 'SingleProductRow',
        editor: 'PropertyEditor',
    },
    multimedia_double_product_row_v2: {
        builderType: 'Multimedia Double Product Row V2',
        emulatorComponent: 'SingleProductRow',
        editor: 'PropertyEditor',
    },
    product_listing: {
        builderType: 'Product Listing Page (CLP)',
        emulatorComponent: 'BannerWithProductListing',
        editor: 'LegacyPropertyEditor',
    },
    masthead_primary: {
        builderType: 'Primary Masthead',
        emulatorComponent: 'PrimaryMasthead',
        editor: 'HeaderConfiguration',
    },
    masthead_secondary_category_hp: {
        builderType: 'Secondary Masthead Carousel',
        emulatorComponent: 'PrimaryMasthead',
        editor: 'HeaderConfiguration',
    },
};

// ── Widget Item Type Mapping (formatWidgetItemData) ──
export const WIDGET_ITEM_TYPE_MAP = {
    carousel: {
        builderType: 'Banner With Product Listing',
        usedBy: ['Carousel Widget', 'Secondary Masthead'],
    },
    sub_category: {
        builderType: 'Product Listing Page (CLP)',
        usedBy: ['Category Grid', 'Carousel', 'SPR Optimized'],
    },
    item_rows: {
        builderType: 'Single Product Row Optimize',
        usedBy: ['All Product Rail variants'],
    },
    category: {
        builderType: 'Category Grid',
        usedBy: ['Category Grid items'],
    },
};

// ── Editable Fields Per Widget Type ──
// Defines which fields are editable after fetching, per widget type

export const EDITABLE_FIELDS = {
    // ── Product Rail (all 8 variants) ──
    product_rail: {
        editor: 'PropertyEditor',
        configFile: 'src/config/widgets/SPRConfig.js',
        fields: [
            { name: 'slug', input: 'SlugBuilder', required: true, apiField: 'slug_name' },
            { name: 'title', input: 'TextInput', required: true, apiField: 'heading_en' },
            { name: 'titleHi', input: 'TextInput', required: false, apiField: 'heading_hi' },
            { name: 'products', input: 'ProductListInput', required: true, apiField: 'product_list', maxItems: 200 },
            { name: 'background_media', input: 'ImageUpload', required: false, apiField: 'background_multimedia', maxSizeKB: 300 },
            { name: 'background_video', input: 'UrlInput', required: false, apiField: 'background_multimedia' },
            { name: 'view_all_link', input: 'TextInput', required: false, apiField: 'view_all_action_params', condition: 'non-optimized only' },
            { name: 'rows', input: 'PillSelector', required: true, apiField: null, note: 'Determines widget_type' },
            { name: 'is_optimized', input: 'CardToggle', required: true, apiField: null, note: 'Determines widget_type' },
            { name: 'start_time', input: 'DateTimeInput', required: true, apiField: 'start_time' },
            { name: 'end_time', input: 'DateTimeInput', required: true, apiField: 'end_time' },
        ],
        stateWiseProducts: {
            global: { slugSuffix: '_sc_wi_global', levelTag: 'global', levelProperty: 'global' },
            jh: { slugSuffix: '_sc_wi_jh', levelTag: 'state', levelProperty: 'jharkhand' },
            cg: { slugSuffix: '_sc_wi_cg', levelTag: 'state', levelProperty: 'chhattisgarh' },
            wb: { slugSuffix: '_sc_wi_wb', levelTag: 'state', levelProperty: 'west bengal' },
            up: { slugSuffix: '_sc_wi_up', levelTag: 'state', levelProperty: 'uttar pradesh' },
            patna: { slugSuffix: '_sc_wi_patna', levelTag: 'state', levelProperty: 'patna' },
            // Dynamic states added via "Add State" button
        },
        advancedSettings: [
            { name: 'oos_product_count', input: 'NumberInput', apiField: 'app_configurations.oos_product_count' },
            { name: 'show_pb_tag', input: 'ToggleInput', apiField: 'app_configurations.show_pb_tag' },
            { name: 'pb_reorder', input: 'ToggleInput', apiField: 'app_configurations.pb_reorder' },
            { name: 'filter_dict', input: 'JsonInput', apiField: 'filter_dict' },
            { name: 'app_configurations', input: 'JsonInput', apiField: 'app_configurations' },
        ],
    },

    // ── Carousel Widget (Collection Banner — Scroll) ──
    carousel: {
        editor: 'LegacyPropertyEditor',
        fields: [
            { name: 'slug', input: 'TextInput', required: true, apiField: 'slug_name' },
            { name: 'title', input: 'TextInput', required: true, apiField: 'heading_en' },
            { name: 'titleHi', input: 'TextInput', required: false, apiField: 'heading_hi' },
            { name: 'media_number', input: 'NumberInput', required: true, apiField: 'media_number' },
            { name: 'start_time', input: 'DateTimeInput', required: true, apiField: 'start_time' },
            { name: 'end_time', input: 'DateTimeInput', required: true, apiField: 'end_time' },
        ],
        perItem: [
            { name: 'image', input: 'ImageUpload', required: true, apiField: 'media_en' },
            { name: 'text_en', input: 'TextInput', required: false, apiField: 'text_en' },
            { name: 'text_hi', input: 'TextInput', required: false, apiField: 'text_hi' },
            { name: 'pageType', input: 'Dropdown', required: true, apiField: 'click_action_params.page_type' },
            { name: 'pageLayoutSlug', input: 'TextInput', required: true, apiField: 'click_action_params.page_layout_slug_name' },
            { name: 'products_global', input: 'ProductCodes', required: true, apiField: 'product_list' },
            // Dynamic state products via "+ Add State" button
        ],
    },

    // ── Category Grid (Collection Banner — Stick) ──
    category_grid: {
        editor: 'LegacyPropertyEditor',
        fields: [
            { name: 'slug', input: 'TextInput', required: true, apiField: 'slug_name' },
            { name: 'title', input: 'TextInput', required: true, apiField: 'heading' },
            { name: 'titleHi', input: 'TextInput', required: false, apiField: 'heading_hi' },
            { name: 'start_time', input: 'DateTimeInput', required: true, apiField: 'start_time' },
            { name: 'end_time', input: 'DateTimeInput', required: true, apiField: 'end_time' },
        ],
        perItem: [
            { name: 'categoryName', input: 'TextInput', required: true, apiField: 'text_en' },
            { name: 'categoryNameHi', input: 'TextInput', required: false, apiField: 'text_hi' },
            { name: 'image', input: 'ImageUpload', required: true, apiField: 'media_en' },
            { name: 'pageType', input: 'Dropdown', required: true, apiField: 'click_action_params.page_type' },
        ],
        perSubCategory: [
            { name: 'name', input: 'TextInput', required: true, apiField: 'text_en' },
            { name: 'nameHi', input: 'TextInput', required: false, apiField: 'text_hi' },
            { name: 'image', input: 'ImageUpload', required: false, apiField: 'media_en' },
            { name: 'products_global', input: 'ProductCodes', required: true, apiField: 'product_list' },
            // Dynamic state products via "+ Add State" button
        ],
    },

    // ── Secondary Masthead ──
    secondary_masthead: {
        editor: 'HeaderConfiguration',
        fields: [
            { name: 'slug', input: 'TextInput', required: true, apiField: 'slug_name' },
            { name: 'title', input: 'TextInput', required: true, apiField: 'heading' },
            { name: 'titleHi', input: 'TextInput', required: false, apiField: 'heading_hi' },
            { name: 'media_aspect_ratio', input: 'Dropdown', required: true, apiField: 'media_aspect_ratio', options: ['4', '3', '2', '1'] },
            { name: 'background_multimedia', input: 'FileUpload', required: false, apiField: 'background_multimedia' },
            { name: 'start_time', input: 'DateTimeInput', required: true, apiField: 'start_time' },
            { name: 'end_time', input: 'DateTimeInput', required: true, apiField: 'end_time' },
        ],
        perItem: [
            { name: 'text_en', input: 'TextInput', required: true, apiField: 'text_en' },
            { name: 'text_hi', input: 'TextInput', required: false, apiField: 'text_hi' },
            { name: 'image', input: 'ImageUpload', required: true, apiField: 'media_en' },
            { name: 'redirectLink', input: 'TextInput', required: true, apiField: 'click_action_params.page_layout_slug_name' },
            { name: 'pageType', input: 'Dropdown', required: true, apiField: 'click_action_params.page_type' },
        ],
        perSubCategory: [
            { name: 'name', input: 'TextInput', required: true, apiField: 'text_en' },
            { name: 'products_global', input: 'ProductCodes', required: true, apiField: 'product_list' },
            // Dynamic state products
        ],
    },

    // ── Primary Masthead ──
    primary_masthead: {
        editor: 'HeaderConfiguration',
        fields: [
            { name: 'slug', input: 'TextInput', required: true, apiField: 'slug_name' },
            { name: 'master_key', input: 'TextInput', required: true, apiField: 'master_key' },
            { name: 'end_time', input: 'DateTimeInput', required: true, apiField: 'end_time' },
            { name: 'multimedia_type', input: 'Dropdown', required: false, apiField: 'background_multimedia.type', options: ['1', '2', '3'] },
            { name: 'multimedia_file', input: 'FileUpload', required: false, apiField: 'background_multimedia.value' },
            { name: 'aspect_ratio', input: 'NumberInput', required: false, apiField: 'multimedia.aspect_ratio' },
            { name: 'transition_color', input: 'ColorPicker', required: false, apiField: 'multimedia.transition_color' },
            { name: 'accent_color', input: 'ColorPicker', required: false, apiField: 'multimedia.accent_color' },
            { name: 'text_color', input: 'ColorPicker', required: false, apiField: 'multimedia.text_color' },
            { name: 'icon_bg_color', input: 'ColorPicker', required: false, apiField: 'multimedia.icon_bg_color' },
            { name: 'is_dark', input: 'ToggleInput', required: false, apiField: 'multimedia.is_multimedia_dark' },
        ],
    },

    // ── Product Listing Page (CLP) ──
    product_listing: {
        editor: 'LegacyPropertyEditor',
        fields: [
            { name: 'slug', input: 'TextInput', required: true, apiField: 'slug_name' },
            { name: 'title', input: 'TextInput', required: true, apiField: 'text_en' },
            { name: 'titleHi', input: 'TextInput', required: false, apiField: 'text_hi' },
            { name: 'products', input: 'ProductCodes', required: true, apiField: 'product_list' },
            { name: 'image', input: 'ImageUpload', required: true, apiField: 'media_en' },
            { name: 'media_aspect_ratio', input: 'NumberInput', required: true, apiField: 'media_aspect_ratio' },
            { name: 'start_time', input: 'DateTimeInput', required: true, apiField: 'start_time' },
            { name: 'end_time', input: 'DateTimeInput', required: true, apiField: 'end_time' },
            { name: 'pageType', input: 'Dropdown', required: true, apiField: 'page_type' },
        ],
    },
};

// ── Page Status Workflow ──
export const PAGE_STATUS = {
    DRAFT: { label: 'Draft', canEdit: true, canSubmit: true, canApprove: false, who: 'Maker' },
    PENDING: { label: 'Pending', canEdit: false, canSubmit: false, canApprove: true, who: 'Checker' },
    APPROVED: { label: 'Approved', canEdit: false, canSubmit: false, canApprove: false, who: null },
    REJECTED: { label: 'Rejected', canEdit: true, canSubmit: true, canApprove: false, who: 'Maker' },
};

// ── Error Messages ──
export const ERROR_MESSAGES = {
    emptySlug: 'Please enter a slug name',
    notFound: (slug) => `Widget not found with slug: ${slug}`,
    networkError: (msg) => `Failed to fetch widget: ${msg}`,
    editBlocked: 'Cannot edit while in review or approved',
    submitFailed: 'Failed to submit to sheet',
    approveFailed: (msg) => `Failed to trigger automation: ${msg}`,
};

// ── Related Files ──
export const RELATED_FILES = {
    fetchComponent: 'src/components/FetchWidget.jsx',
    sidebar: 'src/components/Sidebar/Sidebar.jsx',
    propertyEditor: 'src/components/Sidebar/PropertyEditor.jsx',
    legacyPropertyEditor: 'src/components/Sidebar/LegacyPropertyEditor.jsx',
    headerConfiguration: 'src/components/Sidebar/HeaderConfiguration.jsx',
    widgetContext: 'src/context/WidgetContext.jsx',
    productRailConfig: 'src/config/widgets/SPRConfig.js',
    widgetRegistry: 'src/config/WidgetRegistry.js',
    widgetRenderer: 'src/components/Widgets/WidgetRenderer.jsx',
    localApiService: 'src/services/LocalApiService.js',
    backendSyncService: 'src/services/BackendSyncService.js',
    widgetApiService: 'src/services/WidgetApiService.js',
};
