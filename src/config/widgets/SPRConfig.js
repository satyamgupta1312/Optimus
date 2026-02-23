/**
 * Product Rail Configuration — Source of Truth (SPR + DPR)
 *
 * Unified config for ALL Product Rail variants:
 * - Single Product Row (SPR): rows=1, 4 variants
 * - Double Product Row (DPR): rows=2, 4 variants
 * - Total: 8 backend variants (rows × is_optimized × has_multimedia)
 *
 * Covers:
 * 1. Variant Resolution (PNC → backend widget_type)
 * 2. Page Type Selection (product_listing_page / category_page)
 * 3. Deploy Strategies (ALL variants use dual-flow: PLP ecosystem + Home Row)
 * 4. State-Based Location Mapping (ALL variants — state-wise products always present)
 * 5. Slug Patterns (unified — all variants create PLP ecosystem)
 * 6. Navigation ("View All" link to PLP page)
 *
 * Wiki Reference: wiki/Widget-spr.md
 */

import { STATE_DEFINITIONS } from './MastheadConfig';

export const SPRConfig = {
    // ── Identity ──
    type: 'product_rail',
    label: 'Product Rail',
    icon: 'LayoutGrid',
    description: 'Scrollable product cards with "View All" link. Supports single row (SPR) and double row (DPR). Resolves into 8 backend variants based on Rows, Optimized, and Multimedia.',

    // ── PNC Properties ──
    properties: {
        rows: {
            type: 'number',
            options: [
                { label: 'Single Row', value: 1 },
                { label: 'Double Row', value: 2 },
            ],
            default: 1,
            label: 'Layout',
            ui: 'pills',
        },
        is_optimized: {
            type: 'boolean',
            default: true,
            label: 'Optimized Rendering',
            description: 'Adds _v2 suffix to widget_type for optimized rendering. State-wise products are available in ALL variants.',
            ui: 'card',
        },
        has_multimedia: {
            type: 'boolean',
            default: false,
            label: 'Multimedia Background',
            description: 'Enable background image/video behind the product rail. Variant becomes multimedia_*.',
            ui: 'card',
            disabledWhen: (pnc) => pnc.rows === 2 && !pnc.is_optimized,
            disabledMessage: 'Not available for standard Double Row (use Optimized)',
        },
    },

    // ── Page Type Selection ──
    // User selects per widget — determines "View All" navigation destination
    pageType: {
        component: 'SelectInput',
        label: 'Page Type',
        options: [
            { label: 'Product Listing Page', value: 'product_listing_page', description: 'Flat product grid — all products in a single scrollable list' },
            { label: 'Category Page', value: 'category_page', description: 'Categorized browsing — sub-category tabs/cards for navigation' },
        ],
        default: 'product_listing_page',
        validation: { required: true },
        selectionLevel: 'per_widget', // Same page type for the whole widget
        affects: ['page_layout.page_type', 'view_all_action_params.page_type'],
    },

    // ── Variant Resolution Matrix (8 variants: rows × is_optimized × has_multimedia) ──
    variantMatrix: [
        // SPR (rows=1)
        { rows: 1, is_optimized: false, has_multimedia: false, widgetType: 'single_product_row' },
        { rows: 1, is_optimized: true, has_multimedia: false, widgetType: 'single_product_row_v2' },
        { rows: 1, is_optimized: false, has_multimedia: true, widgetType: 'multimedia_single_product_row' },
        { rows: 1, is_optimized: true, has_multimedia: true, widgetType: 'multimedia_single_product_row_v2' },
        // DPR (rows=2)
        { rows: 2, is_optimized: false, has_multimedia: false, widgetType: 'double_product_row' },
        { rows: 2, is_optimized: true, has_multimedia: false, widgetType: 'double_product_row_v2' },
        { rows: 2, is_optimized: false, has_multimedia: true, widgetType: 'multimedia_double_product_row', available: false },
        { rows: 2, is_optimized: true, has_multimedia: true, widgetType: 'multimedia_double_product_row_v2' },
    ],

    // ── Multimedia Constraint ──
    // Non-multimedia variants IGNORE background_multimedia.
    // Only multimedia_* variants render backgrounds.
    multimediaConstraint: {
        ignoredBy: ['single_product_row', 'single_product_row_v2', 'double_product_row', 'double_product_row_v2'],
        renderedBy: ['multimedia_single_product_row', 'multimedia_single_product_row_v2', 'multimedia_double_product_row', 'multimedia_double_product_row_v2'],
    },

    // ── Form Fields ──
    fields: [
        {
            name: 'pageType',
            component: 'SelectInput',
            label: 'Page Type',
            options: [
                { label: 'Product Listing Page', value: 'product_listing_page' },
                { label: 'Category Page', value: 'category_page' },
            ],
            default: 'product_listing_page',
            validation: { required: true },
        },
        {
            name: 'slug',
            component: 'SlugBuilder',
            label: 'Slug Name',
            placeholder: 'e.g. rice_mela_rail',
            validation: {
                required: true,
                pattern: /^[a-z0-9_]+$/,
                minLength: 3,
                maxLength: 100,
            },
            errorMessage: 'Slug must be lowercase alphanumeric with underscores (3-100 chars)',
        },
        {
            name: 'title',
            component: 'TextInput',
            label: 'Title (English)',
            autoTranslate: true,
            validation: { required: (pnc) => !pnc.has_multimedia, minLength: 2, maxLength: 200 },
            errorMessage: 'Title is required (2-200 chars)',
        },
        {
            name: 'titleHi',
            component: 'TextInput',
            label: 'Title (Hindi)',
            validation: { required: false },
        },
        {
            name: 'stateProducts',
            component: 'StateProductEditor',
            label: 'Products (State-wise)',
            helperText: 'Global is required. Add states for location-specific products.',
            condition: (_pnc, widget) => widget?.pageType !== 'category_page',
            validation: {
                required: (_pnc, widget) => widget?.pageType !== 'category_page',
            },
            errorMessage: 'Global product codes are required',
        },
        {
            name: 'subCategories',
            component: 'SubCategoryList',
            label: 'Sub-Categories',
            helperText: 'Add sub-categories — each with name and state-wise products.',
            condition: (_pnc, widget) => widget?.pageType === 'category_page',
            showImage: true,
            validation: {
                required: (_pnc, widget) => widget?.pageType === 'category_page',
            },
            errorMessage: 'At least one sub-category is required for category pages',
        },
        {
            name: 'homeRowProducts',
            component: 'StateProductEditor',
            label: 'Home Row Product Codes',
            helperText: 'State-wise product codes shown on the Home Page row (item_rows).',
            condition: (_pnc, widget) => widget?.pageType === 'category_page',
            validation: {
                required: true,
            },
        },
        {
            name: 'background_media',
            component: 'ImageUpload',
            label: 'Background Media',
            helperText: 'Upload image for multimedia background',
            condition: (pnc) => pnc.has_multimedia,
            validation: {
                required: false,
                acceptExtensions: ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.svg'],
            },
            errorMessage: 'Must be a supported format (.jpeg, .jpg, .png, .webp, .gif, .svg)',
        },
        {
            name: 'background_video',
            component: 'UrlInput',
            label: 'Background Video URL',
            condition: (pnc) => pnc.has_multimedia,
            validation: {
                required: false,
                pattern: /^https?:\/\/.+\.(mp4|mov|webm)$/i,
            },
            errorMessage: 'Must be a valid video URL (.mp4, .mov, .webm)',
        },
        {
            name: 'view_all_background_color',
            component: 'ColorPicker',
            label: 'View All Background Color',
            default: '#ffffff',
            condition: (pnc) => pnc.has_multimedia,
            validation: { required: false },
        },
        {
            name: 'view_all_color',
            component: 'ColorPicker',
            label: 'View All Text Color',
            default: '#000000',
            condition: (pnc) => pnc.has_multimedia,
            validation: { required: false },
        },
        {
            name: 'view_all_link',
            component: 'TextInput',
            label: 'View All Page Slug',
            placeholder: 'Optional override',
            condition: (pnc, widget) => !pnc.is_optimized && widget?.pageType !== 'category_page',
            validation: {
                required: false,
                pattern: /^[a-z0-9_-]*$/,
            },
            errorMessage: 'Slug must be lowercase alphanumeric',
        },
        {
            name: 'start_time',
            component: 'DateTimeInput',
            label: 'Start Date & Time',
            validation: { required: true },
            errorMessage: 'Start time is required',
        },
        {
            name: 'end_time',
            component: 'DateTimeInput',
            label: 'End Date & Time',
            validation: { required: true },
            errorMessage: 'End time is required',
        },
    ],

    // ── Supported Filters ──
    // Universal across all 8 variants — handled by WidgetItemHelper / PageViewUtils
    filters: {
        widget: {
            max_order_constraint: { type: 'int', label: 'Max Order Count', component: 'NumberInput', description: 'Show only if user orders <= Y' },
            min_order_constraint: { type: 'int', label: 'Min Order Count', component: 'NumberInput', description: 'Show only if user orders >= X' },
        },
        item: {
            in_stk_item_codes: { type: 'list_of_int', label: 'Mandatory In-Stock Items', component: 'ProductListInput' },
        },
        product: {
            category: { operators: ['in', 'equal'], component: 'TextInput' },
            sub_category: { operators: ['in', 'equal'], component: 'TextInput' },
            mrp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput' },
            sp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput' },
            discount: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput' },
        },
    },

    // ── App Configurations ──
    appConfigurations: {
        allow_android: { type: 'boolean', default: true, component: 'ToggleInput' },
        allow_ios: { type: 'boolean', default: true, component: 'ToggleInput' },
        min_android_version: { type: 'version', component: 'VersionInput' },
        max_android_version: { type: 'version', component: 'VersionInput' },
        min_ios_version: { type: 'version', component: 'VersionInput' },
        max_ios_version: { type: 'version', component: 'VersionInput' },
    },

    // ── Widget Item Additional Properties ──
    additionalProperties: {
        oos_product_count: { type: 'int', default: 0, label: 'OOS Product Count', component: 'NumberInput', description: 'OOS products appended at end' },
        show_pb_tag: { type: 'boolean', default: true, label: 'Show PB Tag', component: 'ToggleInput', description: 'Show "Previously Bought" tag' },
        pb_reorder: { type: 'boolean', default: true, label: 'PB Reorder', component: 'ToggleInput', description: 'Re-sort PB items first' },
    },

    // ── Deploy Strategies ──
    deployStrategies: {
        // ── STANDARD (single_product_row / multimedia_single_product_row — NO _v2 suffix) ──
        // Same dual-flow as OPTIMIZED. State-wise products in ALL variants.
        // Only difference: widget slug suffix (_spr instead of _spr_opt) and widget_type (no _v2).
        STANDARD: {
            description: 'Standard SPR — Dual-flow: PLP Ecosystem (state-wise) + Home Row',
            condition: (pnc) => !pnc.is_optimized,
            steps: [
                // === Flow 1: PLP Ecosystem (state-wise — same as OPTIMIZED) ===
                // Step 1: Sub-Category Widget Item (per state — location-wise)
                {
                    entity: 'widget_item',
                    endpoint: '/api/app/post_widget_item/',
                    slugSuffix: '_sc_wi',
                    type: 'multipart',
                    iterateStates: true,
                    fieldMap: {
                        slug_name: '$slug',
                        item_type: 'sub_category',
                        text_en: '$title',
                        text_hi: '$titleHi',
                        product_list: '$stateProductCodes',
                        filter_lst: '$inStockFilter',
                        item_click_action: 'deal-detail-redirect',
                        is_clickable: 'yes',
                        deactivated_flag: 'no',
                        start_time: '$startTime',
                        end_time: '$endTime',
                    },
                },
                // Step 2: PLP Widget
                {
                    entity: 'widget',
                    endpoint: '/api/app/widget/',
                    slugSuffix: '_plp_w',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        widget_type: 'product_listing',
                        heading: '$title',
                        heading_en: '$title',
                        start_time: '$startTime',
                        end_time: '$endTime',
                        app_configurations: '$plpAppConfig',
                    },
                },
                // Step 3: Page Layout
                {
                    entity: 'page_layout',
                    endpoint: '/api/app/post_page_layout/',
                    slugSuffix: '_page_p',
                    type: 'json',
                    fieldMap: {
                        slug_name: '$slug',
                        page_heading: '$title',
                        page_layout_type: '2',
                        page_type: '$selectedPageType',
                    },
                },
                // Step 4: Map Sub-Cat → PLP Widget (location-wise CSV)
                {
                    action: 'map_widget_item',
                    parentSlugSuffix: '_plp_w',
                    childPattern: '_sc_wi_{state}',
                    mappingFields: {
                        level_tag: '$stateLevelTag',
                        level_property: '$stateLevelProperty',
                        priority: '$statePriority',
                    },
                },
                // Step 5: Map PLP Widget → Page Layout
                { action: 'map_layout_widget', parentSlugSuffix: '_page_p', childSlugSuffix: '_plp_w' },
                // Step 6: Map Page Layout → Global Registry
                { action: 'map_page_layout', parentSlugSuffix: '_page_p' },

                // === Flow 2: Home Row ===
                // Step 7: Row Widget Item (item_rows)
                {
                    entity: 'widget_item',
                    endpoint: '/api/app/post_widget_item/',
                    slugSuffix: '_pr_wi',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        item_type: 'item_rows',
                        product_list: '$productCodes',
                        filter_lst: '$inStockFilter',
                        start_time: '$startTime',
                        end_time: '$endTime',
                    },
                },
                // Step 8: Homepage Widget (Standard — no _v2 suffix)
                {
                    entity: 'widget',
                    endpoint: '/api/app/widget/',
                    slugSuffix: '_spr',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        widget_type: '$resolvedWidgetType',
                        heading_en: '$title',
                        heading_hi: '$titleHi',
                        view_all_action_name: 'redirect-to-page',
                        view_all_action_params: '$viewAllParams',
                        start_time: '$startTime',
                        end_time: '$endTime',
                        background_multimedia: '$backgroundMultimediaSlug',
                        media_aspect_ratio: '1',
                        filter_dict: '$filterDict',
                        app_configurations: '$appConfigurations',
                    },
                },
                // Step 9: Map Row Item → Homepage Widget
                { action: 'map_widget_item', parentSlugSuffix: '_spr', childSlugSuffix: '_pr_wi' },
            ],
        },

        // ── OPTIMIZED (single_product_row_v2 / multimedia_single_product_row_v2 — _v2 suffix) ──
        OPTIMIZED: {
            description: 'Optimized SPR — Dual-flow: PLP Ecosystem (state-wise) + Home Row',
            condition: (pnc) => pnc.is_optimized,
            steps: [
                // === Flow 1: PLP Ecosystem ===
                // Step 1: Sub-Category Widget Item (per state — location-wise)
                {
                    entity: 'widget_item',
                    endpoint: '/api/app/post_widget_item/',
                    slugSuffix: '_sc_wi',
                    type: 'multipart',
                    iterateStates: true,
                    fieldMap: {
                        slug_name: '$slug',
                        item_type: 'sub_category',
                        text_en: '$title',
                        text_hi: '$titleHi',
                        product_list: '$stateProductCodes',
                        filter_lst: '$inStockFilter',
                        item_click_action: 'deal-detail-redirect',
                        is_clickable: 'yes',
                        deactivated_flag: 'no',
                        start_time: '$startTime',
                        end_time: '$endTime',
                    },
                },
                // Step 2: PLP Widget
                {
                    entity: 'widget',
                    endpoint: '/api/app/widget/',
                    slugSuffix: '_plp_w',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        widget_type: 'product_listing',
                        heading: '$title',
                        heading_en: '$title',
                        start_time: '$startTime',
                        end_time: '$endTime',
                        app_configurations: '$plpAppConfig',
                    },
                },
                // Step 3: Page Layout
                {
                    entity: 'page_layout',
                    endpoint: '/api/app/post_page_layout/',
                    slugSuffix: '_page_p',
                    type: 'json',
                    fieldMap: {
                        slug_name: '$slug',
                        page_heading: '$title',
                        page_layout_type: '2',
                        page_type: '$selectedPageType',
                    },
                },
                // Step 4: Map Sub-Cat → PLP Widget (location-wise CSV)
                {
                    action: 'map_widget_item',
                    parentSlugSuffix: '_plp_w',
                    childPattern: '_sc_wi_{state}',
                    mappingFields: {
                        level_tag: '$stateLevelTag',
                        level_property: '$stateLevelProperty',
                        priority: '$statePriority',
                    },
                },
                // Step 5: Map PLP Widget → Page Layout
                { action: 'map_layout_widget', parentSlugSuffix: '_page_p', childSlugSuffix: '_plp_w' },
                // Step 6: Map Page Layout → Global Registry
                { action: 'map_page_layout', parentSlugSuffix: '_page_p' },

                // === Flow 2: Home Row ===
                // Step 7: Row Widget Item (item_rows)
                {
                    entity: 'widget_item',
                    endpoint: '/api/app/post_widget_item/',
                    slugSuffix: '_pr_wi',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        item_type: 'item_rows',
                        product_list: '$productCodes',
                        filter_lst: '$inStockFilter',
                        start_time: '$startTime',
                        end_time: '$endTime',
                    },
                },
                // Step 8: SPR V2 Widget
                {
                    entity: 'widget',
                    endpoint: '/api/app/widget/',
                    slugSuffix: '_spr_opt',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        widget_type: '$resolvedWidgetType',
                        heading_en: '$title',
                        heading_hi: '$titleHi',
                        view_all_action_name: 'redirect-to-page',
                        view_all_action_params: '$viewAllParams',
                        start_time: '$startTime',
                        end_time: '$endTime',
                        background_multimedia: '$backgroundMultimediaSlug',
                        media_aspect_ratio: '1',
                        filter_dict: '$filterDict',
                        app_configurations: '$appConfigurations',
                    },
                },
                // Step 9: Map Row Item → SPR V2 Widget
                { action: 'map_widget_item', parentSlugSuffix: '_spr_opt', childSlugSuffix: '_pr_wi' },
            ],
        },
    },

    // ── Navigation — "View All" Link ──
    navigation: {
        mechanism: 'view_all_action_params',
        actionName: 'redirect-to-page',
        paramsShape: {
            page_type: '$selectedPageType', // "product_listing_page" or "category_page"
            page_layout_slug_name: '$pageLayoutSlug', // {base}_page_p (all variants)
        },
    },

    // ── Slug Patterns (unified — ALL variants create PLP ecosystem) ──
    slugPatterns: {
        // Both Standard and Optimized use the same PLP ecosystem slugs.
        // Only the homepage widget slug differs: _spr (Standard) vs _spr_opt (Optimized).
        common: {
            subCategoryGlobal: '{base}_sc_wi_global',
            subCategoryState: '{base}_sc_wi_{state_key}',
            plpWidget: '{base}_plp_w',
            pageLayout: '{base}_page_p',
            rowWidgetItem: '{base}_pr_wi',
        },
        standard: {
            widget: '{base}_spr',
            example: {
                base: 'rice_mela_rail',
                subCategoryGlobal: 'rice_mela_rail_sc_wi_global',
                subCategoryJH: 'rice_mela_rail_sc_wi_jh',
                plpWidget: 'rice_mela_rail_plp_w',
                pageLayout: 'rice_mela_rail_page_p',
                rowWidgetItem: 'rice_mela_rail_pr_wi',
                widget: 'rice_mela_rail_spr',
            },
        },
        optimized: {
            widget: '{base}_spr_opt',
            example: {
                base: 'rice_mela_rail',
                subCategoryGlobal: 'rice_mela_rail_sc_wi_global',
                subCategoryJH: 'rice_mela_rail_sc_wi_jh',
                plpWidget: 'rice_mela_rail_plp_w',
                pageLayout: 'rice_mela_rail_page_p',
                rowWidgetItem: 'rice_mela_rail_pr_wi',
                widget: 'rice_mela_rail_spr_opt',
            },
        },
    },

    // ── State Mapping (ALL variants) ──
    // Creates one sub-category widget item per state for location-specific product lists
    stateMapping: {
        appliesTo: 'all', // State-wise products in ALL variants — Standard and Optimized
        globalRequired: true,
        dynamicStates: true, // User adds via "+ Add State" button
        csvFormat: {
            headers: ['widget_item_slug_name', 'level_tag', 'level_property', 'priority', 'cohort'],
            globalAlwaysPriority1: true,
        },
    },
    stateDefinitions: STATE_DEFINITIONS,

    // ── Rendering ──
    rendering: {
        component: 'SingleProductRow', // Handles all 8 variants (SPR + DPR)
        previewMaxProducts: 10,
    },

    // ── Initial State ──
    initialState: {
        type: 'product_rail',
        title: '',
        stateProducts: { global: '' },
        subCategories: [],
        homeRowProducts: { global: '' },
        pageType: 'product_listing_page',
        expandPage: false,
        plpWidgets: [],
        view_all_background_color: '#ffffff',
        view_all_color: '#000000',
        start_time: '',
        end_time: '',
        pnc: { rows: 1, is_optimized: true, has_multimedia: false },
    },

    // ── API Endpoints ──
    endpoints: {
        createPageLayout: { url: '/api/app/post_page_layout/', type: 'json' },
        createWidgetItem: { url: '/api/app/post_widget_item/', type: 'multipart' },
        createWidget: { url: '/api/app/widget/', type: 'multipart' },
        mapWidgetItem: { url: '/api/app/update_widget_widget_item_mapping/', type: 'csv' },
        mapLayoutWidget: { url: '/api/app/update_layout_widget_mapping/', type: 'csv' },
        mapPageLayout: { url: '/api/app/update_page_page_layout_mapping/', type: 'csv' },
    },
};
