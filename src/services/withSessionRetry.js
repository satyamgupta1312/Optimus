/**
 * withSessionRetry — Session Auto-Refresh Wrapper
 *
 * Wraps a fetch call. If the server returns 403 (expired session),
 * it automatically refreshes the session (re-visits /login/ to get
 * a fresh CSRF cookie) and retries the original request once.
 *
 * Wiki Reference: wiki/Backend-work-flow.md — Session Auto-Refresh
 */

import { API_BASE } from '../config/apiConfig';
import { SESSION_CONFIG } from '../config/BackendFlow';

/**
 * Refresh CSRF session by hitting the login page (GET).
 * This sets a new csrftoken cookie without requiring user credentials.
 */
export const refreshSession = async () => {
    try {
        console.log('[withSessionRetry] Refreshing session via GET /login/ ...');
        await fetch(`${API_BASE}${SESSION_CONFIG.refreshEndpoint}`, {
            method: 'GET',
            credentials: 'include',
            redirect: 'follow',
        });
        console.log('[withSessionRetry] Session refresh complete.');
        return true;
    } catch (e) {
        console.error('[withSessionRetry] Session refresh failed:', e);
        return false;
    }
};

/**
 * fetchWithSessionRetry(url, options)
 *
 * Drop-in replacement for fetch() that auto-retries on 403.
 *
 * @param {string} url
 * @param {RequestInit} options - standard fetch options
 * @returns {Promise<Response>}
 */
export const fetchWithSessionRetry = async (url, options = {}) => {
    const maxRetries = SESSION_CONFIG.maxRetryOn403;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await fetch(url, {
            credentials: 'include',
            ...options,
        });

        if (response.status !== 403 || attempt === maxRetries) {
            // Success, or non-403 error, or exhausted retries
            if (response.status === 403 && attempt === maxRetries) {
                console.warn(
                    `[withSessionRetry] Got 403 after ${maxRetries} refresh attempt(s). ` +
                    'User may need to log in again.'
                );
            }
            return response;
        }

        // Got 403 → refresh session and retry
        console.warn(
            `[withSessionRetry] 403 received on attempt ${attempt + 1}. ` +
            'Refreshing session...'
        );
        const refreshed = await refreshSession();
        if (!refreshed) {
            // Refresh itself failed — return the 403 response
            return response;
        }
    }
};

export default fetchWithSessionRetry;
