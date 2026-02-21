/**
 * Create Widget UI Configuration — Source of Truth
 *
 * Defines the user-facing widget creation journey:
 *   Step 1: Widget Type Selection (WidgetLibrary dropdown)
 *   Step 2: PNC Selection (variant properties — pills, toggles)
 *   Step 3: Content Fields (form inputs — conditional on PNC)
 *   Step 3b: State-Wise Products (ALL Product Rail variants — always visible)
 *   Step 4: Nested Items (carousel/category items with sub-categories & state products)
 *   Step 5: App Config (collapsible panel: Advanced + Filters + App Config)
 *   Step 6: Submit for Approval
 *
 * This config drives what the user SEES and SELECTS.
 * For backend creation (API payloads, mapping steps), see CreationConfig.js.
 * For per-widget field definitions, see SPRConfig.js / CollectionBannerConfig.js / MastheadConfig.js.
 *
 * Wiki Reference: wiki/STEP-Create-Widget.md
 *
 * Source Components:
 *   - WidgetLibrary:    src/components/Sidebar/WidgetLibrary.jsx
 *   - PropertyEditor:   src/components/Sidebar/PropertyEditor.jsx
 *   - InputRegistry:    src/components/Inputs/InputRegistry.js
 *   - FilterEditor:     src/components/Editors/FilterEditor.jsx
 *   - AppConfigEditor:  src/components/Editors/AppConfigEditor.jsx
 */

// ── Step 1: Widget Type Selection ──
// WidgetLibrary renders these as a dropdown. User picks one + clicks "+".
export const WIDGET_TYPE_OPTIONS = [
    {
        type: 'product_rail',
        label: 'Product Rail',
        icon: 'LayoutGrid',
        description: 'Scrollable product cards with "View All" link. Supports single row (SPR) and double row (DPR).',
        configFile: 'src/config/widgets/SPRConfig.js',
    },
    {
        type: 'collection_banner',
        label: 'Collection Banner',
        icon: 'LayoutList',
        description: 'Scroll mode shows horizontal carousel banners; Stick mode shows a 4-column category grid.',
        configFile: 'src/config/widgets/CollectionBannerConfig.js',
    },
    {
        type: 'masthead',
        label: 'Masthead',
        icon: 'Crown',
        description: 'Header with multimedia background. Primary shows category icons; Secondary adds a promotional carousel.',
        configFile: 'src/config/widgets/MastheadConfig.js',
    },
];

// ── Step 2: PropertyEditor Section Order ──
// After widget is added, PropertyEditor renders these sections in order.
// Each section is conditionally shown based on config presence.
// Sections 3-5 (Advanced, Filters, App Config) are grouped under a single
// collapsible "App Config" panel button (AppConfigPanel component).
export const PROPERTY_EDITOR_SECTIONS = [
    {
        id: 'pnc',
        label: 'Variant Properties',
        description: 'PNC selectors — pills and toggles that determine the widget variant',
        configKey: 'properties',
        required: true,
        component: 'inline', // Rendered inline in PropertyEditor
    },
    {
        id: 'content',
        label: 'Content Settings',
        description: 'Form fields — slug, title, products, media, nested items etc.',
        configKey: 'fields',
        required: true,
        component: 'inline',
    },
    {
        id: 'appConfigPanel',
        label: 'App Config',
        description: 'Collapsible panel grouping Advanced Settings + Filters + App Configuration',
        configKeys: ['additionalProperties', 'filters', 'appConfigurations'],
        required: false,
        component: 'AppConfigPanel',
        subSections: [
            { id: 'advanced', label: 'Advanced Settings', configKey: 'additionalProperties', component: 'inline' },
            { id: 'filters', label: 'Filters', configKey: 'filters', component: 'FilterEditor' },
            { id: 'appConfig', label: 'App Configuration', configKey: 'appConfigurations', component: 'AppConfigEditor' },
        ],
    },
];

