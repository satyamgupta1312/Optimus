/**
 * API Configuration — Environment-Aware Base URL
 *
 * In LOCAL DEV (npm run dev):
 *   API_BASE = '/uat' or '/prod' (env-prefixed paths)
 *   → Vite proxy rewrites /uat/login/ → UAT backend, /prod/login/ → PROD backend
 *   → Both environments always available simultaneously
 *
 * In PRODUCTION BUILD: API_BASE = full URL
 *   → Direct absolute calls to the backend
 *
 * Usage in services:
 *   import { API_BASE } from '../config/apiConfig';
 *   fetch(`${API_BASE}/api/app/widget/`, { ... })
 *
 * url.env:
 *   VITE_API_BASE_URL_PROD=https://samaan.apnamart.in
 *   VITE_API_BASE_URL_UAT=https://smapi-cu.apnamart.in
 */

// Runtime override from localStorage, fallback to build-time env
const ENV = localStorage.getItem('optimus_env') || import.meta.env.VITE_ENV || 'PROD';
const PROD_URL = import.meta.env.VITE_API_BASE_URL_PROD || 'https://samaan.apnamart.in';
const UAT_URL = import.meta.env.VITE_API_BASE_URL_UAT || 'https://smapi-cu.apnamart.in';

const IS_DEV = import.meta.env.DEV;

/**
 * API_BASE — the base URL prefix for all backend API calls.
 * In dev: '/uat' or '/prod' — Vite proxy handles forwarding.
 * In prod (Vercel): '/api/local/proxy/uat' or '/api/local/proxy/prod' — Express serverless proxy.
 */
export const API_BASE = IS_DEV
    ? '/' + ENV.toLowerCase()
    : '/api/local/proxy/' + ENV.toLowerCase();

/**
 * ACTIVE_ENV — which environment is currently active ('UAT' or 'PROD').
 */
export const ACTIVE_ENV = ENV;

/**
 * BACKEND_ORIGIN — full URL of the active backend (always absolute).
 * Used where an Origin/Referer header is needed.
 */
export const BACKEND_ORIGIN = ENV === 'UAT' ? UAT_URL : PROD_URL;

/**
 * All backend API endpoints — use with API_BASE prefix.
 *
 *   fetch(`${API_BASE}${ENDPOINTS.widget}`, { ... })
 */
export const ENDPOINTS = {
    widget: '/api/app/widget/',
    widgetItem: '/api/app/post_widget_item/',
    pageLayout: '/api/app/post_page_layout/',
    multimedia: '/api/app/multimedia/',
    mapWidgetItems: '/api/app/update_widget_widget_item_mapping/',
    mapLayoutWidget: '/api/app/update_layout_widget_mapping/',
    mapPageLayout: '/api/app/update_page_page_layout_mapping/',
    fetchWidget: '/api/app/get_widget/',
    fetchWidgetItem: '/api/app/widget_item/',
};

// Convenience: fully-qualified endpoint URLs (for non-proxy use, e.g. direct API calls)
export const FULL_ENDPOINTS = Object.fromEntries(
    Object.entries(ENDPOINTS).map(([key, path]) => [key, `${BACKEND_ORIGIN}${path}`])
);

/**
 * switchEnv — toggle between UAT and PROD at runtime.
 * Saves to localStorage and reloads the page so all modules re-initialize.
 */
export function switchEnv(newEnv) {
    const target = newEnv || (ENV === 'UAT' ? 'PROD' : 'UAT');
    localStorage.setItem('optimus_env', target);
    window.location.reload();
}

console.log(`[apiConfig] Environment: ${ACTIVE_ENV} | Base: "${API_BASE}"`);
