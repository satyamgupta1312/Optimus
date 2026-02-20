/**
 * Auth Configuration — Source of Truth
 *
 * Defines authentication flow, role assignment rules,
 * CSRF handling, session recovery, and checker management.
 *
 * Wiki Reference: wiki/AUTH-Flow.md
 *
 * Flow:
 *   Django Login → Base Role → Checker List Lookup → Server-Side Resolution
 */

// ── Super Admin (Hardcoded) ──
// Only this email gets SUPER_ADMIN role. Cannot be changed at runtime.
export const SUPER_ADMIN_EMAIL = 'satyam.gupta@apnamart.in';

// ── Role Definitions ──
export const ROLES = {
    MAKER: {
        label: 'Maker',
        description: 'Anyone who can login to samaan.apnamart.in (default role)',
        assignedBy: 'Default — all authenticated users',
    },
    CHECKER: {
        label: 'Checker',
        description: 'Users promoted by SUPER_ADMIN via Manage Users panel',
        assignedBy: 'SUPER_ADMIN adds to CheckerList table',
    },
    SUPER_ADMIN: {
        label: 'Super Admin',
        description: 'All CHECKER powers + can add/remove checkers',
        assignedBy: `Hardcoded: ${SUPER_ADMIN_EMAIL}`,
    },
};

// ── Role Resolution Rules ──
// Role is resolved SERVER-SIDE on every request. Client-sent role header is IGNORED.
export const ROLE_RESOLUTION = {
    // Step 1: Check hardcoded super admin
    step1: {
        check: `email === '${SUPER_ADMIN_EMAIL}'`,
        result: 'SUPER_ADMIN',
        description: 'Hardcoded, never overridden',
    },
    // Step 2: Check CheckerList table
    step2: {
        check: 'email in CheckerList table',
        result: 'CHECKER',
        description: 'Promoted by SUPER_ADMIN via Manage Users panel',
    },
    // Step 3: Default
    step3: {
        check: 'everyone else',
        result: 'MAKER',
        description: 'Default role for all authenticated users',
    },
    sourceOfTruth: 'server/middleware/auth.js',
    clientRoleIgnored: true,
};

// ── Login Flow ──
export const LOGIN_FLOW = {
    // Step 0: Clear existing session
    clearSession: {
        endpoint: '/logout/',
        method: 'GET',
        description: 'Clear Django session + local cookies',
    },
    // Step 1: Fetch CSRF token
    fetchCsrf: {
        endpoint: '/login/',
        method: 'GET',
        description: 'Django sets csrftoken cookie',
    },
    // Step 2: Submit credentials
    submitLogin: {
        endpoint: '/login/',
        method: 'POST',
        contentType: 'multipart/form-data (FormData)',
        fields: ['username', 'password', 'csrfmiddlewaretoken'],
        headers: ['X-CSRFToken'],
    },
    // Validation checks (all must pass)
    validationChecks: [
        { check: 'No Django errorlist in HTML', failureMessage: 'Invalid credentials' },
        { check: 'URL does not contain /login', failureMessage: 'Login rejected' },
        { check: 'No login form in HTML', failureMessage: 'Not logged in' },
        { check: 'HTTP status is ok', failureMessage: 'Server error' },
    ],
    sourceFile: 'src/services/AuthService.js',
};

// ── CSRF Configuration ──
export const CSRF_CONFIG = {
    cookieName: 'csrftoken',
    headerName: 'X-CSRFToken',
    formFieldName: 'csrfmiddlewaretoken',
    extractFrom: 'document.cookie',
    sourceFile: 'src/services/AuthService.js',
};

// ── Session Recovery (403 Handling) ──
export const SESSION_RECOVERY = {
    maxRetryOn403: 2,
    refreshEndpoint: '/login/',
    cookieName: 'csrftoken',
    description: 'Auto-refresh CSRF cookie on 403, retry original request',
    sourceFile: 'src/services/withSessionRetry.js',
};

// ── Checker Management ──
export const CHECKER_MANAGEMENT = {
    // Who can manage
    managedBy: 'SUPER_ADMIN',

    // API endpoints (local Express backend)
    endpoints: {
        list: { method: 'GET', route: '/api/local/users/checkers', access: 'anyone' },
        add: { method: 'POST', route: '/api/local/users/checkers', access: 'SUPER_ADMIN' },
        remove: { method: 'DELETE', route: '/api/local/users/checkers', access: 'SUPER_ADMIN' },
    },

    // Guard rails
    guards: {
        makerCannotManage: { status: 403, error: 'Only SUPER_ADMIN can manage checkers' },
        cannotAddSuperAdmin: { status: 400, error: 'SUPER_ADMIN already has all checker powers' },
        cannotRemoveSuperAdmin: { status: 400, error: 'Cannot remove SUPER_ADMIN from checker list' },
    },

    // Effects
    onAdd: 'User upserted with role=CHECKER + added to CheckerList table. Immediate effect.',
    onRemove: 'User removed from CheckerList + role reset to MAKER. Immediate effect.',

    // UI
    ui: {
        component: 'ManageApprovalUsers',
        visibleTo: 'SUPER_ADMIN',
        trigger: '"Users" button in header',
    },
};

// ── User Object Shape ──
export const USER_OBJECT_SHAPE = {
    name: 'Display name (email prefix)',
    email: 'Full email address',
    role: 'SUPER_ADMIN | CHECKER | MAKER',
    csrfToken: 'Django CSRF token',
};

// ── Local API Auth Headers ──
// Sent on every /api/local/* request from frontend
export const LOCAL_API_HEADERS = {
    userHeader: 'X-Optimus-User',   // user.email from localStorage
    roleHeader: 'X-Optimus-Role',   // IGNORED by server — role resolved from DB
    source: 'src/services/LocalApiService.js',
};

// ── Context Helpers ──
// Provided by AuthContext.jsx
export const AUTH_CONTEXT_HELPERS = {
    isAuthenticated: '!!user',
    isSuperAdmin: "user?.role === 'SUPER_ADMIN'",
    isChecker: "user?.role === 'CHECKER' || user?.role === 'SUPER_ADMIN'",
    isMaker: "user?.role === 'MAKER'",
    note: 'isChecker returns true for both CHECKER and SUPER_ADMIN (super admin has all checker powers)',
};

// ── Source Files ──
export const AUTH_SOURCE_FILES = {
    authService: 'src/services/AuthService.js',
    authContext: 'src/context/AuthContext.jsx',
    authMiddleware: 'server/middleware/auth.js',
    sessionRetry: 'src/services/withSessionRetry.js',
    localApiService: 'src/services/LocalApiService.js',
    authConfig: 'src/config/Feature/AuthConfig.js',
    wikiRef: 'wiki/AUTH-Flow.md',
};