// ── Step 2: PNC Properties Per Widget Type ──
// Defines what PNC selectors appear for each widget type, how they affect
// the form, and which backend variant + deploy strategy they resolve to.
export const PNC_DEFINITIONS = {
    product_rail: {
        properties: [
            {
                key: 'rows',
                label: 'Layout',
                ui: 'pills',
                options: [
                    { label: 'Single (1)', value: 1 },
                    { label: 'Double (2)', value: 2 },
                ],
                default: 1,
                affects: ['variantMatrix'],
                description: 'Controls card row count on homepage',
            },
            {
                key: 'is_optimized',
                label: 'Optimized Rendering',
                ui: 'card',
                type: 'boolean',
                default: true,
                affects: ['variantMatrix', 'deployStrategy', 'fieldVisibility'],
                description: 'Adds _v2 suffix to widget_type for optimized rendering',
                fieldEffects: {
                    true: { shows: [], hides: ['view_all_link'], strategy: 'OPTIMIZED' },
                    false: { shows: ['view_all_link'], hides: [], strategy: 'STANDARD' },
                },
            },
            {
                key: 'has_multimedia',
                label: 'Multimedia Background',
                ui: 'implicit', // NOT a toggle — auto-set from background_media upload
                type: 'boolean',
                default: false,
                affects: ['variantMatrix'],
                triggeredBy: ['background_media', 'background_video'],
                description: 'Automatically true when background image/video is uploaded',
            },
        ],
        variantCount: 8, // 2 (rows) × 2 (optimized) × 2 (multimedia)
    },

    collection_banner: {
        properties: [
            {
                key: 'displayMode',
                label: 'Display Mode',
                ui: 'pills',
                options: [
                    { label: 'Scroll', value: 'scroll', description: 'Horizontal carousel banners' },
                    { label: 'Stick', value: 'stick', description: '4-column category grid' },
                ],
                default: 'scroll',
                affects: ['variantMatrix', 'deployStrategy', 'fieldVisibility'],
                fieldEffects: {
                    scroll: {
                        shows: ['media_number', 'scrollItems'],
                        hides: ['titleHi', 'categoryItems'],
                        strategy: 'SCROLL',
                    },
                    stick: {
                        shows: ['titleHi', 'categoryItems'],
                        hides: ['media_number', 'scrollItems'],
                        strategy: 'STICK',
                    },
                },
            },
        ],
        variantCount: 2, // scroll (carousel) / stick (category)
    },

    masthead: {
        properties: [
            {
                key: 'variant',
                label: 'Variant',
                ui: 'pills',
                options: [
                    { label: 'Primary', value: 'primary', description: 'Category icons with background' },
                    { label: 'Secondary', value: 'secondary', description: 'Carousel with PLP ecosystems' },
                ],
                default: 'primary',
                affects: ['variantMatrix', 'deployStrategy', 'fieldVisibility'],
                fieldEffects: {
                    primary: {
                        shows: ['master_key'],
                        hides: ['carouselItems'],
                        strategy: 'PRIMARY',
                        aspectRatioDefault: '1',
                    },
                    secondary: {
                        shows: ['carouselItems'],
                        hides: ['master_key'],
                        strategy: 'SECONDARY',
                        aspectRatioDefault: '4',
                    },
                },
            },
        ],
        variantCount: 2, // primary / secondary
    },
};

