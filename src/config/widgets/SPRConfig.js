/**
 * Single Product Row (SPR) Configuration — Source of Truth
 *
 * Captures SPR-specific details:
 * 1. Page Type Selection (product_listing_page / category_page)
 * 2. Variant Matrix (4 SPR variants: is_optimized x has_multimedia)
 * 3. Deploy Strategies (Standard / Optimized with dual-flow PLP ecosystem)
 * 4. State-Based Location Mapping (Optimized variant)
 * 5. Slug Patterns (Standard + Optimized)
 * 6. Navigation ("View All" link to PLP page)
 *
 * Wiki Reference: wiki/Widget-spr.md
 *
 * Note: SPR is a subset of the Product Rail family (rows=1).
 * See ProductRailConfig.js for the full 8-variant Product Rail config (Single + Double rows).
 */

import { STATE_DEFINITIONS } from './MastheadConfig';

export const SPRConfig = {
    // ── Identity ──
    type: 'single_product_row',
    label: 'Single Product Row',
    icon: 'LayoutGrid',
    description: 'Horizontal scrollable row of product cards with "View All" link to a PLP page. Resolves into 4 backend variants based on Optimized and Multimedia properties.',
    parentConfig: 'ProductRailConfig', // SPR is rows=1 subset of Product Rail

    // ── PNC Properties ──
    properties: {
        is_optimized: {
            type: 'boolean',
            default: true,
            label: 'Optimized Rendering',
            description: 'Creates PLP ecosystem with state-wise sub-categories',
            ui: 'card',
        },
        // has_multimedia is IMPLICIT from background_media presence
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

    // ── Variant Resolution Matrix ──
    variantMatrix: [
        { is_optimized: false, has_multimedia: false, widgetType: 'single_product_row' },
        { is_optimized: true, has_multimedia: false, widgetType: 'single_product_row_v2' },
        { is_optimized: false, has_multimedia: true, widgetType: 'multimedia_single_product_row' },
        { is_optimized: true, has_multimedia: true, widgetType: 'multimedia_single_product_row_v2' },
    ],

    // ── Multimedia Constraint ──
    // single_product_row and single_product_row_v2 IGNORE background_multimedia.
    // Only multimedia_* variants render backgrounds.
    multimediaConstraint: {
        ignoredBy: ['single_product_row', 'single_product_row_v2'],
        renderedBy: ['multimedia_single_product_row', 'multimedia_single_product_row_v2'],
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
            validation: { required: true, minLength: 2, maxLength: 200 },
            errorMessage: 'Title is required (2-200 chars)',
        },
        {
            name: 'titleHi',
            component: 'TextInput',
            label: 'Title (Hindi)',
            validation: { required: false },
        },
        {
            name: 'products',
            component: 'ProductListInput',
            label: 'Products',
            helperText: 'Enter Item Codes to fetch details',
            validation: {
                required: true,
                minItems: 1,
                maxItems: 200,
                itemValidator: (code) => /^\d+$/.test(code),
            },
            errorMessage: 'At least 1 valid product code required (max 200)',
        },
        {
            name: 'background_media',
            component: 'ImageUpload',
            label: 'Background Media',
            helperText: 'Upload image to enable multimedia mode',
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
            validation: {
                required: false,
                pattern: /^https?:\/\/.+\.(mp4|mov|webm)$/i,
            },
            errorMessage: 'Must be a valid video URL (.mp4, .mov, .webm)',
        },
        {
            name: 'view_all_link',
            component: 'TextInput',
            label: 'View All Page Slug',
            placeholder: 'Optional override',
            condition: (pnc) => !pnc.is_optimized,
            validation: {
                required: false,
                pattern: /^[a-z0-9_-]*$/,
            },
            errorMessage: 'Slug must be lowercase alphanumeric',
        },
    ],

    // ── Supported Filters ──
    // Universal across all 4 SPR variants — handled by WidgetItemHelper / PageViewUtils
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
        // ── STANDARD (single_product_row / multimedia_single_product_row) ──
        STANDARD: {
            description: 'Standard SPR — Page Layout → Widget Item → Widget → Mappings',
            condition: (pnc) => !pnc.is_optimized,
            steps: [
                // Step 1: Page Layout
                {
                    entity: 'page_layout',
                    endpoint: '/api/app/post_page_layout/',
                    slugSuffix: '_page',
                    type: 'json',
                    fieldMap: {
                        slug_name: '$slug',
                        page_heading: '$title',
                        page_layout_type: '2',
                        page_type: '$selectedPageType', // user-selected: product_listing_page or category_page
                    },
                },
                // Step 2: Widget Item (item_rows)
                {
                    entity: 'widget_item',
                    endpoint: '/api/app/post_widget_item/',
                    slugSuffix: '_wi',
                    type: 'multipart',
                    fieldMap: {
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
                },
                // Step 3: Widget (SPR)
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
                        view_all_action_params: '$viewAllParams', // {"page_type":"...","page_layout_slug_name":"..."}
                        start_time: '$startTime',
                        end_time: '$endTime',
                        background_multimedia: '$backgroundMultimediaSlug',
                        media_aspect_ratio: '1',
                        filter_dict: '$filterDict',
                        app_configurations: '$appConfigurations',
                    },
                },
                // Step 4: Map Widget Item → Widget
                { action: 'map_widget_item', parentSlugSuffix: '_spr', childSlugSuffix: '_wi' },
                // Step 5: Map Widget → Page Layout
                { action: 'map_layout_widget', parentSlugSuffix: '_page', childSlugSuffix: '_spr' },
            ],
        },

        // ── OPTIMIZED (single_product_row_v2 / multimedia_single_product_row_v2) ──
        OPTIMIZED: {
            description: 'Optimized SPR — Dual-flow: PLP Ecosystem + Home Row',
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
            page_layout_slug_name: '$pageLayoutSlug', // {base}_page (standard) or {base}_page_p (optimized)
        },
    },

    // ── Slug Patterns ──
    slugPatterns: {
        standard: {
            pageLayout: '{base}_page',
            widgetItem: '{base}_wi',
            widget: '{base}_spr',
            example: {
                base: 'rice_mela_rail',
                pageLayout: 'rice_mela_rail_page',
                widgetItem: 'rice_mela_rail_wi',
                widget: 'rice_mela_rail_spr',
            },
        },
        optimized: {
            subCategoryGlobal: '{base}_sc_wi_global',
            subCategoryState: '{base}_sc_wi_{state_key}',
            plpWidget: '{base}_plp_w',
            pageLayout: '{base}_page_p',
            rowWidgetItem: '{base}_pr_wi',
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

    // ── State Mapping (Optimized only) ──
    // Creates one sub-category widget item per state for location-specific product lists
    stateMapping: {
        appliesTo: 'optimized',
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
        component: 'ProductRail',
        previewMaxProducts: 10,
    },

    // ── Initial State ──
    initialState: {
        type: 'product_rail',
        title: 'New Collection',
        products: [],
        pageType: 'product_listing_page',
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
