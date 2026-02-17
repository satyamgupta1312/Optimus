/**
 * Maker-Checker Configuration — Source of Truth
 *
 * Defines the approval workflow: roles, page status lifecycle,
 * transition rules, edit guards, Google Sheet storage, activity logging,
 * and approval automation routing.
 *
 * Wiki Reference: wiki/Feature-Maker-Checker.md
 *
 * Flow:
 *   Maker (creates/edits) → Submit → Checker (reviews) → Approve/Reject → Backend API Update
 */

// ── Roles ──
export const ROLES = {
    SUPER_ADMIN: {
        label: 'Super Admin',
        description: 'Full checker powers + can add/remove checkers from UI',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canSubmit: true,
        canPreview: true,
        canApprove: true,
        canReject: true,
        canReopen: true,
        canDeploy: true,
        canManageCheckers: true,
    },
    CHECKER: {
        label: 'Checker',
        description: 'Can preview, approve, reject, re-open, deploy',
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canSubmit: false,
        canPreview: true,
        canApprove: true,
        canReject: true,
        canReopen: true,
        canDeploy: true,
        canManageCheckers: false,
    },
    MAKER: {
        label: 'Maker',
        description: 'Can create, edit, delete widgets; submit for review',
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canSubmit: true,
        canPreview: true,
        canApprove: false,
        canReject: false,
        canReopen: false,
        canDeploy: false,
        canManageCheckers: false,
    },
};

// ── Role Assignment ──
export const ROLE_ASSIGNMENT = {
    superAdminEmail: 'satyam.gupta@apnamart.in',
    // Step 1: AuthService.js assigns base role
    baseRoleLogic: 'superAdminEmail → SUPER_ADMIN, everyone else → MAKER',
    // Step 2: AuthContext.jsx overrides from Google Sheet checker list
    dynamicOverride: 'If email in checker list and not SUPER_ADMIN → CHECKER',
    sourceFiles: {
        authService: 'src/services/AuthService.js',
        authContext: 'src/context/AuthContext.jsx',
        googleSheetService: 'src/services/GoogleSheetService.js',
    },
};

// ── Context Helpers ──
// Provided by AuthContext.jsx
export const AUTH_CONTEXT_HELPERS = {
    isAuthenticated: '!!user',
    isSuperAdmin: "user?.role === 'SUPER_ADMIN'",
    isChecker: "user?.role === 'CHECKER' || user?.role === 'SUPER_ADMIN'",
    isMaker: "user?.role === 'MAKER'",
    checkerList: '[{email, name, addedAt}]',
    actions: ['addChecker(email, name)', 'removeChecker(email)', 'fetchCheckerList()'],
};

// ── Checker Management (Google Sheet Actions) ──
export const CHECKER_MANAGEMENT = {
    getCheckers: {
        action: 'get_approval_users',
        method: 'POST',
        payload: { action: 'get_approval_users' },
        response: '{ users: [{ email, name, addedAt }] }',
    },
    addChecker: {
        action: 'add_approval_user',
        method: 'POST',
        payload: { action: 'add_approval_user', email: '$email', name: '$name' },
    },
    removeChecker: {
        action: 'remove_approval_user',
        method: 'POST',
        payload: { action: 'remove_approval_user', email: '$email' },
    },
    ui: {
        component: 'ManageApprovalUsers',
        visibleTo: 'SUPER_ADMIN',
        trigger: '"Users" button in header',
    },
};

// ── User Object Shape ──
export const USER_OBJECT = {
    name: '$name',
    email: '$email',
    role: '$role', // SUPER_ADMIN | CHECKER | MAKER
    csrfToken: '$csrfToken',
};