// ── Step 3: Content Fields Per Widget Type ──
// Ordered list of fields shown in "Content Settings" section.
// Conditional fields use `condition` to check PNC state.
export const CONTENT_FIELDS = {
    product_rail: {
        fields: [
            { name: 'pageType', component: 'SelectInput', label: 'Page Type', required: true },
            { name: 'slug', component: 'SlugBuilder', label: 'Slug Name', required: true },
            { name: 'title', component: 'TextInput', label: 'Title (English)', required: true },
            { name: 'titleHi', component: 'TextInput', label: 'Title (Hindi)', required: false },
            { name: 'products', component: 'ProductListInput', label: 'Products', required: true },
            { name: 'background_media', component: 'ImageUpload', label: 'Background Media', required: false },
            { name: 'background_video', component: 'UrlInput', label: 'Background Video URL', required: false },
            { name: 'view_all_link', component: 'TextInput', label: 'View All Page Slug', required: false, condition: 'is_optimized === false' },
        ],
        // State-wise products section ALWAYS appears for all Product Rail variants
        stateProductsSection: {
            condition: 'always', // No condition — visible regardless of is_optimized
            component: 'StateProductEditor',
            globalRequired: true,
            dynamicStates: true,
        },
    },

    collection_banner: {
        // Fields vary by displayMode
        common: [
            { name: 'slug', component: 'SlugBuilder', label: 'Slug Name', required: true },
            { name: 'title', component: 'TextInput', label: 'Title (English)', required: true },
        ],
        scroll: [
            { name: 'media_number', component: 'TextInput', label: 'Media Number', required: false, placeholder: 'e.g. 3.5' },
            { name: 'scrollItems', component: 'ScrollItemEditor', label: 'Carousel Items', required: true },
        ],
        stick: [
            { name: 'titleHi', component: 'TextInput', label: 'Title (Hindi)', required: false },
            { name: 'categoryItems', component: 'CategoryItemEditor', label: 'Category Items', required: true },
        ],
    },

    masthead: {
        // Fields shared between variants
        common: [
            { name: 'slug', component: 'SlugBuilder', label: 'Slug Name', required: true },
            { name: 'background_media', component: 'ImageUpload', label: 'Background Media', required: false },
            { name: 'background_video', component: 'UrlInput', label: 'Background Video URL', required: false },
            { name: 'transition_color', component: 'ColorPicker', label: 'Transition Color', required: false, default: '#FFFFFF' },
            { name: 'accent_color', component: 'ColorPicker', label: 'Accent Color', required: false, default: '#0000FF' },
            { name: 'text_color', component: 'ColorPicker', label: 'Text Color', required: false, default: '#FFFFFF' },
            { name: 'icon_bg_color', component: 'ColorPicker', label: 'Icon BG Color', required: false, default: '#F0F0F0' },
            { name: 'is_multimedia_dark', component: 'ToggleInput', label: 'Dark Theme', required: false, default: false },
            { name: 'media_aspect_ratio', component: 'PillSelector', label: 'Aspect Ratio', required: false },
        ],
        primary: [
            { name: 'master_key', component: 'TextInput', label: 'Master Key', required: false, placeholder: 'e.g. 1020' },
        ],
        secondary: [
            { name: 'carouselItems', component: 'CarouselItemEditor', label: 'Carousel Items', required: true },
        ],
    },
};

