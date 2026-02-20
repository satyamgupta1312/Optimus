/**
 * Maker-Checker Configuration — Source of Truth
 *
 * Defines the approval workflow: page status lifecycle,
 * transition rules, edit guards, submit/approve/reject actions,
 * and approval automation routing.
 *
 * Auth & Role Assignment has been moved to AuthConfig.js
 *
 * Wiki Reference: wiki/Feature-Maker-Checker.md
 * Auth Reference: wiki/AUTH-Flow.md (roles, login, checker management)
 * Config Reference: src/config/Feature/AuthConfig.js
 *
 * Flow:
 *   Maker (creates/edits) → Submit → Checker (reviews) → Approve/Reject → Backend API Update
 */

// ── Role Permissions (what each role can DO) ──
// Role assignment rules are in AuthConfig.js
export const ROLE_PERMISSIONS = {
    SUPER_ADMIN: {
        label: 'Super Admin',
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

// ── Submit Payload (Maker → Local API) ──
export const SUBMIT_PAYLOAD = {
    fields: {
        widgetIds: '$canvasWidgetIds', // Array of widget IDs to include
        headerWidgets: '$headerWidgets', // { primaryMasthead, secondaryMasthead } (cleaned JSON)
    },
    headerCleaning: 'File objects removed from headerWidgets for serialization',
    service: 'LocalApiService.createRequest() + LocalApiService.submitRequest()',
    onSuccess: {
        statusChange: 'PENDING',
        toast: 'Page submitted for review!',
        editLocked: true,
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
        description: 'Selected widgets approved. Backend API calls triggered for deployment.',
        service: 'LocalApiService.approveRequest()',
        payload: { selectedWidgetIds: '$selectedWidgetIds' },
        statusChange: 'APPROVED',
        toast: 'Widgets approved! Automation triggered successfully',
    },
    reject: {
        description: 'Status updated to REJECTED with optional reason. Maker can re-edit.',
        service: 'LocalApiService.rejectRequest()',
        payload: { reason: '$rejectionReason' },
        statusChange: 'REJECTED',
        toast: 'Page rejected. Maker can edit and resubmit',
    },
    reopen: {
        description: 'Reset APPROVED/REJECTED page back to DRAFT for editing',
        service: 'LocalApiService.reopenRequest()',
        statusChange: 'DRAFT',
        toast: 'Page reset to draft mode',
    },
    deploy: {
        description: 'Manual re-deployment bypassing local API (if automation failed)',
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
    AuthContext: { file: 'src/context/AuthContext.jsx', role: 'User state, checker list, role helpers' },
    ActivityLogContext: { file: 'src/context/ActivityLogContext.jsx', role: 'Audit trail' },
    BackendSyncService: { file: 'src/services/BackendSyncService.js', role: 'Direct backend deployment' },
    LocalApiService: { file: 'src/services/LocalApiService.js', role: 'Local Express API client' },
    ApprovalAutomation: { file: 'scripts/Approval_Automation.gs', role: 'Server-side approval routing' },
};
