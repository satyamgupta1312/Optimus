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
// These identifiers get SUPER_ADMIN role. Cannot be changed at runtime.
// Environment-aware: UAT uses short username, PROD uses full email.
export const SUPER_ADMIN_EMAIL = 'satyam.gupta@apnamart.in';
export const ENV_SUPER_ADMINS = {
    PROD: 'satyam.gupta@apnamart.in',
    UAT: 'satyam',
};
// Server-side: SUPER_ADMIN_IDENTIFIERS array in server/middleware/auth.js
// matches both identifiers regardless of environment.

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
// CheckerList is per-environment — a user can be CHECKER in UAT but MAKER in PROD.
export const ROLE_RESOLUTION = {
    // Step 1: Check hardcoded super admin
    step1: {
        check: `email === '${SUPER_ADMIN_EMAIL}'`,
        result: 'SUPER_ADMIN',
        description: 'Hardcoded, never overridden',
    },
    // Step 2: Check CheckerList table for current environment
    step2: {
        check: 'email in CheckerList table WHERE env = X-Optimus-Env',
        result: 'CHECKER',
        description: 'Promoted by SUPER_ADMIN via Manage Users panel (per-environment)',
    },
    // Step 3: Default
    step3: {
        check: 'everyone else',
        result: 'MAKER',
        description: 'Default role for all authenticated users',
    },
    sourceOfTruth: 'server/middleware/auth.js',
    clientRoleIgnored: true,
    environmentScoped: true,
};

// ── Login Flow ──
export const LOGIN_FLOW = {
    // Step 0: Environment selection
    envSelector: {
        location: 'LoginPage.jsx — above username field',
        options: ['PROD', 'UAT'],
        storage: 'localStorage.optimus_env',
        default: 'PROD',
        effect: 'Sets API_BASE prefix (/prod or /uat) so Vite proxy routes to correct backend',
        colors: { PROD: 'green', UAT: 'orange' },
    },
    // Step 1: Clear existing session
    clearSession: {
        endpoint: '/logout/',
        method: 'GET',
        description: 'Clear Django session + local cookies',
    },
    // Step 2: Fetch CSRF token
    fetchCsrf: {
        endpoint: '/login/',
        method: 'GET',
        description: 'Django sets csrftoken cookie',
    },
    // Step 3: Submit credentials
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
// Checker list is PER-ENVIRONMENT. Adding a checker in UAT does NOT make them
// a checker in PROD (and vice versa). Each environment has its own checker list.
export const CHECKER_MANAGEMENT = {
    // Who can manage
    managedBy: 'SUPER_ADMIN',
    environmentScoped: true, // CheckerList entries are per-environment (UAT/PROD)

    // API endpoints (local Express backend)
    // All endpoints use X-Optimus-Env header to scope to current environment
    endpoints: {
        list: { method: 'GET', route: '/api/local/users/checkers', access: 'anyone', envScoped: true },
        add: { method: 'POST', route: '/api/local/users/checkers', access: 'SUPER_ADMIN', envScoped: true },
        remove: { method: 'DELETE', route: '/api/local/users/checkers', access: 'SUPER_ADMIN', envScoped: true },
    },

    // Guard rails
    guards: {
        makerCannotManage: { status: 403, error: 'Only SUPER_ADMIN can manage checkers' },
        cannotAddSuperAdmin: { status: 400, error: 'SUPER_ADMIN already has all checker powers' },
        cannotRemoveSuperAdmin: { status: 400, error: 'Cannot remove SUPER_ADMIN from checker list' },
    },

    // Effects
    onAdd: 'User upserted with role=CHECKER + added to CheckerList table for current env. Immediate effect.',
    onRemove: 'User removed from CheckerList for current env. If no entries remain in any env, role reset to MAKER. Immediate effect.',

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
    envHeader: 'X-Optimus-Env',     // 'UAT' or 'PROD' from localStorage.optimus_env (default: PROD)
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