// ── Step 4: Nested Item Schemas ──
// Defines what fields each nested item type contains.
// Used by ScrollItemEditor, CategoryItemEditor, CarouselItemEditor.
export const NESTED_ITEM_SCHEMAS = {
    // Collection Banner → Scroll → Carousel Item
    scrollItem: {
        component: 'ScrollItemEditor',
        minItems: 1,
        maxItems: 50,
        addButtonLabel: '+ Add Carousel Item',
        fields: [
            { name: 'image', component: 'ImageUpload', label: 'Banner Image', required: true, maxSizeKB: 300 },
            { name: 'title', component: 'TextInput', label: 'Item Title', required: true },
            { name: 'pageType', component: 'PillSelector', label: 'Page Type', required: true, options: ['product_listing_page', 'category_page'], default: 'product_listing_page' },
            { name: 'productIds', component: 'TextInput', label: 'Product Codes', required: true },
        ],
        hasStateProducts: true,
        stateProductsConfig: {
            globalRequired: true,
            addStateButton: true,
        },
    },

    // Collection Banner → Stick → Category Item
    categoryItem: {
        component: 'CategoryItemEditor',
        minItems: 1,
        maxItems: 20,
        addButtonLabel: '+ Add Category Item',
        fields: [
            { name: 'text', component: 'TextInput', label: 'Category Name (EN)', required: true },
            { name: 'textHi', component: 'TextInput', label: 'Category Name (HI)', required: false },
            { name: 'image', component: 'ImageUpload', label: 'Category Image', required: true, maxSizeKB: 300 },
            { name: 'pageType', component: 'PillSelector', label: 'Page Type', required: true, options: ['category_page', 'product_listing_page'], default: 'category_page' },
            { name: 'pageHeading', component: 'TextInput', label: 'Page Heading', required: true },
        ],
        hasSubCategories: true,
        subCategorySchema: {
            minItems: 1,
            maxItems: 50,
            addButtonLabel: '+ Add Sub-Category',
            fields: [
                { name: 'name', component: 'TextInput', label: 'Sub-Category Name (EN)', required: true },
                { name: 'nameHi', component: 'TextInput', label: 'Sub-Category Name (HI)', required: false },
                { name: 'image', component: 'ImageUpload', label: 'Sub-Category Image', required: false, maxSizeKB: 50 },
            ],
            hasStateProducts: true,
            stateProductsConfig: {
                globalRequired: true,
                addStateButton: true,
            },
        },
    },

    // Masthead → Secondary → Carousel Item
    mastheadCarouselItem: {
        component: 'CarouselItemEditor',
        minItems: 1,
        maxItems: 20,
        addButtonLabel: '+ Add Carousel Item',
        fields: [
            { name: 'text', component: 'TextInput', label: 'Display Text', required: true },
            { name: 'image', component: 'ImageUpload', label: 'Carousel Image', required: true, maxSizeKB: 300 },
            { name: 'pageType', component: 'PillSelector', label: 'Page Type', required: true, options: ['category_page', 'product_listing_page'], default: 'category_page' },
            { name: 'pageHeading', component: 'TextInput', label: 'Page Heading', required: true },
        ],
        hasSubCategories: true,
        subCategorySchema: {
            minItems: 1,
            maxItems: 50,
            addButtonLabel: '+ Add Sub-Category',
            fields: [
                { name: 'name', component: 'TextInput', label: 'Sub-Category Name', required: true },
            ],
            hasStateProducts: true,
            stateProductsConfig: {
                globalRequired: true,
                addStateButton: true,
            },
        },
    },
};

// ── Step 4: Nesting Depth Reference ──
// How deep each widget's form nests.
export const NESTING_DEPTH = {
    product_rail_standard: { depth: 1, path: 'Widget → State-Wise Products (all variants have state products)' },
    product_rail_optimized: { depth: 1, path: 'Widget → State-Wise Products' },
    collection_banner_scroll: { depth: 2, path: 'Widget → Carousel Items → State-Wise Products' },
    collection_banner_stick: { depth: 3, path: 'Widget → Category Items → Sub-Categories → State-Wise Products' },
    masthead_primary: { depth: 0, path: 'Widget (no nesting)' },
    masthead_secondary: { depth: 3, path: 'Widget → Carousel Items → Sub-Categories → State-Wise Products' },
};

// ── Step 5: Advanced, Filters, App Config (Shared) ──
// These sections are identical across all 3 widget types.
export const ADVANCED_SETTINGS = {
    fields: [
        { name: 'oos_product_count', component: 'NumberInput', label: 'OOS Product Count', default: 0, description: 'Out-of-stock products appended at end' },
        { name: 'show_pb_tag', component: 'ToggleInput', label: 'Show PB Tag', default: true, description: 'Show "Previously Bought" badge' },
        { name: 'pb_reorder', component: 'ToggleInput', label: 'PB Reorder', default: true, description: 'Move PB items to front of list' },
    ],
};

