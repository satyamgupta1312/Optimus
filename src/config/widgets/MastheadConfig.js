/**
 * Masthead Configuration — Source of Truth
 *
 * This config drives both Primary and Secondary Masthead variants:
 * 1. Variant Resolution (Primary → masthead_primary, Secondary → masthead_secondary_category_hp)
 * 2. Property Editor (fields, validation, component rendering)
 * 3. API Payload Generation (deploy strategies — 1-phase for Primary, 3-phase for Secondary)
 * 4. Pre-deploy Validation (required fields, multimedia constraints)
 * 5. Widget Rendering (component hint)
 *
 * Wiki Reference: wiki/WIDGET-Masthead.md
 */

// ── State Definitions for Secondary Masthead Sub-Categories ──
// Global is always required. Additional states can be added dynamically via "Add State" button.
export const STATE_DEFINITIONS = {
    // ── Always present ──
    global: { levelTag: 'global', levelProperty: 'global', slugSuffix: '_global' },

    // ── Default states (always visible in Add State dropdown) ──
    jh: { levelTag: 'state', levelProperty: 'jharkhand', slugSuffix: '_jh' },
    cg: { levelTag: 'state', levelProperty: 'chhattisgarh', slugSuffix: '_cg' },
    wb: { levelTag: 'state', levelProperty: 'west bengal', slugSuffix: '_wb' },

    // ── Default cities ──
    patna: { levelTag: 'city', levelProperty: 'patna', slugSuffix: '_patna' },
};

/**
 * Full catalog of all available Indian states & cities.
 * Users enable these via the State Manager button in the header.
 * Enabled keys are persisted in localStorage under 'optimus_enabled_states'.
 */
