// Authentication Service — works with both PROD (samaan.apnamart.in) and UAT (smapi-cu.apnamart.in)
// Same Django login flow for both environments.

import { API_BASE, ACTIVE_ENV } from '../config/apiConfig';

console.log(`[AuthService] Active env: ${ACTIVE_ENV} | API_BASE: ${API_BASE}`);

// Helper to get CSRF token from cookie (exported for deploy flow)
export const getCsrfToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; csrftoken=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

export const loginUser = async (username, password) => {
    try {
        console.log(`[Auth] Attempting login for: ${username} on ${ACTIVE_ENV}`);

        // STEP 0: Clear local cookies (skip backend logout — causes 405 on some backends)
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        await new Promise(resolve => setTimeout(resolve, 100));

        // STEP 1: GET /login/ to obtain CSRF cookie
        console.log('[Auth] Fetching CSRF token from server...');
        const loginPageRes = await fetch(`${API_BASE}/login/`, {
            method: 'GET',
            credentials: 'include',
        });
        console.log('[Auth] Login page status:', loginPageRes.status);

        // Wait for cookie to be set
        await new Promise(resolve => setTimeout(resolve, 300));

        const csrfToken = getCsrfToken();
        console.log('[Auth] CSRF token obtained:', csrfToken ? 'YES (' + csrfToken.substring(0, 10) + '...)' : 'NO');
        console.log('[Auth] All cookies:', document.cookie);

        if (!csrfToken) {
            throw new Error('Could not obtain CSRF token from server. Please try again.');
        }

        // STEP 2: POST /login/ with credentials
        // Use URLSearchParams (application/x-www-form-urlencoded) — matches Django default
        // Use redirect: 'manual' — so we can check 302 ourselves without cross-origin redirect issues
        const formBody = new URLSearchParams();
        formBody.append('csrfmiddlewaretoken', csrfToken);
        formBody.append('username', username);
        formBody.append('password', password);

        console.log('[Auth] Submitting login request...');
        const response = await fetch(`${API_BASE}/login/`, {
            method: 'POST',
            body: formBody,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken,
            },
            credentials: 'include',
            redirect: 'manual',  // Don't follow redirects — check status ourselves
        });

        console.log('[Auth] Response status:', response.status, '| type:', response.type);

        // ============ VALIDATION ============
        // Django login behavior:
        //   Success → 302 redirect (away from /login)
        //   Failure → 200 with login form + error messages

        if (response.status === 302 || response.status === 301) {
            // SUCCESS — Django redirected away from login page
            console.log('[Auth] ✅ Login successful (302 redirect)');
        } else if (response.status === 200) {
            // Got 200 — could be the login form again (failed) or the homepage (success)
            const html = await response.text();

            const hasCSRFError = html.includes('CSRF') || html.includes('csrf') || html.includes('Forbidden');
            if (hasCSRFError) {
                console.error('[Auth] ❌ Login FAILED - CSRF/Forbidden error in response');
                console.error('[Auth] Response snippet:', html.substring(0, 500));
                throw new Error('CSRF verification failed. Please refresh and try again.');
            }

            const hasError = html.includes('errorlist') ||
                html.includes('Please enter a correct') ||
                html.includes('Invalid username') ||
                html.includes('Invalid password') ||
                html.includes('authentication failed');

            if (hasError) {
                console.error('[Auth] ❌ Login FAILED - Django error messages detected');
                throw new Error('Invalid credentials. Please check your username and password.');
            }

            const hasLoginForm = html.includes('type="password"') &&
                (html.includes('name="password"') || html.includes('id="id_password"'));

            if (hasLoginForm) {
                console.error('[Auth] ❌ Login FAILED - login form still in response');
                console.error('[Auth] Response snippet:', html.substring(0, 300));
                throw new Error('Invalid credentials. Please check your username and password.');
            }

            // 200 but no login form = success (homepage rendered)
            console.log('[Auth] ✅ Login successful (200 non-login page)');
        } else if (response.type === 'opaqueredirect') {
            // redirect: 'manual' can return opaqueredirect type
            console.log('[Auth] ✅ Login successful (opaque redirect)');
        } else {
            console.error('[Auth] ❌ Login FAILED - HTTP', response.status);
            throw new Error(`Login failed with status: ${response.status}`);
        }

        // Role Assignment — environment-aware
        let role = 'MAKER';
        const lowerUser = username.toLowerCase();

        const SUPER_ADMINS = ['satyam.gupta@apnamart.in', 'manoj.kumar'];
        if (ACTIVE_ENV === 'UAT' && lowerUser === 'satyam') {
            role = 'SUPER_ADMIN';
        } else if (SUPER_ADMINS.includes(lowerUser)) {
            role = 'SUPER_ADMIN';
        }

        console.log('[Auth] Assigned role:', role);
        const displayName = username.includes('@') ? username.split('@')[0] : username;

        const user = {
            name: displayName,
            email: username,
            role,
            csrfToken: getCsrfToken()
        };

        window.currentUser = user;
        return user;

    } catch (error) {
        console.error('[Auth] ❌ Login error:', error.message);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        // Try GET first (most Django setups), fall back silently
        await fetch(`${API_BASE}/logout/`, { method: 'GET', credentials: 'include' }).catch(() => {});
        console.log('[Auth] Logged out from backend');
    } catch (e) {
        console.warn('[Auth] Logout failed (backend might be unreachable)');
    }
    // Clear all local cookies (with multiple path variants to ensure removal)
    document.cookie.split(";").forEach((c) => {
        const name = c.replace(/^ +/, "").split("=")[0];
        document.cookie = `${name}=;expires=${new Date().toUTCString()};path=/`;
        document.cookie = `${name}=;expires=${new Date().toUTCString()};path=/;domain=${window.location.hostname}`;
    });
    // Clear window-level user reference
    delete window.currentUser;
};