export const FILTER_LEVELS = {
    widget: {
        label: 'Widget-Level Filters',
        description: 'Applied to the entire widget (filter_dict on Widget model)',
        fields: [
            { name: 'max_order_constraint', component: 'NumberInput', label: 'Max Order Count', description: 'Show only if user orders <= Y' },
            { name: 'min_order_constraint', component: 'NumberInput', label: 'Min Order Count', description: 'Show only if user orders >= X' },
        ],
    },
    item: {
        label: 'Item-Level Filters',
        description: 'Applied to widget items (filter_dict on WidgetItem model)',
        fields: [
            { name: 'in_stk_item_codes', component: 'ProductListInput', label: 'Mandatory In-Stock Items', description: 'Only show if these items are in stock' },
        ],
    },
    product: {
        label: 'Product-Level Filters',
        description: 'Applied to individual products (product_filter_dict on WidgetItem)',
        fields: [
            { name: 'category', component: 'TextInput', label: 'Category', operators: ['in', 'equal'] },
            { name: 'sub_category', component: 'TextInput', label: 'Sub-Category', operators: ['in', 'equal'] },
            { name: 'mrp', component: 'NumberInput', label: 'MRP', operators: ['lte', 'gte', 'lt', 'gt', 'equal'] },
            { name: 'sp', component: 'NumberInput', label: 'Selling Price', operators: ['lte', 'gte', 'lt', 'gt', 'equal'] },
            { name: 'discount', component: 'NumberInput', label: 'Discount %', operators: ['lte', 'gte', 'lt', 'gt', 'equal'] },
        ],
    },
};

export const APP_CONFIG_FIELDS = {
    fields: [
        { name: 'allow_android', component: 'ToggleInput', label: 'Allow Android', default: true },
        { name: 'allow_ios', component: 'ToggleInput', label: 'Allow iOS', default: true },
        { name: 'min_android_version', component: 'VersionInput', label: 'Min Android Version' },
        { name: 'max_android_version', component: 'VersionInput', label: 'Max Android Version' },
        { name: 'min_ios_version', component: 'VersionInput', label: 'Min iOS Version' },
        { name: 'max_ios_version', component: 'VersionInput', label: 'Max iOS Version' },
    ],
};

// ── State Products — Shared "Add State" Configuration ──
// Used across all widgets that support state-wise products.
export const STATE_PRODUCT_CONFIG = {
    globalRequired: true,
    globalLabel: 'Global Products',
    globalHelperText: 'Required. These products are shown to all users.',
    addStateButtonLabel: '+ Add State',
    removeStateIcon: '✕',
    availableStates: [
        { key: 'global', label: 'Global', levelTag: 'global', levelProperty: 'global', slugSuffix: '_global', removable: false },
        { key: 'jh', label: 'Jharkhand', levelTag: 'state', levelProperty: 'jharkhand', slugSuffix: '_jh', removable: true },
        { key: 'cg', label: 'Chhattisgarh', levelTag: 'state', levelProperty: 'chhattisgarh', slugSuffix: '_cg', removable: true },
        { key: 'wb', label: 'West Bengal', levelTag: 'state', levelProperty: 'west bengal', slugSuffix: '_wb', removable: true },
        { key: 'up', label: 'Uttar Pradesh', levelTag: 'state', levelProperty: 'uttar pradesh', slugSuffix: '_up', removable: true },
        { key: 'patna', label: 'Patna', levelTag: 'state', levelProperty: 'patna', slugSuffix: '_patna', removable: true },
    ],
    productInputConfig: {
        component: 'TextInput',
        placeholder: 'Comma-separated item codes (e.g. 1001, 1002, 1003)',
        validation: {
            required: true,
            pattern: /^(\d+)(,\s*\d+)*$/,
        },
        errorMessage: 'Enter comma-separated numeric product codes',
    },
};