export const STATE_CATALOG = {
    // ── States ──
    up: { levelTag: 'state', levelProperty: 'uttar pradesh', slugSuffix: '_up', label: 'Uttar Pradesh', type: 'state' },
    br: { levelTag: 'state', levelProperty: 'bihar', slugSuffix: '_br', label: 'Bihar', type: 'state' },
    gj: { levelTag: 'state', levelProperty: 'gujarat', slugSuffix: '_gj', label: 'Gujarat', type: 'state' },
    mp: { levelTag: 'state', levelProperty: 'madhya pradesh', slugSuffix: '_mp', label: 'Madhya Pradesh', type: 'state' },
    rj: { levelTag: 'state', levelProperty: 'rajasthan', slugSuffix: '_rj', label: 'Rajasthan', type: 'state' },
    mh: { levelTag: 'state', levelProperty: 'maharashtra', slugSuffix: '_mh', label: 'Maharashtra', type: 'state' },
    dl: { levelTag: 'state', levelProperty: 'delhi', slugSuffix: '_dl', label: 'Delhi', type: 'state' },
    ka: { levelTag: 'state', levelProperty: 'karnataka', slugSuffix: '_ka', label: 'Karnataka', type: 'state' },
    tn: { levelTag: 'state', levelProperty: 'tamil nadu', slugSuffix: '_tn', label: 'Tamil Nadu', type: 'state' },
    ap: { levelTag: 'state', levelProperty: 'andhra pradesh', slugSuffix: '_ap', label: 'Andhra Pradesh', type: 'state' },
    tg: { levelTag: 'state', levelProperty: 'telangana', slugSuffix: '_tg', label: 'Telangana', type: 'state' },
    od: { levelTag: 'state', levelProperty: 'odisha', slugSuffix: '_od', label: 'Odisha', type: 'state' },
    as: { levelTag: 'state', levelProperty: 'assam', slugSuffix: '_as', label: 'Assam', type: 'state' },
    hr: { levelTag: 'state', levelProperty: 'haryana', slugSuffix: '_hr', label: 'Haryana', type: 'state' },
    pb: { levelTag: 'state', levelProperty: 'punjab', slugSuffix: '_pb', label: 'Punjab', type: 'state' },
    uk: { levelTag: 'state', levelProperty: 'uttarakhand', slugSuffix: '_uk', label: 'Uttarakhand', type: 'state' },
    hp: { levelTag: 'state', levelProperty: 'himachal pradesh', slugSuffix: '_hp', label: 'Himachal Pradesh', type: 'state' },
    ga: { levelTag: 'state', levelProperty: 'goa', slugSuffix: '_ga', label: 'Goa', type: 'state' },
    ke: { levelTag: 'state', levelProperty: 'kerala', slugSuffix: '_ke', label: 'Kerala', type: 'state' },
    mn: { levelTag: 'state', levelProperty: 'manipur', slugSuffix: '_mn', label: 'Manipur', type: 'state' },
    ml: { levelTag: 'state', levelProperty: 'meghalaya', slugSuffix: '_ml', label: 'Meghalaya', type: 'state' },
    sk: { levelTag: 'state', levelProperty: 'sikkim', slugSuffix: '_sk', label: 'Sikkim', type: 'state' },

    // ── Cities ──
    ranchi: { levelTag: 'city', levelProperty: 'ranchi', slugSuffix: '_rnc', label: 'Ranchi', type: 'city' },
    lucknow: { levelTag: 'city', levelProperty: 'lucknow', slugSuffix: '_lko', label: 'Lucknow', type: 'city' },
    kanpur: { levelTag: 'city', levelProperty: 'kanpur', slugSuffix: '_knp', label: 'Kanpur', type: 'city' },
    varanasi: { levelTag: 'city', levelProperty: 'varanasi', slugSuffix: '_vns', label: 'Varanasi', type: 'city' },
    agra: { levelTag: 'city', levelProperty: 'agra', slugSuffix: '_agr', label: 'Agra', type: 'city' },
    kolkata: { levelTag: 'city', levelProperty: 'kolkata', slugSuffix: '_kol', label: 'Kolkata', type: 'city' },
    mumbai: { levelTag: 'city', levelProperty: 'mumbai', slugSuffix: '_mum', label: 'Mumbai', type: 'city' },
    pune: { levelTag: 'city', levelProperty: 'pune', slugSuffix: '_pun', label: 'Pune', type: 'city' },
    surat: { levelTag: 'city', levelProperty: 'surat', slugSuffix: '_sur', label: 'Surat', type: 'city' },
    ahmedabad: { levelTag: 'city', levelProperty: 'ahmedabad', slugSuffix: '_ahm', label: 'Ahmedabad', type: 'city' },
    jaipur: { levelTag: 'city', levelProperty: 'jaipur', slugSuffix: '_jai', label: 'Jaipur', type: 'city' },
    bhopal: { levelTag: 'city', levelProperty: 'bhopal', slugSuffix: '_bho', label: 'Bhopal', type: 'city' },
    indore: { levelTag: 'city', levelProperty: 'indore', slugSuffix: '_ind', label: 'Indore', type: 'city' },
    nagpur: { levelTag: 'city', levelProperty: 'nagpur', slugSuffix: '_ngp', label: 'Nagpur', type: 'city' },
    raipur: { levelTag: 'city', levelProperty: 'raipur', slugSuffix: '_rpr', label: 'Raipur', type: 'city' },
    bhubaneswar: { levelTag: 'city', levelProperty: 'bhubaneswar', slugSuffix: '_bbsr', label: 'Bhubaneswar', type: 'city' },
    guwahati: { levelTag: 'city', levelProperty: 'guwahati', slugSuffix: '_gwh', label: 'Guwahati', type: 'city' },
    chandigarh: { levelTag: 'city', levelProperty: 'chandigarh', slugSuffix: '_chd', label: 'Chandigarh', type: 'city' },
};

