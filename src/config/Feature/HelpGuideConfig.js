/**
 * Help Guide Configuration — Source of Truth
 *
 * All guide data for the floating Help Guide button (HelpGuide.jsx).
 * Edit this file to add/update/remove guide categories or steps.
 * No changes to the component are needed.
 *
 * Exports:
 *   GUIDE_COLORS     — Tailwind gradient class mappings per color key
 *   GUIDE_CATEGORIES — Array of 6 guide categories with steps/subGuides
 *   RELATED_FILES    — Links to source configs and wiki docs
 *
 * Wiki Reference: wiki/FEATURE-Help-Guide.md
 *
 * Source Components:
 *   - HelpGuide:               src/components/HelpGuide.jsx
 *   - stepCreateWidgetConfig:  src/config/Feature/stepCreateWidgetConfig.js
 */

// ── Tailwind Gradient Classes Per Color ──
export const GUIDE_COLORS = {
    indigo: 'from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700',
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    amber: 'from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
    teal: 'from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700',
};

// ── Guide Categories ──
// icon values are string keys resolved via ICON_MAP in HelpGuide.jsx
export const GUIDE_CATEGORIES = [
    // ─── 1. Widget SOPs ───
    {
        id: 'widget-sops',
        title: 'Widget SOPs (Step-by-Step)',
        icon: 'Wrench',
        color: 'indigo',
        steps: [
            {
                title: 'Select a Widget Type',
                description: 'Choose which widget you want to configure from the list below to see its Standard Operating Procedure (SOP).',
                tip: 'Each widget type has a unique creation flow based on its PNC (variant) selection',
            },
        ],
        subGuides: [
            // ── Product Rail ──
            {
                title: 'Product Rail',
                steps: [
                    {
                        title: '1. Select PNC (Variant Properties)',
                        description: '• **Layout**: Single Row (1) or Double Row (2)\n• **Optimized**: ON (default) adds quick-action "Add to Cart" buttons\n• **Multimedia**: Auto-enabled when you upload a background image/video',
                        tip: 'These 3 toggles produce 8 possible variants — the system resolves them automatically',
                    },
                    {
                        title: '2. Page Type & Slug',
                        description: '• **Page Type**: Product Listing Page (flat grid) or Category Page (tabbed navigation)\n• **Slug Name**: Auto-generated from your title, or enter manually (lowercase, underscores only)',
                        tip: 'Slug is used as the unique identifier for deployment and mapping',
                    },
                    {
                        title: '3. Title & Products',
                        description: '• **Title (English)**: Required — displayed as the section heading\n• **Title (Hindi)**: Optional translation\n• **Products**: Enter comma-separated product codes (e.g. 1001, 1002, 1003)',
                        tip: 'Product details (name, image, price) are auto-fetched from the catalog',
                    },
                    {
                        title: '4. State-Wise Products',
                        description: '• **Global Products**: Required — shown to all users everywhere\n• Click **"+ Add State"** to add state-specific product overrides\n• Available states: Jharkhand, Chhattisgarh, West Bengal, Uttar Pradesh, Patna\n• State products override global products for users in that region',
                        tip: 'State-wise products appear for ALL Product Rail variants (standard & optimized)',
                    },
                    {
                        title: '5. Background Media (Optional)',
                        description: '• Upload a **background image** (JPG, PNG, WEBP) or paste a **video URL**\n• Uploading media automatically enables the "Multimedia" variant\n• The multimedia slug is auto-generated from your widget slug + "_bg"',
                        tip: 'Skip this step for a plain white background — most common for standard Product Rails',
                    },
                    {
                        title: '6. App Config & Submit',
                        description: '• Open **App Config** panel for advanced settings:\n  - OOS Product Count, PB Tag, PB Reorder\n  - Widget/Item/Product level filters\n  - Platform toggles (Android/iOS) & version constraints\n• Click **"Save Request"** to submit for approval',
                        tip: 'App Config is optional — defaults work for most use cases',
                    },
                ],
            },

            // ── Collection Banner ──
            {
                title: 'Collection Banner',
                steps: [
                    {
                        title: '1. Select PNC (Display Mode)',
                        description: '• **Scroll**: Horizontal carousel banners — users swipe through promotional cards\n• **Stick**: 4-column category grid — icon-based navigation tiles',
                        tip: 'Display mode changes the entire form — Scroll shows carousel items, Stick shows category items',
                    },
                    {
                        title: '2. Slug & Title',
                        description: '• **Slug Name**: Unique identifier (auto-generated or manual)\n• **Title (English)**: Required section heading\n• **Title (Hindi)**: Required for Stick mode, optional for Scroll\n• **Media Number**: Scroll mode only — aspect ratio hint (e.g. 3.5)',
                        tip: 'Stick mode requires both English and Hindi titles for bilingual display',
                    },
                    {
                        title: '3. Carousel Items (Scroll) / Category Items (Stick)',
                        description: '**Scroll mode:**\n• Click **"+ Add Carousel Item"** (1–50 items)\n• Per item: Banner Image, Title, Page Type, Product Codes\n• Each item has its own state-wise products\n\n**Stick mode:**\n• Click **"+ Add Category Item"** (1–20 items)\n• Per item: Category Name (EN/HI), Image, Page Type, Page Heading',
                        tip: 'Scroll items link to product pages; Stick items link to category browsing pages',
                    },
                    {
                        title: '4. Sub-Categories & State Products',
                        description: '**Stick mode only:**\n• Each category item has **sub-categories** (1–50 per item)\n• Sub-categories have: Name (EN/HI), Image\n• Each sub-category has its own **state-wise products**\n\n**Scroll mode:**\n• State products are configured per carousel item directly',
                        tip: 'Stick mode has the deepest nesting: Widget → Category → Sub-Category → State Products (3 levels)',
                    },
                    {
                        title: '5. App Config & Submit',
                        description: '• Open **App Config** panel for:\n  - Advanced settings (OOS, PB Tag, PB Reorder)\n  - Filters (widget/item/product level)\n  - Platform & version constraints\n• Click **"Save Request"** to submit',
                        tip: 'Review all carousel/category items before submitting — each item needs complete data',
                    },
                ],
            },

            // ── Masthead ──
            {
                title: 'Masthead',
                steps: [
                    {
                        title: '1. Select PNC (Variant)',
                        description: '• **Primary**: Full-width header with multimedia background and category icons\n• **Secondary**: Promotional carousel below the primary masthead',
                        tip: 'Primary is always at the top of the page; Secondary appears just below it',
                    },
                    {
                        title: '2. Slug',
                        description: '• Enter a unique **Slug Name** (e.g. "diwali_2024_header")\n• The background multimedia slug is auto-generated: slug + "_bg"',
                        tip: 'Keep slugs descriptive — they\'re used for deployment tracking and history',
                    },
                    {
                        title: '3. Multimedia & Colors',
                        description: '• Upload **Background Image** or paste **Video URL**\n• Configure colors:\n  - **Transition Color**: Background gradient color\n  - **Accent Color**: Highlight/CTA color\n  - **Text Color**: Overlay text color\n  - **Icon BG Color**: Category icon background\n• Toggle **Dark Theme** for dark backgrounds\n• Set **Aspect Ratio** (Primary default: 1, Secondary default: 4)',
                        tip: 'Use the ColorPicker for easy hex selection — click the swatch to open the picker',
                    },
                    {
                        title: '4. Primary: Master Key / Secondary: Carousel Items',
                        description: '**Primary variant:**\n• Enter **Master Key** — links to a category pane (e.g. "1020")\n\n**Secondary variant:**\n• Click **"+ Add Carousel Item"** (1–20 items)\n• Per item: Display Text, Image, Page Type, Page Heading\n• Each item has sub-categories (1–50) with state-wise products',
                        tip: 'Secondary Masthead nesting: Widget → Carousel → Sub-Categories → State Products (3 levels deep)',
                    },
                    {
                        title: '5. App Config & Submit',
                        description: '• Open **App Config** for filters and version constraints\n• Primary: Widget-level filters only\n• Secondary: Full filter suite + advanced settings\n• Click **"Save Request"** to submit for approval',
                        tip: 'Primary Masthead has simpler config — Secondary has full nested item editing',
                    },
                ],
            },
        ],
    },

    // ─── 2. General Creation Flow ───
    {
        id: 'creation-flow',
        title: 'General Creation Flow',
        icon: 'Sparkles',
        color: 'blue',
        steps: [
            {
                title: 'Step 1: Select Widget Type',
                description: 'Open the **Widget Library** dropdown in the sidebar and choose:\n• **Product Rail** — Scrollable product cards\n• **Collection Banner** — Carousel banners or category grid\n• **Masthead** — Header with multimedia background\n\nClick **"+"** to add the widget to your canvas.',
                tip: 'Only 3 widget types exist — all homepage widgets are variants of these three',
            },
            {
                title: 'Step 2: Configure PNC (Variant)',
                description: 'After adding the widget, the **Property Editor** opens automatically.\n\nSelect variant properties using **pill selectors** and **toggles**:\n• Product Rail: Layout (rows), Optimized, Multimedia\n• Collection Banner: Scroll or Stick mode\n• Masthead: Primary or Secondary',
                tip: 'PNC selection changes which fields appear in the form',
            },
            {
                title: 'Step 3: Fill Content Fields',
                description: 'Complete the required fields:\n• **Slug Name**: Unique widget identifier\n• **Title**: Section heading (English, optionally Hindi)\n• **Products/Items**: Product codes or nested items\n• **Media**: Background images, videos, or Lottie',
                tip: 'Required fields are marked — optional fields have sensible defaults',
            },
            {
                title: 'Step 4: State Products / Nested Items',
                description: '• **Product Rail**: Add state-wise product overrides (Global is required)\n• **Collection Banner (Scroll)**: Configure carousel items with per-item state products\n• **Collection Banner (Stick)**: Add category items → sub-categories → state products\n• **Masthead (Secondary)**: Add carousel items → sub-categories → state products',
                tip: 'Global products are always required — state-specific products override them regionally',
            },
            {
                title: 'Step 5: App Config (Optional)',
                description: 'Click the **App Config** panel button to configure:\n• **Advanced**: OOS product count, PB tag/reorder\n• **Filters**: Widget-level, item-level, product-level filters\n• **App Config**: Platform toggles (Android/iOS), version constraints',
                tip: 'Most widgets work fine with default App Config — only change if needed',
            },
            {
                title: 'Step 6: Submit for Approval',
                description: '• Review all fields in the Property Editor\n• Click **"Save Request"** in the toolbar\n• Your widget enters **PENDING** status\n• A Checker will review and approve/reject it',
                tip: 'You cannot edit a widget while it\'s in PENDING status — wait for Checker action',
            },
        ],
    },

    // ─── 3. Approval Workflow ───
    {
        id: 'workflow',
        title: 'Approval Workflow',
        icon: 'Zap',
        color: 'purple',
        steps: [
            {
                title: 'Maker: Create & Submit',
                description: '1. Create or edit widgets in **DRAFT** mode\n2. Click **"Save Request"** when ready\n3. A **Selection Modal** appears — choose which widgets to include\n4. Confirm submission — status changes to **PENDING**\n5. Wait for Checker review',
                tip: 'The Selection Modal lets you submit specific widgets, not necessarily all of them',
            },
            {
                title: 'Checker: Review & Decide',
                description: '1. Open the **Approval Queue** from the dashboard\n2. Review submitted widget configurations\n3. Click **"Approve"** to accept or **"Reject"** to send back\n4. Rejected widgets return to the Maker for revisions\n5. Approved widgets proceed to deployment',
                tip: 'Checkers can approve individual widgets — they don\'t have to approve the entire batch',
            },
            {
                title: 'Deploy (One-Click)',
                description: '1. Approved widgets are ready for **one-click deployment**\n2. The system generates a **3-layer CSV** (Widget → Items → Products)\n3. Backend automation creates the widgets via API\n4. Deployment status is tracked in real-time',
                tip: 'Deployment is automated — no manual Google Sheets or scripts needed',
            },
            {
                title: 'Map to Page (Post-Deploy)',
                description: '1. After deployment, widgets need to be **mapped to a page**\n2. Use **Homepage Mapping** to assign widgets to page positions\n3. Set priority order — lower number = higher position\n4. Widgets go live on the next app refresh',
                tip: 'Widget mapping is environment-scoped — dev, staging, and production are separate',
            },
        ],
    },

    // ─── 4. Dashboard Tools ───
    {
        id: 'dashboard-tools',
        title: 'Dashboard Tools',
        icon: 'LayoutDashboard',
        color: 'teal',
        steps: [
            {
                title: 'Choose a Tool',
                description: 'Select a dashboard tool below to learn how it works.',
                tip: 'These tools are accessible from the top navigation bar',
            },
        ],
        subGuides: [
            {
                title: 'Widget History',
                steps: [
                    {
                        title: '1. Open Widget History',
                        description: '• Click **"History"** in the top navigation\n• Browse saved widget configurations by date\n• Each entry shows: widget type, slug, timestamp, creator',
                        tip: 'History is cached in-memory for fast browsing — no API calls after first load',
                    },
                    {
                        title: '2. Load to Canvas',
                        description: '• Click any history entry to preview it\n• Click **"Load"** to restore it to the canvas\n• Edit the loaded widget as needed\n• Submit as a new request (original history is preserved)',
                        tip: 'Loading from history doesn\'t overwrite the original — it creates a new draft',
                    },
                ],
            },
            {
                title: 'Homepage Mapping',
                steps: [
                    {
                        title: '1. View Current Mappings',
                        description: '• Click **"Homepage Mapping"** in the top navigation\n• View all widgets currently mapped to the homepage\n• Mappings are **environment-scoped** (dev/staging/production)',
                        tip: 'This shows the live backend state — what users actually see in the app',
                    },
                    {
                        title: '2. Manage Mappings',
                        description: '• See widget type, slug, priority, and position for each mapping\n• Use this to verify your deployed widgets are correctly placed\n• Cross-reference with the emulator preview',
                        tip: 'Priority number determines display order — lower = higher on the page',
                    },
                ],
            },
            {
                title: 'State Manager',
                steps: [
                    {
                        title: '1. View Available States',
                        description: '• Access **State Manager** from the dashboard\n• View all configured states and cities\n• States include: Global, Jharkhand, Chhattisgarh, West Bengal, Uttar Pradesh, Patna',
                        tip: 'Global is always present and cannot be removed — it\'s the default for all users',
                    },
                    {
                        title: '2. Manage State Products',
                        description: '• Each state has a unique slug suffix (e.g. _jh, _cg, _wb)\n• State products override global products for users in that region\n• Add or remove states as needed for your widget',
                        tip: 'State configuration is shared across all widget types that support state-wise products',
                    },
                ],
            },
            {
                title: 'Fetch Widget',
                steps: [
                    {
                        title: '1. Open Fetch Widget',
                        description: '• Click **"Fetch Widget"** in the toolbar or dashboard\n• Enter the **widget slug** of an existing deployed widget\n• Click **"Fetch"** to load it',
                        tip: 'You need the exact slug name — check Homepage Mapping if unsure',
                    },
                    {
                        title: '2. Edit & Re-Submit',
                        description: '• The fetched widget loads into the Property Editor with all its data\n• Make your changes (products, title, media, etc.)\n• Submit as a new request — the original deployed widget is not affected until the new version is approved and deployed',
                        tip: 'Fetching is read-only until you submit — safe to explore without side effects',
                    },
                ],
            },
        ],
    },

    // ─── 5. Deployment Guide ───
    {
        id: 'deployment',
        title: 'Deployment Guide',
        icon: 'Rocket',
        color: 'amber',
        steps: [
            {
                title: '1. Pre-Deploy Checklist',
                description: '• Ensure the widget is **Approved** by a Checker\n• Verify all required fields are filled (slug, title, products)\n• Confirm state-wise products have Global products set\n• Check media uploads completed successfully (Drive confirmation)',
                tip: 'Deployment will fail if required fields are missing — the system validates before deploying',
            },
            {
                title: '2. Deploy Execution',
                description: '• Click **"Deploy"** on the approved widget\n• The system triggers the backend automation pipeline\n• Widget data is transformed into API-compatible payloads\n• Backend creates the Widget, WidgetItems, and Products in the database',
                tip: 'Deployment is a one-click operation — no manual CSV editing or API calls needed',
            },
            {
                title: '3. CSV Mapping (3-Layer)',
                description: 'The deployment system generates a **3-layer CSV structure**:\n\n• **Layer 1 — Widget**: Type, slug, title, background, filters\n• **Layer 2 — Widget Items**: Per-item data (images, text, page types)\n• **Layer 3 — Products**: Product codes, state mappings, sort order\n\nThis CSV drives the backend widget creation API.',
                tip: 'You don\'t need to create CSVs manually — the system generates them from your form data',
            },
            {
                title: '4. Post-Deploy Verification',
                description: '• Check the **deployment status** in the dashboard\n• Verify the widget appears in **Homepage Mapping**\n• Use **Fetch Widget** to confirm the deployed data matches your config\n• Check the **emulator preview** to see how it looks on mobile',
                tip: 'If something looks wrong, use Fetch Widget to load and compare against your original submission',
            },
        ],
    },

    // ─── 6. Tips & Tricks ───
    {
        id: 'tips-tricks',
        title: 'Tips & Tricks',
        icon: 'Lightbulb',
        color: 'green',
        steps: [
            {
                title: 'Keyboard Shortcuts',
                description: '• **Cmd/Ctrl + Z**: Undo last action\n• **Cmd/Ctrl + Shift + Z**: Redo\n• **Drag & Drop**: Reorder widgets in the emulator\n• **Enter**: Confirm product code search\n• **Tab**: Move between form fields',
                tip: 'Undo/redo works for widget additions, deletions, and reordering',
            },
            {
                title: 'Image Upload Tips',
                description: '• **Drag & drop** images directly onto the upload zone\n• **Paste from clipboard** (Cmd/Ctrl + V) in supported fields\n• Accepted formats: JPG, PNG, WEBP, GIF\n• Max file size: 5MB per image\n• Images are automatically uploaded to **Google Drive**',
                tip: 'Wait for the "Saved to Drive" confirmation before proceeding',
            },
            {
                title: 'Product Search',
                description: '• Type a product code and press **Enter** to search the catalog\n• Product details (name, image, price) auto-populate\n• Enter multiple codes as comma-separated values\n• Invalid codes are flagged with an error message',
                tip: 'Use the catalog search for verification — it confirms the product exists and is active',
            },
            {
                title: 'Slug Auto-Generation',
                description: '• Slugs are auto-generated from your widget title\n• Format: lowercase, spaces replaced with underscores\n• You can override the auto-generated slug manually\n• Slug must be unique across all widgets',
                tip: 'Descriptive slugs make it easier to find widgets in History and Homepage Mapping',
            },
            {
                title: 'Widget Duplication & Reorder',
                description: '• **Duplicate**: Click the copy icon on any widget to clone it\n• The duplicate appears below the original with all data copied\n• **Reorder**: Drag widgets up/down in the emulator preview\n• Priority is auto-updated based on visual position',
                tip: 'Duplicate a widget to quickly create variants — just change the PNC and products',
            },
        ],
    },
];

// ── Related Files ──
export const RELATED_FILES = {
    wiki: 'wiki/FEATURE-Help-Guide.md',
    component: 'src/components/HelpGuide.jsx',
    stepCreateWidgetConfig: 'src/config/Feature/stepCreateWidgetConfig.js',
    creationConfig: 'src/config/Feature/CreationConfig.js',
    makerCheckerConfig: 'src/config/Feature/MakerCheckerConfig.js',
    fetchWidgetConfig: 'src/config/Feature/FetchWidgetConfig.js',
    homepageMappingConfig: 'src/config/Feature/HomepageMappingConfig.js',
    widgetConfigs: {
        productRail: 'src/config/widgets/SPRConfig.js',
        collectionBanner: 'src/config/widgets/CollectionBannerConfig.js',
        masthead: 'src/config/widgets/MastheadConfig.js',
    },
};
