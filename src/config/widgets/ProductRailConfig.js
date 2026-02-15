/**
 * Product Rail Configuration — Source of Truth
 *
 * This config drives:
 * 1. Variant Resolution (PNC → backend widget_type)
 * 2. Property Editor (fields, validation, component rendering)
 * 3. API Payload Generation (deploy strategies)
 * 4. Pre-deploy Validation (required fields, multimedia constraints)
 * 5. Widget Rendering (component hint)
 * 6. Filter & App Config capabilities
 */
export const ProductRailConfig = {
    // ── Identity ──
    type: 'product_rail',
    label: 'Product Rail',
    icon: 'LayoutGrid',
    description: 'A scrollable list of products with optional background media and optimization.',

    // ── PNC Properties (define the variant) ──
    // Rendered as toggles/selectors in the PropertyEditor header
    properties: {
        rows: {
            type: 'number',
            options: [1, 2],
            default: 1,
            label: 'Layout',
            ui: 'pills', // PillSelector component
        },
        is_optimized: {
            type: 'boolean',
            default: true,
            label: 'Optimized Rendering',
            description: 'Enable for better performance on large lists. Creates PLP ecosystem.',
            ui: 'card', // ToggleCard component
        },
        // has_multimedia is IMPLICIT from background_media presence (not user-toggled)
    },

    // ── Variant Resolution Matrix ──
    // Resolves PNC permutations → exact backend widget_type string
    variantMatrix: [
        { rows: 1, is_optimized: false, has_multimedia: false, widgetType: 'single_product_row' },
        { rows: 1, is_optimized: true, has_multimedia: false, widgetType: 'single_product_row_v2' },
        { rows: 1, is_optimized: false, has_multimedia: true, widgetType: 'multimedia_single_product_row' },
        { rows: 1, is_optimized: true, has_multimedia: true, widgetType: 'multimedia_single_product_row_v2' },
        { rows: 2, is_optimized: false, has_multimedia: false, widgetType: 'double_product_row' },
        { rows: 2, is_optimized: true, has_multimedia: false, widgetType: 'double_product_row_v2' },
        { rows: 2, is_optimized: false, has_multimedia: true, widgetType: 'multimedia_double_product_row' },
        { rows: 2, is_optimized: true, has_multimedia: true, widgetType: 'multimedia_double_product_row' },
    ],

    // ── Multimedia Capabilities ──
    multimedia: {
        image: true,
        video: true,
        lottie: true,
        gif: true,
        maxSizeKB: 300,
        supportedExtensions: ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.svg'],
        videoExtensions: ['.mp4', '.mov', '.webm'],
        // Background media only renders on multimedia_* variants
        requiresMultimediaVariant: true,
    },

    // ── Form Fields ──
    // Each field declares: component, validation, errorMessage, condition
    // The PropertyEditor reads this config and renders generically.
    fields: [
        {
            name: 'slug',
            component: 'TextInput',
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
            condition: () => true,
            validation: {
                required: false,
                maxSizeKB: 300,
                acceptExtensions: ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.svg'],
            },
            errorMessage: 'Image must be < 300KB and a supported format',
        },
        {
            name: 'background_video',
            component: 'UrlInput',
            label: 'Background Video URL',
            condition: () => true,
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
    // All filters are UNIVERSAL across variants (handled by WidgetItemHelper / PageViewUtils)
    filters: {
        // Widget-level (filter_dict on Widget model)
        widget: {
            max_order_constraint: { type: 'int', label: 'Max Order Count', component: 'NumberInput' },
            min_order_constraint: { type: 'int', label: 'Min Order Count', component: 'NumberInput' },
        },
        // Item-level (filter_dict on WidgetItem model)
        item: {
            in_stk_item_codes: { type: 'list_of_int', label: 'Mandatory In-Stock Items', component: 'ProductListInput' },
        },
        // Product-level (product_filter_dict on WidgetItem model)
        product: {
            category: { operators: ['in', 'equal'], component: 'TextInput' },
            sub_category: { operators: ['in', 'equal'], component: 'TextInput' },
            mrp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput' },
            sp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput' },
            discount: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput' },
        },
    },

    // ── App Configurations ──
    // Universal: applied by PageViewUtils.__filter_by_app_version for all widget types
    appConfigurations: {
        allow_android: { type: 'boolean', default: true, component: 'ToggleInput' },
        allow_ios: { type: 'boolean', default: true, component: 'ToggleInput' },
        min_android_version: { type: 'version', component: 'VersionInput' },
        max_android_version: { type: 'version', component: 'VersionInput' },
        min_ios_version: { type: 'version', component: 'VersionInput' },
        max_ios_version: { type: 'version', component: 'VersionInput' },
    },

    // ── Widget Item Additional Properties ──
    // Backend-processed by WidgetItemHelper for all item_rows types
    additionalProperties: {
        oos_product_count: { type: 'int', default: 0, label: 'OOS Product Count', component: 'NumberInput' },
        show_pb_tag: { type: 'boolean', default: true, label: 'Show PB Tag', component: 'ToggleInput' },
        pb_reorder: { type: 'boolean', default: true, label: 'PB Reorder', component: 'ToggleInput' },
    },

    // ── API Payload Strategies ──
    // The generic PayloadBuilder reads this to generate ordered API calls
    deployStrategies: {
        STANDARD: {
            description: 'Standard Single Product Row (Page → WI → Widget → Mappings)',
            steps: [
                {
                    entity: 'page_layout',
                    endpoint: '/api/app/post_page_layout/',
                    slugSuffix: '_page',
                    type: 'json',
                    fieldMap: {
                        slug_name: '$slug',
                        page_heading: '$title',
                        page_layout_type: '2',
                        page_type: 'product_listing_page',
                    },
                },
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
                        start_time: '$startTime',
                        end_time: '$endTime',
                    },
                },
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
                        background_multimedia: '$backgroundMedia',
                        filter_dict: '$filterDict',
                        app_configurations: '$appConfigurations',
                    },
                },
                { action: 'map_widget_item', parentSlugSuffix: '_spr', childSlugSuffix: '_wi' },
                { action: 'map_layout_widget', parentSlugSuffix: '_page', childSlugSuffix: '_spr' },
            ],
        },
        OPTIMIZED: {
            description: 'Optimized SPR with PLP Ecosystem',
            steps: [
                // 1. PLP Ecosystem
                {
                    entity: 'widget_item',
                    endpoint: '/api/app/post_widget_item/',
                    slugSuffix: '_sc_wi',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        item_type: 'sub_category',
                        text_en: '$title',
                        text_hi: '$titleHi',
                        product_list: '$productCodes',
                        filter_lst: '$inStockFilter',
                        start_time: '$startTime',
                        end_time: '$endTime',
                    },
                },
                {
                    entity: 'widget',
                    endpoint: '/api/app/widget/',
                    slugSuffix: '_plp_w',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        widget_type: 'product_listing',
                        heading: '$title',
                        start_time: '$startTime',
                        end_time: '$endTime',
                    },
                },
                {
                    entity: 'page_layout',
                    endpoint: '/api/app/post_page_layout/',
                    slugSuffix: '_page',
                    type: 'json',
                    fieldMap: {
                        slug_name: '$slug',
                        page_heading: '$title',
                        page_layout_type: '2',
                        page_type: 'product_listing_page',
                    },
                },
                { action: 'map_widget_item', parentSlugSuffix: '_plp_w', childSlugSuffix: '_sc_wi' },
                { action: 'map_layout_widget', parentSlugSuffix: '_page', childSlugSuffix: '_plp_w' },
                // 2. Home Row
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
                        background_multimedia: '$backgroundMedia',
                        filter_dict: '$filterDict',
                        app_configurations: '$appConfigurations',
                    },
                },
                { action: 'map_widget_item', parentSlugSuffix: '_spr_opt', childSlugSuffix: '_pr_wi' },
            ],
        },
    },

    // ── Rendering Hints ──
    rendering: {
        component: 'ProductRail',
        previewMaxProducts: 10,
    },

    // ── Initial State ──
    initialState: {
        type: 'product_rail',
        title: 'New Collection',
        products: [],
        pnc: { rows: 1, is_optimized: true, has_multimedia: false },
    },
};