// ── Page Status Lifecycle ──
export const PAGE_STATUS = {
    DRAFT: {
        label: 'Draft',
        badge: 'DRAFT',
        badgeColor: 'gray',
        animated: false,
        editable: true,
        setBy: 'System (initial) / Checker (re-open)',
        allowedActions: { maker: ['edit', 'add', 'delete', 'submit'], checker: [] },
    },
    PENDING: {
        label: 'Pending',
        badge: 'PENDING',
        badgeColor: 'amber',
        animated: true, // pulsing badge
        editable: false,
        setBy: 'Maker (submit)',
        allowedActions: { maker: [], checker: ['preview', 'approve', 'reject'] },
    },
    APPROVED: {
        label: 'Approved',
        badge: 'APPROVED',
        badgeColor: 'green',
        animated: false,
        editable: false,
        setBy: 'Checker (approve)',
        allowedActions: { maker: [], checker: ['re-open', 'deploy'] },
    },
    REJECTED: {
        label: 'Rejected',
        badge: 'REJECTED',
        badgeColor: 'red',
        animated: false,
        editable: true,
        setBy: 'Checker (reject)',
        allowedActions: { maker: ['edit', 're-submit'], checker: [] },
    },
};

// ── Status Transition Rules ──
export const STATUS_TRANSITIONS = [
    { from: 'DRAFT', to: 'PENDING', action: 'submitForReview', allowedRole: 'maker', description: 'Only Maker can submit' },
    { from: 'PENDING', to: 'APPROVED', action: 'approvePage', allowedRole: 'checker', description: 'Only Checker can approve' },
    { from: 'PENDING', to: 'REJECTED', action: 'rejectPage', allowedRole: 'checker', description: 'Only Checker can reject' },
    { from: 'APPROVED', to: 'DRAFT', action: 'resetToDraft', allowedRole: 'checker', description: 'Only Checker can re-open' },
    { from: 'REJECTED', to: 'PENDING', action: 'submitForReview', allowedRole: 'maker', description: 'Maker edits and re-submits' },
];

// ── Edit Guards ──
// All editing operations check page status before proceeding
export const EDIT_GUARDS = {
    editableStatuses: ['DRAFT', 'REJECTED'],
    guardedOperations: ['addWidget', 'updateWidget', 'deleteWidget', 'moveWidget', 'duplicateWidget', 'bulkDelete'],
    blockedMessage: 'Cannot edit while in review or approved',
    source: 'src/context/WidgetContext.jsx',
};

// ── Button Visibility Matrix ──
export const BUTTON_VISIBILITY = {
    DRAFT: { submit: true, approve: false, reject: false, reopen: false, deploy: false },
    PENDING: { submit: false, approve: true, reject: true, reopen: false, deploy: false },
    APPROVED: { submit: false, approve: false, reject: false, reopen: true, deploy: true },
    REJECTED: { submit: true, approve: false, reject: false, reopen: false, deploy: false }, // submit acts as "re-submit"
};

// ── Submit Payload (Maker → Google Sheet) ──
export const SUBMIT_PAYLOAD = {
    fields: {
        action: 'create',
        id: '$uuid', // crypto.randomUUID()
        user: '$userName', // AuthContext.user.name
        type: 'Homepage Update',
        status: 'PENDING',
        widgets: '$canvasWidgets', // All canvas widgets (JSON)
        headerWidgets: '$headerWidgets', // { primaryMasthead, secondaryMasthead } (cleaned JSON)
    },
    headerCleaning: 'File objects removed from headerWidgets for serialization',
    service: 'GoogleSheetService.createRequest()',
    onSuccess: {
        statusChange: 'PENDING',
        toast: 'Page submitted for review!',
        editLocked: true,
    },
};

// ── Google Sheet Storage ──
export const GOOGLE_SHEET = {
    sheetName: 'Requests',
    appsScriptId: 'AKfycbwGI4r4nDqo5iKIYubUGpAUTaDN-Z1Su_fsD8EmQ7bxIP3XB0HmEdfXFG89hk0uMVZfBQ',
    columns: [
        { column: 'A', field: 'id', type: 'UUID', example: '550e8400-e29b-41d4-a716-446655440000' },
        { column: 'B', field: 'user', type: 'string', example: 'john.doe@apnamart.in' },
        { column: 'C', field: 'type', type: 'string', example: 'Homepage Update' },
        { column: 'D', field: 'status', type: 'string', example: 'PENDING' },
        { column: 'E', field: 'date', type: 'ISO datetime', example: '2026-02-17T10:30:00.000Z' },
        { column: 'F', field: 'widgets', type: 'JSON string', example: '[{type:"Single Product Row",...}]' },
        { column: 'G', field: 'headerWidgets', type: 'JSON string', example: '{primaryMasthead:{...},secondaryMasthead:{...}}' },
    ],
    actions: {
        create: { method: 'POST', payload: 'Full request object', description: 'Maker submits new request' },
        update_status: { method: 'POST', payload: '{id, status}', description: 'Checker approves/rejects' },
        approve: { method: 'POST', payload: '{id, widgets, headerWidgets}', description: 'Checker approves + triggers automation' },
        fetch_products: { method: 'POST', payload: '{item_codes: [...]}', description: 'Lookup product details' },
        uploadMedia: { method: 'POST', payload: '{fileName, mimeType, fileData (base64)}', description: 'Upload media to Google Drive' },
        getAll: { method: 'GET', payload: null, description: 'Fetch all requests' },
    },
};

