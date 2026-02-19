// Real Authentication Service connected to samaan.apnamart.in
// Enforces strict role assignment:
// - SUPER_ADMIN: satyam.gupta@apnamart.in (can manage checkers + has checker powers)
// - CHECKER: Users added to the approval list in Google Sheet
// - MAKER: All other authenticated users

// Use API_BASE from config to leverage environment switching (UAT/PROD)
import { API_BASE, ACTIVE_ENV } from '../config/apiConfig';

console.log(`[AuthService] Active env: ${ACTIVE_ENV}`);

// Helper to get CSRF token from cookie

// Helper to get CSRF token from cookie
const getCsrfToken = () => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; csrftoken=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

export const loginUser = async (username, password) => {
    try {
        console.log('[Auth] Attempting login for:', username);

        // STEP 0: Clear any existing session first
        console.log('[Auth] Clearing any existing sessions...');
        try {
            await fetch(`${API_BASE}/logout/`, {
                method: 'GET',
                credentials: 'include',
                redirect: 'follow'
            });
            // Clear local cookies
            document.cookie.split(";").forEach((c) => {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (e) {
            console.log('[Auth] Session clear skipped (no existing session)');
        }

        // STEP 1: Get CSRF token by visiting the login page first
        console.log('[Auth] Fetching CSRF token from server...');
        await fetch(`${API_BASE}/login/`, {
            method: 'GET',
            credentials: 'include' // Save cookies
        });

        // Wait for cookie to be set
        await new Promise(resolve => setTimeout(resolve, 200));

        const csrfToken = getCsrfToken();
        console.log('[Auth] CSRF token obtained:', csrfToken ? 'YES (' + csrfToken.substring(0, 10) + '...)' : 'NO');

        if (!csrfToken) {
            throw new Error('Could not obtain CSRF token from server. Please try again.');
        }

        // STEP 2: Submit login with CSRF token
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        formData.append('csrfmiddlewaretoken', csrfToken);

        console.log('[Auth] Submitting login request...');
        const response = await fetch(`${API_BASE}/login/`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': csrfToken,
            },
            credentials: 'include',
            redirect: 'follow'
        });

        console.log('[Auth] Response URL:', response.url);
        console.log('[Auth] Response Status:', response.status);

        const html = await response.text();
        console.log('[Auth] Response HTML length:', html.length);

        // ============ STRICT VALIDATION ============

        // Validation 1: Check for Django error messages (most reliable)
        const hasError = html.includes('errorlist') ||
            html.includes('Please enter a correct') ||
            html.includes('Invalid username') ||
            html.includes('Invalid password') ||
            html.includes('authentication failed');

        if (hasError) {
            console.error('[Auth] ❌ Login FAILED - Django error messages detected');
            throw new Error('Invalid credentials. Please check your username and password.');
        }

        // Validation 2: Check if still on login page (URL)
        if (response.url && response.url.includes('/login')) {
            console.error('[Auth] ❌ Login FAILED - still on /login page');
            throw new Error('Invalid credentials. Please check your username and password.');
        }

        // Validation 3: Check if login form still present
        const hasLoginForm = html.includes('type="password"') &&
            (html.includes('name="password"') || html.includes('id="id_password"'));

        if (hasLoginForm) {
            console.error('[Auth] ❌ Login FAILED - login form still in HTML');
            throw new Error('Invalid credentials. Please check your username and password.');
        }

        // Validation 4: HTTP status check
        if (!response.ok) {
            console.error('[Auth] ❌ Login FAILED - HTTP', response.status);
            throw new Error(`Login failed with status: ${response.status}`);
        }

        console.log('[Auth] ✅ All validation checks PASSED - Login successful!');

        // Role Assignment
        let role = 'MAKER';
        const lowerUser = username.toLowerCase();

        if (lowerUser === 'satyam.gupta@apnamart.in') {
            role = 'SUPER_ADMIN';
        }

        console.log('[Auth] Assigned role:', role);
        const displayName = username.includes('@') ? username.split('@')[0] : username;

        window.currentUser = {
            name: displayName,
            email: username,
            role,
            csrfToken: getCsrfToken()
        };

        return window.currentUser;

    } catch (error) {
        console.error('[Auth] ❌ Login error:', error.message);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        await fetch(`${API_BASE}/logout`, { method: 'GET', credentials: 'include' });
        console.log('[Auth] Logged out from backend');
    } catch (e) {
        console.warn('[Auth] Logout failed (backend might be unreachable)', e);
    }
};
