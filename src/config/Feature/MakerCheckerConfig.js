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

// Express backend (server/routes/requests.js) handles approval for each widget type
export const APPROVAL_ROUTING = {
    source: 'server/routes/requests.js',
    entryFunction: 'POST /api/local/requests/:id/approve',
    authentication: 'X-Optimus-User header — auth middleware upserts User in Prisma',
    widgetRoutes: {
        'Single Product Row Optimize': { handler: 'server/routes/requests.js', description: 'PLP Ecosystem + Homepage Row' },
        'Single Product Row': { handler: 'server/routes/requests.js', description: 'Standard Widget + Page Layout' },
        'Banner With Product Listing': { handler: 'server/routes/requests.js', description: 'Carousel + PLP Ecosystem' },
        'Primary Masthead': { handler: 'server/routes/requests.js', description: 'Multimedia + Masthead Widget' },
        'Category Grid': { handler: 'server/routes/requests.js', description: 'Category Grid + PLP Ecosystems' },
        'Category Masthead': { handler: 'server/routes/requests.js', description: 'Same as Category Grid' },
        'Secondary Masthead': { handler: 'server/routes/requests.js', description: 'Secondary Masthead' },
    },
    headerWidgetRoutes: {
        primaryMasthead: { condition: 'headerWidgets.primaryMasthead?.enabled' },
        secondaryMasthead: { condition: 'headerWidgets.secondaryMasthead?.enabled' },
        categoryMasthead: { condition: 'headerWidgets.categoryMasthead?.enabled' },
    },
    // Fetched vs Created widget handling
    fetchedWidgetLogic: {
        isFetched: '_fetched === true && slug exists',
        onApprove: 'UPDATE existing widget via API',
        isNew: '_fetched is undefined',
        onApproveNew: 'CREATE new widget via API',
    },
    // Slug validation: checks both widget.slug and widget.slug_name
    slugValidation: {
        frontendCheck: 'ValidationService.js — widget.slug || widget.slug_name',
        backendCheck: 'server/middleware/validate.js — same fallback',
        backendCreate: 'server/routes/requests.js — w.slug || w.slug_name || auto-generated',
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
    submitFails: { behavior: 'Stays in DRAFT', toast: 'Failed to submit' },
    approvalFails: { behavior: 'Stays PENDING', toast: 'Failed to approve: {error}' },
    individualWidgetFails: { behavior: 'Backend returns 400 with validation error details', toast: null },
    authExpired: { behavior: 'Auth middleware rejects request', fix: 'Re-login required' },
    unsupportedType: { behavior: 'Skipped during approval routing', toast: null },
    editWhileLocked: { behavior: 'Blocked', toast: 'Cannot edit while in review or approved' },
    fetchNotFound: { behavior: 'Toast shown', toast: 'Widget not found with slug: {slug}' },
    slugValidationFails: { behavior: 'Checks widget.slug then widget.slug_name before failing', toast: 'slug_name cannot be empty' },
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
    LocalApiService: { file: 'src/services/LocalApiService.js', role: 'Express backend API client (submit, approve, widgets, users, catalog)' },
    ValidationService: { file: 'src/services/ValidationService.js', role: 'Pre-submit validation + slug uniqueness checks' },
    PrismaSchema: { file: 'server/prisma/schema.prisma', role: 'Database models (Widget, Request, RequestWidget, User, etc.)' },
};