// ── Checker Actions ──
export const CHECKER_ACTIONS = {
    preview: {
        description: 'Restores maker widgets to canvas and renders in emulator',
        statusChange: null,
        toast: "Previewing {user}'s request",
    },
    approve: {
        description: 'Selected widgets sent to Apps Script for backend creation/update',
        service: 'GoogleSheetService.approveRequest()',
        payload: { action: 'approve', id: '$requestId', widgets: '$selectedWidgets', headerWidgets: '$selectedHeaderWidgets' },
        statusChange: 'APPROVED',
        toast: 'Widgets approved! Automation triggered successfully',
    },
    reject: {
        description: 'Status updated to REJECTED, maker can re-edit',
        service: 'GoogleSheetService.updateStatus(id, "REJECTED")',
        statusChange: 'REJECTED',
        toast: 'Page rejected. Maker can edit and resubmit',
    },
    reopen: {
        description: 'Reset APPROVED page back to DRAFT for editing',
        service: 'WidgetContext.resetToDraft()',
        statusChange: 'DRAFT',
        toast: 'Page reset to draft mode',
    },
    deploy: {
        description: 'Manual re-deployment bypassing Google Sheet (if automation failed)',
        service: 'BackendSyncService.deployRequest()',
        requiresCsrf: true,
        toast: null, // varies by result
    },
};

// ── Approval Automation Routing ──
// Apps Script handleApprove() routes each widget type to its creation function
export const APPROVAL_ROUTING = {
    source: 'scripts/Approval_Automation.gs',
    entryFunction: 'handleApprove',
    authentication: 'Hardcoded session cookies (csrftoken + sessionid) — may expire periodically',
    widgetRoutes: {
        'Single Product Row Optimize': { function: 'createSPROptimizedWidget', script: 'scripts/SPR_Optimized_Automation.gs' },
        'Single Product Row': { function: 'createSPRStandardWidget', script: 'scripts/SPR_Optimized_Automation.gs' },
        'Banner With Product Listing': { function: 'createCLPWidget', script: 'scripts/CLP_Automation.gs' },
        'Primary Masthead': { function: 'createPrimaryMastheadFromApproval', script: 'scripts/Primary_Masthead_Automation.gs' },
        'Category Grid': { function: 'createCategoryGridFromApproval', script: 'scripts/Category_Grid_Backend.gs' },
        'Category Masthead': { function: 'createCategoryGridFromApproval', script: 'scripts/Category_Grid_Backend.gs' },
        'Secondary Masthead': { function: null, script: 'scripts/Secondary_Masthead_Backend.gs', note: '3-Phase creation' },
    },
    headerWidgetRoutes: {
        primaryMasthead: { condition: 'headerWidgets.primaryMasthead?.enabled', function: 'createPrimaryMastheadFromApproval' },
        secondaryMasthead: { condition: 'headerWidgets.secondaryMasthead?.enabled', note: 'Process Secondary Masthead' },
        categoryMasthead: { condition: 'headerWidgets.categoryMasthead?.enabled', function: 'createCategoryGridFromApproval' },
    },
    // Fetched vs Created widget handling
    fetchedWidgetLogic: {
        isFetched: '_fetched === true && slug exists',
        onApprove: 'UPDATE existing widget via API',
        isNew: '_fetched is undefined',
        onApproveNew: 'CREATE new widget via API',
    },
    responseFormat: {
        success: true,
        message: 'Processed {n} widgets',
        results: [
            { widget: '$widgetName', status: 'success', slug: '$createdSlug' },
            { widget: '$widgetName', status: 'failed', error: '$errorMessage' },
            { widget: '$widgetName', status: 'skipped', error: 'Type not supported' },
        ],
        errors: [], // Array of failed widget objects
    },
};

