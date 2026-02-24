/**
 * Collection Banner Configuration — Source of Truth
 *
 * This config drives both Scroll (Carousel) and Stick (Category Grid) modes:
 * 1. Variant Resolution (Scroll → carousel, Stick → category)
 * 2. Property Editor (fields, validation, component rendering)
 * 3. API Payload Generation (deploy strategies — bottom-up creation for both modes)
 * 4. Pre-deploy Validation (required fields, product constraints)
 * 5. Widget Rendering (component hint)
 *
 * Wiki Reference: wiki/WIDGET-Collection-Banner.md
 *
 * Key Architecture:
 * - Both modes create the same underlying PLP ecosystem (sub-category → PLP widget → page layout)
 * - Both modes support dynamic state-based product mapping via "Add State" button
 * - Page type (category_page / product_listing_page) is selected PER ITEM in both modes
 * - No multimedia background — unlike Masthead, this widget has no background media
 */

import { STATE_DEFINITIONS } from './MastheadConfig';

export const CollectionBannerConfig = {
    // ── Identity ──
    type: 'collection_banner',
    label: 'Collection Banner',
    icon: 'LayoutList',
    description: 'Scroll mode shows horizontal carousel banners; Stick mode shows a 4-column category grid. Both navigate to PLP/category pages.',

    // ── PNC Properties (define the display mode) ──
    properties: {
        displayMode: {
            type: 'string',
            options: ['scroll', 'stick'],
            default: 'scroll',
            label: 'Display Mode',
            ui: 'pills',
        },
    },

    // ── Variant Resolution Matrix ──
    variantMatrix: [
        { displayMode: 'scroll', widgetType: 'carousel' },
        { displayMode: 'stick', widgetType: 'category' },
    ],

    // ── Form Fields ──
    fields: [
        // ── Common Fields (both modes) ──
        {
            name: 'slug',
            component: 'SlugBuilder',
            label: 'Slug Name',
            placeholder: 'e.g. summer_sale',
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
            condition: (pnc) => pnc.displayMode === 'stick',
            validation: { required: false },
        },

        // ── Date/Time Fields (both modes) ──
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

        // ── Scroll Mode Only ──
        {
            name: 'media_number',
            component: 'TextInput',
            label: 'Media Number',
            placeholder: 'e.g. 3.5',
            helperText: 'Decimal value controls visible items (e.g. 3.5 = 3 full + half peek of 4th)',
            condition: (pnc) => pnc.displayMode === 'scroll',
            validation: {
                required: false,
                pattern: /^\d+(\.\d+)?$/,
            },
            errorMessage: 'Must be a number (e.g. 3, 3.5, 4.4)',
        },
        {
            name: 'scrollItems',
            component: 'ScrollItemEditor',
            label: 'Carousel Items',
            helperText: 'Add banner items with images and product lists',
            condition: (pnc) => pnc.displayMode === 'scroll',
            validation: {
                required: true,
                minItems: 1,
                maxItems: 50,
            },
            errorMessage: 'At least 1 carousel item is required',
            // Nested schema for each scroll/carousel item
            itemSchema: {
                pageHeading: {
                    component: 'TextInput',
                    label: 'Page Heading',
                    helperText: 'Heading shown on the destination PLP/category page (not the banner label)',
                    validation: { required: true, minLength: 1, maxLength: 200 },
                },
                image: {
                    component: 'ImageUpload',
                    label: 'Banner Image',
                    helperText: 'Max 300KB. Uploaded to local server for persistence.',
                    validation: { required: true, maxSizeKB: 300 },
                    errorMessage: 'Image must be under 300KB',
                },
                pageType: {
                    component: 'PillSelector',
                    label: 'Page Type',
                    options: [
                        { label: 'Product Listing', value: 'product_listing_page' },
                        { label: 'Category Page', value: 'category_page' },
                    ],
                    default: 'product_listing_page',
                    validation: { required: true },
                },
                // State-wise products — no separate productIds field
                // products.global is required; additional states are optional
                stateProducts: {
                    label: 'State-Wise Products',
                    helperText: 'Global is required. Add states for location-specific products.',
                    global: {
                        component: 'TextInput',
                        label: 'Global Products',
                        helperText: 'Comma-separated item codes (required)',
                        validation: {
                            required: true,
                            pattern: /^(\d+)(,\s*\d+)*$/,
                        },
                        errorMessage: 'Enter comma-separated numeric product codes',
                    },
                    // Dynamic state entries via "Add State" button
                },
            },
        },

        // ── Stick Mode Only ──
        {
            name: 'categoryItems',
            component: 'CategoryItemEditor',
            label: 'Category Items',
            helperText: 'Add category cards with sub-categories and state-wise products',
            condition: (pnc) => pnc.displayMode === 'stick',
            validation: {
                required: true,
                minItems: 1,
                maxItems: 20,
            },
            errorMessage: 'At least 1 category item is required',
            // Nested schema for each category item
            itemSchema: {
                text: {
                    component: 'TextInput',
                    label: 'Category Name (English)',
                    validation: { required: true, minLength: 1, maxLength: 200 },
                },
                textHi: {
                    component: 'TextInput',
                    label: 'Category Name (Hindi)',
                    validation: { required: false },
                },
                image: {
                    component: 'ImageUpload',
                    label: 'Category Image',
                    helperText: 'Max 300KB',
                    validation: { required: true, maxSizeKB: 300 },
                    errorMessage: 'Image must be under 300KB',
                },
                pageType: {
                    component: 'PillSelector',
                    label: 'Page Type',
                    options: [
                        { label: 'Category Page', value: 'category_page' },
                        { label: 'Product Listing', value: 'product_listing_page' },
                    ],
                    default: 'category_page',
                    validation: { required: true },
                },

                subCategories: {
                    label: 'Sub-Categories',
                    condition: (pnc, widget, item) => item?.pageType !== 'product_listing_page',
                    validation: {
                        required: (pnc, widget, item) => item?.pageType !== 'product_listing_page',
                        minItems: 1,
                        maxItems: 50
                    },
                    itemSchema: {
                        name: {
                            component: 'TextInput',
                            label: 'Sub-Category Name (English)',
                            validation: { required: true },
                        },
                        nameHi: {
                            component: 'TextInput',
                            label: 'Sub-Category Name (Hindi)',
                            validation: { required: false },
                        },
                        image: {
                            component: 'ImageUpload',
                            label: 'Sub-Category Image',
                            helperText: 'Max 50KB',
                            validation: { required: false, maxSizeKB: 50 },
                            errorMessage: 'Image must be under 50KB',
                        },
                        // products.global is required; additional state products are dynamic
                        products: {
                            global: {
                                component: 'TextInput',
                                label: 'Global Products',
                                helperText: 'Comma-separated item codes',
                                validation: {
                                    required: true,
                                    pattern: /^(\d+)(,\s*\d+)*$/,
                                },
                                errorMessage: 'Enter comma-separated numeric product codes',
                            },
                            // Dynamic state entries added via "Add State" button
                        },
                    },
                },
                stateProducts: {
                    label: 'State-Wise Products',
                    condition: (pnc, widget, item) => item?.pageType === 'product_listing_page' && !item?.expandPage,
                    global: {
                        component: 'TextInput',
                        label: 'Global Products',
                        validation: {
                            required: true,
                            pattern: /^(\d+)(,\s*\d+)*$/,
                        },
                        errorMessage: 'Enter comma-separated numeric product codes',
                    }
                },
            },
        },
    ],

    // ── Product Input Formats (Scroll Mode) ──
    // Scroll mode supports multiple product input strategies, resolved in priority order
    productInputFormats: {
        scroll: [
            { priority: 1, type: 'prefetched_array', description: 'Pre-fetched products array with full details' },
            { priority: 2, type: 'csv_url', description: 'Google Sheets CSV export URL', pattern: /^https:\/\/docs\.google\.com\/spreadsheets/ },
            { priority: 3, type: 'comma_separated', description: 'Comma-separated item codes', pattern: /^(\d+)(,\s*\d+)*$/ },
            { priority: 4, type: 'newline_separated', description: 'Newline-separated item codes', pattern: /^(\d+)(\n\d+)*$/ },
        ],
    },

    // ── Supported Filters ──
    // Universal across both modes — handled by WidgetItemHelper / PageViewUtils
    filters: {
        // Widget-level (filter_dict on Widget model)
        widget: {
            max_order_constraint: { type: 'int', label: 'Max Order Count', component: 'NumberInput', description: 'Show widget only if user total orders <= Y' },
            min_order_constraint: { type: 'int', label: 'Min Order Count', component: 'NumberInput', description: 'Show widget only if user total orders >= X' },
        },
        // Item-level (filter_dict on WidgetItem) — applies to carousel/category/sub-category items
        item: {
            in_stk_item_codes: { type: 'list_of_int', label: 'Mandatory In-Stock Items', component: 'ProductListInput', description: 'Widget item only shown if these items are in stock' },
        },
        // Product-level (product_filter_dict on WidgetItem) — applies to sub-category items
        product: {
            category: { operators: ['in', 'equal'], component: 'TextInput', description: 'Filter by product category' },
            sub_category: { operators: ['in', 'equal'], component: 'TextInput', description: 'Filter by sub-category' },
            mrp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput', description: 'Filter by MRP' },
            sp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput', description: 'Filter by Selling Price' },
            discount: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput', description: 'Filter by discount percentage' },
        },
    },

    // ── Widget Item Additional Properties ──
    // Backend-processed by WidgetItemHelper — applies to carousel/category/sub-category items
    additionalProperties: {
        oos_product_count: { type: 'int', default: 0, label: 'OOS Product Count', component: 'NumberInput', description: 'Number of Out-of-Stock products to append at end' },
        show_pb_tag: { type: 'boolean', default: true, label: 'Show PB Tag', component: 'ToggleInput', description: 'Show "Previously Bought" tag on product cards' },
        pb_reorder: { type: 'boolean', default: true, label: 'PB Reorder', component: 'ToggleInput', description: 'Re-sort to show Previously Bought items first' },
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

    // ── API Payload Strategies ──
    deployStrategies: {
        // ── Scroll Mode (Carousel): Bottom-up creation ──
        SCROLL: {
            description: 'Carousel — Bottom-up: Sub-Cat → PLP → Page → Carousel Item → Carousel Widget',
            steps: [
                // Step 1: Sub-Category Widget Item (per item, per state)
                {
                    entity: 'widget_item',
                    endpoint: '/api/app/post_widget_item/',
                    slugSuffix: '_sub_cat_wi',
                    type: 'multipart',
                    iterateOver: '$scrollItems',
                    iterateStates: true,
                    fieldMap: {
                        slug_name: '$slug',
                        item_type: 'sub_category',
                        text_en: '$itemTitle',
                        product_list: '$stateProductCodes',
                        filter_lst: '$inStockFilter',
                        media_en: '$blankGif',
                        deactivated_flag: 'no',
                        item_click_action: 'deal-detail-redirect',
                        is_clickable: 'yes',
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
                    },
                },
                // Step 3: Page Layout
                {
                    entity: 'page_layout',
                    endpoint: '/api/app/post_page_layout/',
                    slugSuffix: '_Page_p',
                    type: 'json',
                    fieldMap: {
                        slug_name: '$slug',
                        page_type: '$itemPageType',
                        page_heading: '$itemTitle',
                        page_layout_type: '2',
                    },
                },
                // Map: Sub-Cat → PLP Widget (location-wise)
                {
                    action: 'map_widget_item',
                    parentSlugSuffix: '_plp_w',
                    childPattern: '_sub_cat_wi_{state}',
                    mappingFields: {
                        level_tag: '$stateLevelTag',
                        level_property: '$stateLevelProperty',
                        priority: '$statePriority',
                    },
                },
                // Map: PLP Widget → Page Layout
                { action: 'map_layout_widget', parentSlugSuffix: '_Page_p', childSlugSuffix: '_plp_w' },
                // Map: Page Layout → Global Registry
                { action: 'map_page_layout', parentSlugSuffix: '_Page_p' },
                // Step 4: Carousel Widget Item
                {
                    entity: 'widget_item',
                    endpoint: '/api/app/post_widget_item/',
                    slugSuffix: '_cl_wi',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        item_type: 'carousel',
                        media_en: '$carouselItemImage',
                        item_click_action: 'redirect-to-page',
                        click_action_params: '$carouselClickParams',
                        is_clickable: 'yes',
                    },
                },
                // Step 5: Carousel Widget (parent container)
                {
                    entity: 'widget',
                    endpoint: '/api/app/widget/',
                    slugSuffix: '_Cl_w_HP',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        widget_type: 'carousel',
                        media_number: '$mediaNumber',
                        start_time: '$startTime',
                        end_time: '$endTime',
                    },
                },
                // Map: Carousel Item → Carousel Widget
                { action: 'map_widget_item', parentSlugSuffix: '_Cl_w_HP', childSlugSuffix: '_cl_wi' },
            ],
        },

        // ── Stick Mode (Category Grid): Bottom-up creation per category item ──
        STICK: {
            description: 'Category Grid — Bottom-up per item: Sub-Cats → PLP → Page → Cat Item → Grid Widget',
            phases: {
                // ── Phase 1: Per Category Item Ecosystem (bottom-up) ──
                phase1: {
                    label: 'Create Item Ecosystems',
                    iterateOver: '$categoryItems',
                    stepsPerItem: [
                        // Step 1: Sub-Category Widget Items (per sub-cat × per state)
                        {
                            entity: 'widget_item',
                            endpoint: '/api/app/post_widget_item/',
                            slugSuffix: '_item_{n}_subcat_{m}_{state}',
                            type: 'multipart',
                            iterateOver: '$itemSubCategories',
                            iterateStates: true,
                            fieldMap: {
                                slug_name: '$slug',
                                item_type: 'sub_category',
                                text_en: '$subCategoryName',
                                text_hi: '$subCategoryNameHi',
                                media_en: '$subCategoryImage',
                                product_list: '$stateProductCodes',
                                filter_lst: '$inStockFilter',
                                filters: '[]',
                                property_lst: '[]',
                                pl_edit: 'PL',
                                deactivated_flag: 'no',
                                is_clickable: 'yes',
                            },
                        },
                        // Step 2: PLP Widget (per category item)
                        {
                            entity: 'widget',
                            endpoint: '/api/app/widget/',
                            slugSuffix: '_item_{n}_plp',
                            type: 'multipart',
                            fieldMap: {
                                slug_name: '$slug',
                                widget_type: 'product_listing',
                                heading: '',
                                start_time: '$startTime',
                                end_time: '$endTime',
                                app_configurations: '{"show_sub_cat": true}',
                                filter_dict: '{}',
                                deactivated_flag: 'no',
                            },
                        },
                        // Step 3: Page Layout (per category item)
                        {
                            entity: 'page_layout',
                            endpoint: '/api/app/post_page_layout/',
                            slugSuffix: '_item_{n}_page',
                            type: 'json',
                            fieldMap: {
                                slug_name: '$slug',
                                page_type: '$itemPageType',
                                page_heading: '$itemPageHeading',
                                page_layout_type: '2',
                            },
                        },
                        // Map: Sub-Cat Items → PLP Widget (location-wise)
                        {
                            action: 'map_widget_item',
                            parentSlugSuffix: '_item_{n}_plp',
                            childPattern: '_item_{n}_subcat_{m}_{state}',
                            mappingFields: {
                                level_tag: '$stateLevelTag',
                                level_property: '$stateLevelProperty',
                                priority: '$statePriority',
                            },
                        },
                        // Map: PLP Widget → Page Layout
                        { action: 'map_layout_widget', parentSlugSuffix: '_item_{n}_page', childSlugSuffix: '_item_{n}_plp' },
                        // Map: Page Layout → Global Registry
                        { action: 'map_page_layout', parentSlugSuffix: '_item_{n}_page' },
                        // Step 4: Category Widget Item
                        {
                            entity: 'widget_item',
                            endpoint: '/api/app/post_widget_item/',
                            slugSuffix: '_item_{n}_cat_wi',
                            type: 'multipart',
                            fieldMap: {
                                slug_name: '$slug',
                                item_type: 'category',
                                text_en: '$categoryItemText',
                                text_hi: '$categoryItemTextHi',
                                media_en: '$categoryItemImage',
                                item_click_action: 'redirect-to-page',
                                click_action_params: '$categoryClickParams',
                                is_clickable: 'yes',
                                deactivated_flag: 'no',
                            },
                        },
                    ],
                },

                // ── Phase 2: Final Assembly ──
                phase2: {
                    label: 'Create Category Grid Widget & Map Items',
                    steps: [
                        // Step 5: Category Grid Widget (parent container)
                        {
                            entity: 'widget',
                            endpoint: '/api/app/widget/',
                            slugSuffix: '_cm_hp',
                            type: 'multipart',
                            fieldMap: {
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
                        },
                        // Map: All Category Items → Category Grid Widget
                        {
                            action: 'map_widget_item',
                            parentSlugSuffix: '_cm_hp',
                            childPattern: '_item_{n}_cat_wi',
                            mappingFields: {
                                level_tag: 'global',
                                level_property: 'global',
                                priority: '$itemIndex',
                            },
                        },
                    ],
                },
            },

            // ── API Endpoints Reference ──
            endpoints: {
                widget: '/api/app/widget/',
                widgetItem: '/api/app/post_widget_item/',
                pageLayout: '/api/app/post_page_layout/',
                mapWidgetItem: '/api/app/update_widget_widget_item_mapping/',
                mapLayoutWidget: '/api/app/update_layout_widget_mapping/',
                mapPageLayout: '/api/app/update_page_page_layout_mapping/',
            },
        },
    },

    // ── Strategy Resolution ──
    strategyMatrix: [
        { displayMode: 'scroll', strategy: 'SCROLL' },
        { displayMode: 'stick', strategy: 'STICK' },
    ],

    // ── Slug Patterns ──
    slugPatterns: {
        scroll: {
            subCategoryItem: '{base}_sub_cat_wi',
            subCategoryStateItem: '{base}_sub_cat_wi_{state}',
            plpWidget: '{base}_plp_w',
            pageLayout: '{base}_Page_p',
            carouselItem: '{base}_cl_wi',
            carouselWidget: '{base}_Cl_w_HP',
            fallback: 'carousel_{timestamp}',
        },
        stick: {
            subCategoryItem: '{base}_item_{n}_subcat_{m}_{state}',
            plpWidget: '{base}_item_{n}_plp',
            // pageLayout slug differs by pageType to avoid collisions
            pageLayoutCategory: '{base}_item_{n}_cat_page',
            pageLayoutPlp: '{base}_item_{n}_plp_page',
            categoryItem: '{base}_item_{n}_cat_wi',
            categoryWidget: '{base}_cm_hp',
            fallback: 'category_grid_{timestamp}',
        },
    },

    // ── Image Handling (Scroll Mode) ──
    imageHandling: {
        scroll: {
            // Carousel preserves original image dimensions — no aspect ratio override
            preserveOriginalDimensions: true,
            // Proxy-based fetching for CORS bypass + compression
            proxyUrl: 'https://images.weserv.nl/',
            proxyParams: { q: 60, output: 'jpg' },
            fallbackImage: 'blank.gif',
        },
        stick: {
            // Category grid images: uploaded File or blank 1×1 PNG fallback
            // (matches SPRBuilder.getBlankImageBlob() pattern)
            imagePriority: [
                'uploadedFile',      // File/Blob from form upload
                'blankPng',          // 1×1 transparent PNG (auto fallback)
            ],
        },
    },

    // ── Rendering Hints ──
    rendering: {
        component: 'CollectionBanner',          // src/components/Widgets/CollectionBanner/index.jsx
        scroll: {
            component: 'CollectionBanner/Scroll', // delegates to BannerWithProductListing
        },
        stick: {
            component: 'CollectionBanner/Stick',  // 4-col category grid with useCatalog PLP
            gridCols: 4,
        },
    },

    // ── Initial State ──
    initialState: {
        type: 'collection_banner',
        pnc: { displayMode: 'scroll' },
        slug: '',
        title: '',
        titleHi: '',
        media_number: '3.5',
        start_time: '',
        end_time: '',
        scrollItems: [],
        categoryItems: [],
    },

    // ── State Definitions (shared with Masthead) ──
    stateDefinitions: STATE_DEFINITIONS,
};