// ── Page Type Selection — Shared Configuration ──
// Where page type is selected and what options are available.
export const PAGE_TYPE_CONFIG = {
    options: [
        { label: 'Product Listing Page', value: 'product_listing_page', description: 'Flat product grid — all products in a single scrollable list' },
        { label: 'Category Page', value: 'category_page', description: 'Categorized browsing — sub-category tabs/cards for navigation' },
    ],
    selectionLevel: {
        product_rail: { level: 'per_widget', default: 'product_listing_page', description: 'Same page type for entire widget' },
        collection_banner_scroll: { level: 'per_item', default: 'product_listing_page', description: 'Each carousel item can have its own page type' },
        collection_banner_stick: { level: 'per_item', default: 'category_page', description: 'Each category item can have its own page type' },
        masthead_secondary: { level: 'per_item', default: 'category_page', description: 'Each carousel item can have its own page type' },
    },
};

// ── Complete Flow Map: Widget Type → User Journey ──
// Quick reference for what steps each widget type requires.
// NOTE: Product Rail standard & optimized have identical user flows (both include state-wise products).
// The only difference is the backend widget_type naming (_v2 suffix) and widget slug (_spr vs _spr_opt).
export const CREATION_FLOW_MAP = {
    product_rail: {
        standard: {
            condition: 'is_optimized === false',
            steps: [
                { step: 1, action: 'pnc', description: 'Select rows (1/2), optimized OFF' },
                { step: 2, action: 'fields', description: 'Page type, slug, title EN/HI, products' },
                { step: 3, action: 'fields', description: 'Background media (optional → triggers multimedia)' },
                { step: 4, action: 'stateProducts', description: 'Global products (required) + state-wise overrides' },
                { step: 5, action: 'fields', description: 'View all page slug (optional override)' },
                { step: 6, action: 'advanced', description: 'OOS, PB tag, PB reorder' },
                { step: 7, action: 'filters', description: 'Widget/item/product filters' },
                { step: 8, action: 'appConfig', description: 'Version constraints' },
            ],
            resolvedVariant: 'single_product_row | double_product_row | multimedia_*',
            deployStrategy: 'STANDARD',
        },
        optimized: {
            condition: 'is_optimized === true',
            steps: [
                { step: 1, action: 'pnc', description: 'Select rows (1/2), optimized ON' },
                { step: 2, action: 'fields', description: 'Page type, slug, title EN/HI, products' },
                { step: 3, action: 'fields', description: 'Background media (optional → triggers multimedia)' },
                { step: 4, action: 'stateProducts', description: 'Global products (required) + state-wise overrides' },
                { step: 5, action: 'advanced', description: 'OOS, PB tag, PB reorder' },
                { step: 6, action: 'filters', description: 'Widget/item/product filters' },
                { step: 7, action: 'appConfig', description: 'Version constraints' },
            ],
            resolvedVariant: 'single_product_row_v2 | double_product_row_v2 | multimedia_*_v2',
            deployStrategy: 'OPTIMIZED',
        },
    },

    collection_banner: {
        scroll: {
            condition: 'displayMode === scroll',
            steps: [
                { step: 1, action: 'pnc', description: 'Select Scroll mode' },
                { step: 2, action: 'fields', description: 'Slug, title, media number' },
                { step: 3, action: 'nestedItems', description: 'Add carousel items (1-50)', itemSchema: 'scrollItem' },
                { step: '3a', action: 'perItem', description: 'Per item: image, title, page type, products' },
                { step: '3b', action: 'perItemStates', description: 'Per item: global + state-wise products' },
                { step: 4, action: 'advanced', description: 'OOS, PB tag, PB reorder' },
                { step: 5, action: 'filters', description: 'Widget/item/product filters' },
                { step: 6, action: 'appConfig', description: 'Version constraints' },
            ],
            resolvedVariant: 'carousel',
            deployStrategy: 'SCROLL',
        },
        stick: {
            condition: 'displayMode === stick',
            steps: [
                { step: 1, action: 'pnc', description: 'Select Stick mode' },
                { step: 2, action: 'fields', description: 'Slug, title EN, title HI' },
                { step: 3, action: 'nestedItems', description: 'Add category items (1-20)', itemSchema: 'categoryItem' },
                { step: '3a', action: 'perItem', description: 'Per item: name EN/HI, image, page type, page heading' },
                { step: '3b', action: 'perItemSubCategories', description: 'Per item: add sub-categories (1-50)' },
                { step: '3c', action: 'perSubCatStates', description: 'Per sub-cat: name, image, global + state products' },
                { step: 4, action: 'advanced', description: 'OOS, PB tag, PB reorder' },
                { step: 5, action: 'filters', description: 'Widget/item/product filters' },
                { step: 6, action: 'appConfig', description: 'Version constraints' },
            ],
            resolvedVariant: 'category',
            deployStrategy: 'STICK',
        },
    },

    masthead: {
        primary: {
            condition: 'variant === primary',
            steps: [
                { step: 1, action: 'pnc', description: 'Select Primary variant' },
                { step: 2, action: 'fields', description: 'Slug' },
                { step: 3, action: 'multimedia', description: 'Background media/video, colors, aspect ratio, dark theme' },
                { step: 4, action: 'fields', description: 'Master key (link to category pane)' },
                { step: 5, action: 'filters', description: 'Widget-level filters' },
                { step: 6, action: 'appConfig', description: 'Version constraints' },
            ],
            resolvedVariant: 'masthead_primary',
            deployStrategy: 'PRIMARY',
        },
        secondary: {
            condition: 'variant === secondary',
            steps: [
                { step: 1, action: 'pnc', description: 'Select Secondary variant' },
                { step: 2, action: 'fields', description: 'Slug' },
                { step: 3, action: 'multimedia', description: 'Background media/video, colors, aspect ratio, dark theme' },
                { step: 4, action: 'nestedItems', description: 'Add carousel items (1-20)', itemSchema: 'mastheadCarouselItem' },
                { step: '4a', action: 'perItem', description: 'Per item: text, image, page type, page heading' },
                { step: '4b', action: 'perItemSubCategories', description: 'Per item: add sub-categories (1-50)' },
                { step: '4c', action: 'perSubCatStates', description: 'Per sub-cat: name, global + state products' },
                { step: 5, action: 'advanced', description: 'OOS, PB tag, PB reorder' },
                { step: 6, action: 'filters', description: 'Widget/item/product filters' },
                { step: 7, action: 'appConfig', description: 'Version constraints' },
            ],
            resolvedVariant: 'masthead_secondary_category_hp',
            deployStrategy: 'SECONDARY',
        },
    },
};