// ── Fetched vs Created Widget Comparison ──
export const WIDGET_ORIGIN = {
    created: {
        _fetched: undefined,
        slug: 'empty or auto-generated',
        _rawData: undefined,
        onApprove: 'Create new backend records',
        slugOnBackend: 'New slug with suffix',
    },
    fetched: {
        _fetched: true,
        slug: 'Original backend slug',
        _rawData: 'Original API response',
        onApprove: 'Update existing backend records',
        slugOnBackend: 'Original slug preserved',
    },
};

// ── Activity Logging ──
export const ACTIVITY_LOG = {
    source: 'src/context/ActivityLogContext.jsx',
    maxEntries: 100,
    actions: {
        widget_added: { logged: '{widgetId, type, title}', triggeredBy: 'addWidget()' },
        widget_updated: { logged: '{widgetId, changes: [fieldNames]}', triggeredBy: 'updateWidget()' },
        widget_deleted: { logged: '{widgetId, type}', triggeredBy: 'deleteWidget()' },
        widget_duplicated: { logged: '{originalId, newId}', triggeredBy: 'duplicateWidget()' },
        bulk_delete: { logged: '{count, widgetIds}', triggeredBy: 'bulkDelete()' },
        state_restored: { logged: '{timestamp}', triggeredBy: 'restoreFromHistory()' },
        comment_added: { logged: '{widgetId, commentId}', triggeredBy: 'addComment()' },
        comment_deleted: { logged: '{commentId}', triggeredBy: 'deleteComment()' },
    },
};

// ── Error Handling ──
export const ERROR_HANDLING = {
    submitFails: { behavior: 'Stays in DRAFT', toast: 'Failed to submit to sheet' },
    approvalFails: { behavior: 'Stays PENDING', toast: 'Failed to trigger automation: {error}' },
    individualWidgetFails: { behavior: 'Returned in results as status: "failed"', toast: null },
    cookiesExpired: { behavior: 'Backend returns 403', fix: 'Refresh cookies in Approval_Automation.gs' },
    unsupportedType: { behavior: 'Skipped with status: "skipped"', toast: null },
    editWhileLocked: { behavior: 'Blocked', toast: 'Cannot edit while in review or approved' },
    fetchNotFound: { behavior: 'Toast shown', toast: 'Widget not found with slug: {slug}' },
    emptyBackgroundMultimedia: { behavior: 'Deploy error', fix: 'Omit field if empty', toast: 'Background Multimedia Name is invalid' },
};

// ── UI Components ──
export const UI_COMPONENTS = {
    MainLayout: { file: 'src/components/Layout/MainLayout.jsx', role: 'Status badge, Submit/Re-open buttons, Manage Users button (super admin)' },
    ManageApprovalUsers: { file: 'src/components/AdminPanel/ManageApprovalUsers.jsx', role: 'Add/remove checkers (super admin only)' },
    RequestQueue: { file: 'src/components/Dashboard/RequestQueue.jsx', role: 'Checker review UI, approve/reject/deploy' },
    FetchWidget: { file: 'src/components/FetchWidget.jsx', role: 'Fetch existing widgets by slug' },
    WidgetContext: { file: 'src/context/WidgetContext.jsx', role: 'State management, submit/approve/reject functions' },
    AuthContext: { file: 'src/context/AuthContext.jsx', role: 'Role assignment (SUPER_ADMIN/CHECKER/MAKER), dynamic checker management' },
    ActivityLogContext: { file: 'src/context/ActivityLogContext.jsx', role: 'Audit trail' },
    GoogleSheetService: { file: 'src/services/GoogleSheetService.js', role: 'Google Sheet API client, approval user management' },
    BackendSyncService: { file: 'src/services/BackendSyncService.js', role: 'Direct backend deployment' },
    AuthService: { file: 'src/services/AuthService.js', role: 'Login, base role assignment (SUPER_ADMIN/MAKER), CSRF' },
    ApprovalAutomation: { file: 'scripts/Approval_Automation.gs', role: 'Server-side approval routing' },
};
