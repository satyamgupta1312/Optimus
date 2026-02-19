/**
 * BackendFlow — End-to-End Widget Lifecycle Config
 *
 * This is the single source of truth for the complete backend workflow:
 * UI Input → Submit → Validation → Approval → Backend API Deployment
 *
 * Wiki Reference: wiki/Backend-work-flow.md
 *
 * Architecture:
 *   UI (Canvas) → Google Sheet (PENDING) → Apps Script (Validation + Routing)
 *   → Backend API (POST widget / widget_item / page_layout / mappings)
 */

// ── Workflow Stages ──
// The ordered stages a widget passes through from creation to deployment.
export const WORKFLOW_STAGES = {
    DRAFT: {
        label: 'Draft',
        description: 'Maker is creating or editing widgets. Canvas is editable.',
        allowedRoles: ['MAKER', 'CHECKER', 'SUPER_ADMIN'],
        editableBy: ['MAKER'],
        next: ['PENDING'],
    },
    PENDING: {
        label: 'Pending Review',
        description: 'Maker has submitted. Canvas is locked. Checker can review.',
        allowedRoles: ['CHECKER', 'SUPER_ADMIN'],
        editableBy: [],
        next: ['APPROVED', 'REJECTED'],
    },
    APPROVED: {
        label: 'Approved',
        description: 'Checker approved. Backend API calls triggered. Widgets are live.',
        allowedRoles: ['CHECKER', 'SUPER_ADMIN'],
        editableBy: [],
        next: ['DRAFT'], // via Re-open
    },
    REJECTED: {
        label: 'Rejected',
        description: 'Checker rejected. Maker can re-edit and re-submit.',
        allowedRoles: ['MAKER', 'CHECKER', 'SUPER_ADMIN'],
        editableBy: ['MAKER'],
        next: ['PENDING'],
    },
};

// ── Role Permissions ──
// What each role can do at each workflow stage.
export const ROLE_PERMISSIONS = {
    MAKER: {
        canCreate: true,
        canEdit: true,           // Only in DRAFT / REJECTED
        canDelete: true,         // Only in DRAFT / REJECTED
        canSubmit: true,         // Only in DRAFT / REJECTED
        canApprove: false,
        canReject: false,
        canReopen: false,
        canDeploy: false,
    },
    CHECKER: {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canSubmit: false,
        canApprove: true,        // Only in PENDING
        canReject: true,         // Only in PENDING
        canReopen: true,         // Only in APPROVED
        canDeploy: true,         // Only in APPROVED
    },
    SUPER_ADMIN: {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canSubmit: true,
        canApprove: true,
        canReject: true,
        canReopen: true,
        canDeploy: true,
        canManageCheckers: true, // Unique to SUPER_ADMIN
    },
};

// ── Submit Payload Schema ──
// The shape of data sent to Google Sheet when Maker submits.
export const SUBMIT_PAYLOAD_SCHEMA = {
    action: 'create',                          // Google Sheet action
    id: '<crypto.randomUUID()>',               // Unique request ID
    user: '<AuthContext.user.email>',          // Maker's email
    type: 'Homepage Update',                   // Request type
    status: 'PENDING',                         // Initial status
    date: '<new Date().toISOString()>',        // Submission timestamp
    widgets: '<Array of canvas widgets>',      // All canvas widgets (JSON)
    headerWidgets: {
        primaryMasthead: '<Object or null>',
        secondaryMasthead: '<Object or null>',
        categoryMasthead: '<Object or null>',
    },
};

// ── Google Sheet Columns ──
// Maps payload fields to their Google Sheet column positions.
export const SHEET_COLUMNS = {
    A: { field: 'id', type: 'string', example: '550e8400-e29b-41d4-...' },
    B: { field: 'user', type: 'string', example: 'john.doe@apnamart.in' },
    C: { field: 'type', type: 'string', example: 'Homepage Update' },
    D: { field: 'status', type: 'enum', values: ['PENDING', 'APPROVED', 'REJECTED'] },
    E: { field: 'date', type: 'ISO8601', example: '2026-02-19T07:30:00.000Z' },
    F: { field: 'widgets', type: 'JSON', example: '[{type:"Single Product Row",...}]' },
    G: { field: 'headerWidgets', type: 'JSON', example: '{primaryMasthead:{...}}' },
};