// ── Validation Rules Per Step ──
// Pre-submit validation — checked before allowing form submission.
export const VALIDATION_RULES = {
    // Universal rules (all widget types)
    universal: [
        { field: 'slug', rule: 'required', message: 'Slug name is required' },
        { field: 'slug', rule: 'pattern', pattern: /^[a-z0-9_]+$/, message: 'Slug must be lowercase alphanumeric with underscores' },
        { field: 'slug', rule: 'length', min: 3, max: 100, message: 'Slug must be 3-100 characters' },
    ],

    // Per widget type
    product_rail: [
        { field: 'title', rule: 'required', message: 'Title (English) is required' },
        { field: 'products', rule: 'minItems', min: 1, message: 'At least 1 product code is required' },
        { field: 'products', rule: 'maxItems', max: 200, message: 'Maximum 200 product codes allowed' },
        { field: 'pageType', rule: 'required', message: 'Page type is required' },
        { field: 'stateProducts.global', rule: 'required', message: 'Global products required for all Product Rail variants' },
    ],

    collection_banner: [
        { field: 'title', rule: 'required', message: 'Title is required' },
        { field: 'scrollItems', rule: 'minItemsIf', condition: 'displayMode === scroll', min: 1, message: 'At least 1 carousel item required' },
        { field: 'categoryItems', rule: 'minItemsIf', condition: 'displayMode === stick', min: 1, message: 'At least 1 category item required' },
        { field: 'scrollItems.*.image', rule: 'requiredIf', condition: 'displayMode === scroll', message: 'Banner image required per carousel item' },
        { field: 'categoryItems.*.image', rule: 'requiredIf', condition: 'displayMode === stick', message: 'Category image required per item' },
        { field: 'categoryItems.*.subCategories', rule: 'minItemsIf', condition: 'displayMode === stick', min: 1, message: 'At least 1 sub-category per item' },
    ],

    masthead: [
        { field: 'carouselItems', rule: 'minItemsIf', condition: 'variant === secondary', min: 1, message: 'At least 1 carousel item required for Secondary' },
        { field: 'carouselItems.*.image', rule: 'requiredIf', condition: 'variant === secondary', message: 'Carousel image required per item' },
        { field: 'carouselItems.*.subCategories', rule: 'minItemsIf', condition: 'variant === secondary', min: 1, message: 'At least 1 sub-category per carousel item' },
    ],
};

