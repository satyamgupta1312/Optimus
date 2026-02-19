/**
 * API Configuration — Environment-Aware Base URL
 *
 * Reads VITE_ENV from url.env to decide which backend to target.
 *   VITE_ENV=UAT  → https://uat.samaan.apnamart.in
 *   VITE_ENV=PROD → https://samaan.apnamart.in
 *
 * In LOCAL DEV (npm run dev): API_BASE = '' (empty string)
 *   → Relative URLs, handled by Vite proxy (vite.config.js)
 *   → Proxy target is dynamically set from VITE_ENV
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
 *   VITE_API_BASE_URL_UAT=https://uat.samaan.apnamart.in
 *   VITE_ENV=UAT
 */

const ENV = import.meta.env.VITE_ENV || 'PROD';
const PROD_URL = import.meta.env.VITE_API_BASE_URL_PROD || 'https://samaan.apnamart.in';
const UAT_URL = import.meta.env.VITE_API_BASE_URL_UAT || 'https://uat.samaan.apnamart.in';

// In dev server mode: use relative URLs so Vite proxy handles CORS + cookies.
// In production mode:  use full absolute URL.
const IS_DEV = import.meta.env.DEV;

/**
 * API_BASE — the base URL prefix for all backend API calls.
 * Empty string in dev (relative URLs → Vite proxy).
 * Full absolute URL in production builds.
 */
export const API_BASE = IS_DEV ? '' : (ENV === 'UAT' ? UAT_URL : PROD_URL);

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
    fetchWidget: '/api/app/widget/',
    fetchWidgetItem: '/api/app/widget_item/',
};

// Convenience: fully-qualified endpoint URLs (for non-proxy use, e.g. Apps Script)
export const FULL_ENDPOINTS = Object.fromEntries(
    Object.entries(ENDPOINTS).map(([key, path]) => [key, `${BACKEND_ORIGIN}${path}`])
);

console.log(`[apiConfig] Environment: ${ACTIVE_ENV} | Base: "${API_BASE || '(relative — Vite proxy)'}"`);