// ── Validation Rules ──
// Fields validated by Apps Script (handleApprove) before any API call is made.
export const VALIDATION_RULES = {
    // Fields required on every widget
    universal: [
        { field: 'type', rule: 'required', error: 'Widget type is missing' },
        { field: 'slug', rule: 'required', error: 'slug_name cannot be empty' },
        { field: 'title', rule: 'required', error: 'heading_en / text_en cannot be empty' },
        { field: 'startTime', rule: 'datetime', error: 'start_time format must be YYYY-MM-DD HH:MM:SS' },
        { field: 'endTime', rule: 'datetime', error: 'end_time format must be YYYY-MM-DD HH:MM:SS' },
    ],
    // Fields required per widget type
    perType: {
        'Single Product Row': [
            { field: 'products', rule: 'minItems:1', error: 'product_list cannot be empty' },
        ],
        'Single Product Row Optimize': [
            { field: 'products', rule: 'minItems:1', error: 'product_list cannot be empty' },
        ],
        'Primary Masthead': [
            {
                field: 'background_multimedia',
                rule: 'omitIfEmpty',
                error: 'Background Multimedia Name is invalid — omit field if empty',
            },
        ],
        'Banner With Product Listing': [
            { field: 'items', rule: 'minItems:1', error: 'At least 1 carousel item required' },
        ],
        'Category Grid': [
            { field: 'items', rule: 'minItems:1', error: 'At least 1 category item required' },
        ],
    },
};

// ── Approval Routing ──
// Maps internal widget type (from canvas) → Apps Script function name.
export const APPROVAL_ROUTING = {
    'Single Product Row Optimize': {
        script: 'scripts/Approval_Automation.gs',
        fn: 'createSPROptimizedWidget',
        description: 'PLP Ecosystem + Homepage Row',
    },
    'Single Product Row': {
        script: 'scripts/Approval_Automation.gs',
        fn: 'createSPRStandardWidget',
        description: 'Standard Widget + Page Layout + Mappings',
    },
    'Banner With Product Listing': {
        script: 'scripts/Approval_Automation.gs',
        fn: 'createCLPWidget',
        description: 'Carousel + PLP Ecosystem per item',
    },
    'Primary Masthead': {
        script: 'scripts/Approval_Automation.gs',
        fn: 'createPrimaryMastheadFromApproval',
        description: 'Multimedia (optional) + Masthead Widget',
    },
    'Category Grid': {
        script: 'scripts/Approval_Automation.gs',
        fn: 'createCategoryGridFromApproval',
        description: 'Category Grid + PLP Ecosystems per item',
    },
    'Category Masthead': {
        script: 'scripts/Approval_Automation.gs',
        fn: 'createCategoryGridFromApproval',
        description: 'Same as Category Grid',
    },
};

// ── API Endpoints ──
// All backend REST endpoints used during widget creation.
export const BACKEND_ENDPOINTS = {
    widgetItem: { url: '/api/app/post_widget_item/', method: 'POST', contentType: 'multipart/form-data' },
    widget: { url: '/api/app/widget/', method: 'POST', contentType: 'multipart/form-data' },
    pageLayout: { url: '/api/app/post_page_layout/', method: 'POST', contentType: 'application/json' },
    multimedia: { url: '/api/app/multimedia/', method: 'POST', contentType: 'multipart/form-data' },
    fetchWidget: { url: '/api/app/widget/', method: 'GET', param: 'slug_name' },
    fetchItem: { url: '/api/app/widget_item/', method: 'GET', param: 'slug_name' },
};

// ── Approval Response Schema ──
// Shape of response returned by Apps Script after approval.
export const APPROVAL_RESPONSE_SCHEMA = {
    success: '<boolean>',
    message: '<string>',
    results: [
        {
            widget: '<widget title>',
            status: 'success | failed | skipped',
            slug: '<created backend slug>',
            error: '<error message if failed>',
        },
    ],
    errors: '<Array of failed widget objects>',
};

// ── Fetched Widget Markers ──
// Properties added to canvas widgets that were fetched from the backend.
// Used by Apps Script to decide CREATE vs UPDATE on approval.
export const FETCHED_WIDGET_MARKERS = {
    _fetched: true,              // Identifies widget as fetched (not newly created)
    slug: '<original_slug>',     // Original backend slug — preserved throughout editing
    _rawData: '<API response>',  // Original API response snapshot
};

// ── Error Catalogue ──
// Known validation errors with their causes and fixes.
export const ERROR_CATALOGUE = [
    {
        error: 'product_list cannot be empty',
        widgets: ['Single Product Row', 'Single Product Row Optimize'],
        cause: 'No product codes entered in the form',
        fix: 'Add at least 1 product code in the Products field',
    },
    {
        error: 'Background Multimedia Name is invalid',
        widgets: ['Primary Masthead', 'Secondary Masthead', 'Single Product Row'],
        cause: 'background_multimedia field sent as empty string',
        fix: 'Do not include the background_multimedia field if no media is uploaded',
    },
    {
        error: 'slug_name already exists',
        widgets: ['Any'],
        cause: 'The slug is already taken on the backend',
        fix: 'Use a unique slug — append timestamp or different base',
    },
    {
        error: 'start_time / end_time format invalid',
        widgets: ['Any'],
        cause: 'Date not in expected format',
        fix: 'Use format: YYYY-MM-DD HH:MM:SS',
    },
    {
        error: 'Type not supported',
        widgets: ['Any'],
        cause: 'Widget type not registered in Approval_Automation.gs switch-case',
        fix: 'Add a new case in handleApprove() in Approval_Automation.gs',
    },
    {
        error: 'Session expired (403)',
        widgets: ['Any'],
        cause: 'Apps Script session cookies are expired',
        fix: 'Refresh COOKIES constant in Approval_Automation.gs',
    },
];