// ── UI Component Registry ──
// Maps component names used in field configs to actual React components.
export const UI_COMPONENT_REGISTRY = {
    TextInput: { file: 'src/components/Inputs/TextInput.jsx', description: 'Single-line text input with validation' },
    SlugBuilder: { file: 'src/components/Inputs/SlugBuilder.jsx', description: 'Slug input with sanitization + preview' },
    NumberInput: { file: 'src/components/Inputs/NumberInput.jsx', description: 'Numeric input with min/max' },
    UrlInput: { file: 'src/components/Inputs/UrlInput.jsx', description: 'URL input with protocol validation' },
    VersionInput: { file: 'src/components/Inputs/VersionInput.jsx', description: 'Semantic version input (x.y.z)' },
    PillSelector: { file: 'src/components/Inputs/PillSelector.jsx', description: 'Horizontal pill toggle buttons' },
    ToggleInput: { file: 'src/components/Inputs/ToggleInput.jsx', description: 'Boolean switch / checkbox' },
    SelectInput: { file: 'src/components/Inputs/SelectInput.jsx', description: 'Dropdown select' },
    ProductListInput: { file: 'src/components/Inputs/ProductListInput.jsx', description: 'Comma-separated product code input with fetch' },
    ImageUpload: { file: 'src/components/Inputs/ImageUpload.jsx', description: 'File upload with preview' },
    ColorPicker: { file: 'src/components/Inputs/ColorPicker.jsx', description: 'Hex color selector' },
    StateProductEditor: { file: 'src/components/Inputs/StateProductEditor.jsx', description: 'Global + dynamic state product lists' },
    ScrollItemEditor: { file: 'src/components/Editors/ScrollItemEditor.jsx', description: 'Collection Banner carousel item editor' },
    CategoryItemEditor: { file: 'src/components/Editors/CategoryItemEditor.jsx', description: 'Collection Banner category item editor' },
    CarouselItemEditor: { file: 'src/components/Editors/CarouselItemEditor.jsx', description: 'Masthead Secondary carousel item editor' },
    FilterEditor: { file: 'src/components/Editors/FilterEditor.jsx', description: 'Widget/item/product filter editor' },
    AppConfigEditor: { file: 'src/components/Editors/AppConfigEditor.jsx', description: 'Platform toggles + version constraints' },
};

// ── Related Files ──
export const RELATED_FILES = {
    wiki: 'wiki/STEP-Create-Widget.md',
    backendCreation: 'src/config/Feature/CreationConfig.js',
    widgetConfigs: {
        productRail: 'src/config/widgets/SPRConfig.js',
        collectionBanner: 'src/config/widgets/CollectionBannerConfig.js',
        masthead: 'src/config/widgets/MastheadConfig.js',
    },
    widgetRegistry: 'src/config/WidgetRegistry.js',
    widgetLibrary: 'src/components/Sidebar/WidgetLibrary.jsx',
    propertyEditor: 'src/components/Sidebar/PropertyEditor.jsx',
    inputRegistry: 'src/components/Inputs/InputRegistry.js',
};