export const MastheadConfig = {
    // ── Identity ──
    type: 'masthead',
    label: 'Masthead',
    icon: 'Crown',
    description: 'Header widget with multimedia background. Primary shows category icons; Secondary adds a promotional carousel with nested page ecosystems.',

    // ── PNC Properties (define the variant) ──
    properties: {
        variant: {
            type: 'string',
            options: ['primary', 'secondary'],
            default: 'primary',
            label: 'Variant',
            ui: 'pills',
        },
        // has_multimedia is IMPLICIT from background_media presence (not user-toggled)
    },

    // ── Variant Resolution Matrix ──
    variantMatrix: [
        { variant: 'primary', widgetType: 'masthead_primary' },
        { variant: 'secondary', widgetType: 'masthead_secondary_category_hp' },
    ],

    // ── Multimedia Capabilities ──
    // Shared across both variants — identical upload flow and preview priority
    // No file size limits — users can upload any size for image, video, or lottie
    multimedia: {
        image: true,
        video: true,
        lottie: true,
        gif: true,
        supportedExtensions: ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
        videoExtensions: ['.mp4', '.mov', '.webm'],
        // Background multimedia is optional — omit field if empty to avoid
        // "Background Multimedia Name is invalid" error
        requiresMultimediaVariant: false,
    },

    // ── Multimedia Color Defaults ──
    // These are initial placeholder values only — users are expected to
    // customize all colors to match their campaign/theme requirements.
    multimediaColors: {
        transition_color: '#FFFFFF',
        accent_color: '#0000FF',
        text_color: '#FFFFFF',
        icon_bg_color: '#F0F0F0',
    },

    // ── Form Fields ──
    fields: [
        // ── Common Fields (both variants) ──
        {
            name: 'slug',
            component: 'SlugBuilder',
            label: 'Slug Name',
            placeholder: 'e.g. diwali_2024',
            validation: {
                required: true,
                pattern: /^[a-z0-9_]+$/,
                minLength: 3,
                maxLength: 100,
            },
            errorMessage: 'Slug must be lowercase alphanumeric with underscores (3-100 chars)',
        },
        {
            name: 'background_media',
            component: 'ImageUpload',
            label: 'Background Media',
            helperText: 'Upload image/video/webm for multimedia background (no size limit)',
            validation: {
                required: false,
                acceptExtensions: ['.jpeg', '.jpg', '.png', '.webp', '.gif', '.svg'],
            },
            errorMessage: 'Must be a supported image format',
        },

        {
            name: 'transition_color',
            component: 'ColorPicker',
            label: 'Transition Color',
            defaultValue: '#FFFFFF',
            validation: { required: false },
        },
        {
            name: 'accent_color',
            component: 'ColorPicker',
            label: 'Accent Color',
            defaultValue: '#0000FF',
            validation: { required: false },
        },
        {
            name: 'text_color',
            component: 'ColorPicker',
            label: 'Text Color',
            defaultValue: '#FFFFFF',
            validation: { required: false },
        },
        {
            name: 'icon_bg_color',
            component: 'ColorPicker',
            label: 'Icon Background Color',
            defaultValue: '#F0F0F0',
            validation: { required: false },
        },
        {
            name: 'is_multimedia_dark',
            component: 'ToggleInput',
            label: 'Dark Theme',
            defaultValue: false,
            validation: { required: false },
        },
        {
            name: 'media_aspect_ratio',
            component: 'PillSelector',
            label: 'Aspect Ratio',
            options: [
                { label: '1:1', value: '1' },
                { label: '4:3', value: '2' },
                { label: '16:9', value: '3' },
                { label: 'Full', value: '4' },
            ],
            // Primary defaults to "1", Secondary to "4" — resolved by variant
            defaultValue: (pnc) => (pnc.variant === 'secondary' ? '4' : '1'),
            validation: { required: false },
        },

        // ── Primary-Only Fields ──
        {
            name: 'master_key',
            component: 'TextInput',
            label: 'Master Key',
            placeholder: 'e.g. 1020',
            helperText: 'Link to category pane widget',
            condition: (pnc) => pnc.variant === 'primary',
            validation: {
                required: false,
                pattern: /^\d*$/,
            },
            errorMessage: 'Master key must be numeric',
        },

        // ── Date/Time Fields (both variants) ──
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

        // ── Secondary-Only Fields ──
        {
            name: 'carouselItems',
            component: 'CarouselItemEditor',
            label: 'Carousel Items',
            helperText: 'Add banner items with category pages and sub-categories',
            condition: (pnc) => pnc.variant === 'secondary',
            validation: {
                required: true,
                minItems: 1,
                maxItems: 20,
            },
            errorMessage: 'At least 1 carousel item is required',
            // Nested schema for each carousel item
            itemSchema: {
                text: {
                    component: 'TextInput',
                    label: 'Display Text',
                    validation: { required: true, minLength: 1, maxLength: 200 },
                },
                image: {
                    component: 'ImageUpload',
                    label: 'Carousel Image',
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
                pageHeading: {
                    component: 'TextInput',
                    label: 'Page Heading',
                    validation: { required: true, minLength: 1, maxLength: 200 },
                },
                subCategories: {
                    label: 'Sub-Categories',
                    validation: { required: true, minItems: 1, maxItems: 50 },
                    // Nested schema for each sub-category
                    itemSchema: {
                        name: {
                            component: 'TextInput',
                            label: 'Sub-Category Name',
                            validation: { required: true },
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
                            // Each follows: { component: 'TextInput', label: '{State} Products', ... }
                        },
                    },
                },
            },
        },
    ],

    // ── Supported Filters ──
    // Universal across both variants — handled by WidgetItemHelper / PageViewUtils
    filters: {
        // Widget-level (filter_dict on Widget model)
        widget: {
            max_order_constraint: { type: 'int', label: 'Max Order Count', component: 'NumberInput', description: 'Show widget only if user total orders <= Y' },
            min_order_constraint: { type: 'int', label: 'Min Order Count', component: 'NumberInput', description: 'Show widget only if user total orders >= X' },
        },
        // Item-level (filter_dict on WidgetItem) — applies to Secondary variant's carousel/sub-category items
        item: {
            in_stk_item_codes: { type: 'list_of_int', label: 'Mandatory In-Stock Items', component: 'ProductListInput', description: 'Widget item only shown if these items are in stock' },
        },
        // Product-level (product_filter_dict on WidgetItem) — applies to Secondary variant's sub-category items
        product: {
            category: { operators: ['in', 'equal'], component: 'TextInput', description: 'Filter by product category' },
            sub_category: { operators: ['in', 'equal'], component: 'TextInput', description: 'Filter by sub-category' },
            mrp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput', description: 'Filter by MRP' },
            sp: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput', description: 'Filter by Selling Price' },
            discount: { operators: ['lte', 'gte', 'lt', 'gt', 'equal'], component: 'NumberInput', description: 'Filter by discount percentage' },
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
    // Backend-processed by WidgetItemHelper — applies to Secondary variant's sub-category/carousel items
    additionalProperties: {
        oos_product_count: { type: 'int', default: 0, label: 'OOS Product Count', component: 'NumberInput', description: 'Number of Out-of-Stock products to append at end' },
        show_pb_tag: { type: 'boolean', default: true, label: 'Show PB Tag', component: 'ToggleInput', description: 'Show "Previously Bought" tag on product cards' },
        pb_reorder: { type: 'boolean', default: true, label: 'PB Reorder', component: 'ToggleInput', description: 'Re-sort to show Previously Bought items first' },
    },

    // ── API Payload Strategies ──
    deployStrategies: {
        // ── Primary Masthead: 1-Phase (simple) ──
        PRIMARY: {
            description: 'Primary Masthead — Multimedia (optional) + Widget',
            steps: [
                // Step 1: Create Multimedia (optional — only if background_media provided)
                {
                    entity: 'multimedia',
                    endpoint: '/api/app/multimedia/',
                    slugSuffix: '_bg',
                    type: 'multipart',
                    condition: (widget) => !!widget.background_media || !!widget.background_video,
                    fieldMap: {
                        name: '$slug',
                        multimedia_type: '$multimediaType', // "3" image, "4" video, "1" lottie
                        aspect_ratio: '$mediaAspectRatio',
                        file_en: '$backgroundMediaFile',
                        transition_color: '$transitionColor',
                        accent_color: '$accentColor',
                        text_color: '$textColor',
                        icon_bg_color: '$iconBgColor',
                        is_multimedia_dark: '$isMultimediaDark',
                    },
                },
                // Step 2: Create Primary Masthead Widget
                {
                    entity: 'widget',
                    endpoint: '/api/app/widget/',
                    slugSuffix: '_pm_hp',
                    type: 'multipart',
                    fieldMap: {
                        slug_name: '$slug',
                        widget_type: 'masthead_primary',
                        master_key: '$masterKey',
                        background_multimedia: '$backgroundMultimediaSlug', // omit if empty
                        media_aspect_ratio: '$mediaAspectRatio',
                        start_time: '$startTime',
                        end_time: '$endTime',
                        heading: '',
                        heading_en: '',
                        filter_dict: '{}',
                        app_configurations: '$appConfigurations',
                    },
                },
            ],
        },

        // ── Secondary Masthead: 3-Phase (complex nested ecosystem) ──
        SECONDARY: {
            description: 'Secondary Masthead — 3-Phase batch creation with carousel item ecosystems',
            phases: {
                // ── Phase 1: Parent Containers ──
                phase1: {
                    label: 'Create Parent Containers',
                    steps: [
                        // Step 1: Multimedia Background (optional)
                        {
                            entity: 'multimedia',
                            endpoint: '/api/app/multimedia/',
                            slugSuffix: '_bg',
                            type: 'multipart',
                            condition: (widget) => !!widget.background_media || !!widget.background_video,
                            fieldMap: {
                                name: '$slug',
                                multimedia_type: '$multimediaType',
                                aspect_ratio: '$mediaAspectRatio',
                                file_en: '$backgroundMediaFile',
                                transition_color: '$transitionColor',
                                accent_color: '$accentColor',
                                text_color: '$textColor',
                                icon_bg_color: '$iconBgColor',
                                is_multimedia_dark: '$isMultimediaDark',
                            },
                        },
                        // Step 2: Secondary Masthead Widget
                        {
                            entity: 'widget',
                            endpoint: '/api/app/widget/',
                            slugSuffix: '_sm_hp',
                            type: 'multipart',
                            fieldMap: {
                                slug_name: '$slug',
                                widget_type: 'masthead_secondary_category_hp',
                                background_multimedia: '$backgroundMultimediaSlug',
                                media_aspect_ratio: '$mediaAspectRatio',
                                start_time: '$startTime',
                                end_time: '$endTime',
                                heading: '',
                                filter_dict: '{}',
                                app_configurations: '$appConfigurations',
                            },
                        },
                    ],
                },

                // ── Phase 2: Item Ecosystems (per carousel item) ──
                phase2: {
                    label: 'Create Item Ecosystems',
                    iterateOver: '$carouselItems',
                    stepsPerItem: [
                        // Step 3: Page Layout (per carousel item)
                        {
                            entity: 'page_layout',
                            endpoint: '/api/app/post_page_layout/',
                            slugSuffix: '_item_{n}_page',
                            type: 'json',
                            fieldMap: {
                                slug_name: '$slug',
                                page_type: '$itemPageType', // "category_page" or "product_listing_page"
                                page_heading: '$itemPageHeading',
                                page_layout_type: '2',
                            },
                        },
                        // Step 4: PLP Widget (per carousel item)
                        {
                            entity: 'widget',
                            endpoint: '/api/app/widget/',
                            slugSuffix: '_item_{n}_plp',
                            type: 'multipart',
                            fieldMap: {
                                slug_name: '$slug',
                                widget_type: 'product_listing',
                                start_time: '$startTime',
                                end_time: '$endTime',
                                app_configurations: '{"show_sub_cat": true}',
                            },
                        },
                        // Step 5: Sub-Category Widget Items (per sub-category × per state)
                        {
                            entity: 'widget_item',
                            endpoint: '/api/app/post_widget_item/',
                            slugSuffix: '_item_{n}_subcat_{m}_{state}',
                            type: 'multipart',
                            iterateOver: '$itemSubCategories',
                            iterateStates: true, // Expands per state (global, jh, cg, etc.)
                            fieldMap: {
                                slug_name: '$slug',
                                item_type: 'sub_category',
                                text_en: '$subCategoryName',
                                product_list: '$stateProductCodes',
                                filter_lst: '$inStockFilter', // [{"condition":"in_stk_item_codes","value":[...]}]
                                deactivated_flag: 'no',
                                is_clickable: 'yes',
                                pl_edit: 'PL',
                            },
                        },
                        // Map: Sub-Category Items → PLP Widget (widget_item mapping)
                        {
                            action: 'map_widget_item',
                            parentSlugSuffix: '_item_{n}_plp',
                            childPattern: '_item_{n}_subcat_{m}_{state}',
                            mappingFields: {
                                level_tag: '$stateLevelTag',
                                level_property: '$stateLevelProperty',
                                priority: '$statePriority', // auto-incremented
                            },
                        },
                        // Map: PLP Widget → Page Layout (layout_widget mapping)
                        {
                            action: 'map_layout_widget',
                            parentSlugSuffix: '_item_{n}_page',
                            childSlugSuffix: '_item_{n}_plp',
                        },
                        // Map: Page Layout → Global Page Registry (page_layout mapping)
                        {
                            action: 'map_page_layout',
                            parentSlugSuffix: '_item_{n}_page',
                        },
                        // Step 6: Carousel Widget Item (per carousel item)
                        {
                            entity: 'widget_item',
                            endpoint: '/api/app/post_widget_item/',
                            slugSuffix: '_item_{n}_carousel',
                            type: 'multipart',
                            fieldMap: {
                                slug_name: '$slug',
                                item_type: 'carousel',
                                item_click_action: 'redirect-to-page',
                                click_action_params: '$carouselClickParams', // {"page_type":"...","page_layout_slug_name":"..."}
                                media_en: '$carouselItemImage',
                                is_clickable: 'yes',
                                deactivated_flag: 'no',
                            },
                        },
                    ],
                },

                // ── Phase 3: Final Mapping ──
                phase3: {
                    label: 'Map Carousel Items to SM Widget',
                    steps: [
                        // Map: All Carousel Items → Secondary Masthead Widget
                        {
                            action: 'map_widget_item',
                            parentSlugSuffix: '_sm_hp',
                            childPattern: '_item_{n}_carousel',
                            mappingFields: {
                                level_tag: 'global',
                                level_property: 'global',
                                priority: '$itemIndex', // auto-incremented per item
                            },
                        },
                    ],
                },
            },

            // ── API Endpoints Reference ──
            endpoints: {
                multimedia: '/api/app/multimedia/',
                widget: '/api/app/widget/',
                pageLayout: '/api/app/post_page_layout/',
                widgetItem: '/api/app/post_widget_item/',
                mapWidgetItem: '/api/app/update_widget_widget_item_mapping/',
                mapLayoutWidget: '/api/app/update_layout_widget_mapping/',
                mapPageLayout: '/api/app/update_page_page_layout_mapping/',
            },
        },
    },

    // ── Strategy Resolution ──
    // Maps PNC variant → deploy strategy key
    strategyMatrix: [
        { variant: 'primary', strategy: 'PRIMARY' },
        { variant: 'secondary', strategy: 'SECONDARY' },
    ],

    // ── Slug Patterns ──
    slugPatterns: {
        primary: {
            multimedia: '{base}_bg',
            widget: '{base}_pm_hp',
            fallback: 'primary_masthead_{timestamp}',
        },
        secondary: {
            multimedia: '{base}_bg',
            widget: '{base}_sm_hp',
            pageLayout: '{base}_item_{n}_page',
            plpWidget: '{base}_item_{n}_plp',
            subCategoryItem: '{base}_item_{n}_subcat_{m}_{state}',
            carouselItem: '{base}_item_{n}_carousel',
            fallback: 'secondary_masthead_{timestamp}',
        },
    },

    // ── Rendering Hints ──
    rendering: {
        primary: {
            component: 'PrimaryMasthead',
        },
        secondary: {
            component: 'SecondaryMasthead',
        },
    },

    // ── Initial State ──
    initialState: {
        type: 'masthead',
        pnc: { variant: 'primary', has_multimedia: false },
        slug: '',
        background_media: null,
        background_video: '',
        transition_color: '#FFFFFF',
        accent_color: '#0000FF',
        text_color: '#FFFFFF',
        icon_bg_color: '#F0F0F0',
        is_multimedia_dark: false,
        media_aspect_ratio: '1',
        master_key: '',
        start_time: '',
        end_time: '',
        carouselItems: [],
    },

    // ── State Definitions (exported separately, referenced here) ──
    stateDefinitions: STATE_DEFINITIONS,
};