// ── Workflow Summary (for WidgetRegistry integration) ──
// Consumed by WidgetRegistry.getWorkflowConfig() to expose workflow info.
// Updated: Feb 2026 — synced with wiki/Backend-work-flow.md §9 (Reliability Improvements)
//                     and wiki/FEATURE-Fetch-Widget.md §11 (Fetched Widget Re-Deploy)
export const WORKFLOW_SUMMARY = {
    name: 'Backend Work Flow',
    version: '2.0',                     // Bumped: reliability improvements + widget selection
    wikiRef: 'wiki/Backend-work-flow.md',
    wikiSections: {
        widgetSelection: 'wiki/Backend-work-flow.md#step-71--widget-selection-approve-se-pehle',
        reliabilityImprovements: 'wiki/Backend-work-flow.md#9-reliability-improvements',
        fetchWidgetReDeploy: 'wiki/FEATURE-Fetch-Widget.md#11-fetched-widget-re-deploy-patch-flow',
    },
    stages: Object.keys(WORKFLOW_STAGES),
    roles: Object.keys(ROLE_PERMISSIONS),
    sheet: {
        name: 'Requests',
        appsScriptId: 'AKfycbwGI4r4nDqo5iKIYubUGpAUTaDN-Z1Su_fsD8EmQ7bxIP3XB0HmEdfXFG89hk0uMVZfBQ',
    },
};

// ── Widget Selection Config ─────────────────────────────────────────────────
// Controls Checker's partial widget selection in RequestQueue before approval.
// Mirrors the rules documented in wiki/Backend-work-flow.md — Step 7.1
export const WIDGET_SELECTION_CONFIG = {
    // Minimum widgets that must be selected before Approve is allowed
    minSelection: 1,

    // Separate selection sets for body vs header widgets
    bodySelectionKey: 'selectedWidgets',           // Map<reqId, Set<widgetIndex>>
    headerSelectionKey: 'selectedHeaderWidgets',   // Map<reqId, Set<headerKey>>

    // Supported header widget keys (must match req.headerWidgets shape)
    headerWidgetKeys: ['primaryMasthead', 'secondaryMasthead'],

    // If true, Maker role does not see checkboxes (read-only list)
    makerReadOnly: true,

    // Status where selection UI is shown
    allowedStatuses: ['PENDING'],
};


// ── Session Auto-Refresh Config ─────────────────────────────────────────────
// Used by withSessionRetry.js to handle 403 / expired-session recovery.
// Wiki Reference: wiki/Backend-work-flow.md — Session Auto-Refresh
export const SESSION_CONFIG = {
    maxRetryOn403: 2,                   // Max times to retry after a 403
    refreshEndpoint: '/login/',          // GET this URL to refresh CSRF cookie
    cookieName: 'csrftoken',             // Name of the CSRF cookie
};

// ── Retry Config (Exponential Backoff) ─────────────────────────────────────
// Used by BackendSyncService.fetchWithRetry() for transient server errors.
// Wiki Reference: wiki/Backend-work-flow.md — Retry Logic
export const RETRY_CONFIG = {
    maxRetries: 3,                       // Total attempts (1 original + 2 retries)
    baseDelayMs: 500,                    // First retry delay in ms
    backoffMultiplier: 2,                // Each retry: delay × multiplier (500 → 1000 → 2000)
    retryOnStatus: [500, 502, 503, 504], // HTTP status codes that trigger a retry
};

// ── Fetched Widget Update Strategy ─────────────────────────────────────────
// Defines how fetched (existing) widgets are identified and re-deployed.
// Wiki Reference: wiki/FEATURE-Fetch-Widget.md — Re-Deploy Flow
export const FETCHED_WIDGET_UPDATE_STRATEGY = {
    checkMarker: '_fetched',             // Presence of this flag → widget already on backend
    slugField: 'slug_name',              // Field containing the existing backend slug
    preferMethod: 'PATCH',              // Prefer PATCH for updates; falls back to POST if PATCH 405
    skipSlugCheck: true,                 // Skip slug uniqueness check for fetched widgets
};
