/**
 * ApiClient — Shared Backend API Client
 *
 * Clean, reusable API utilities for all widget backends.
 * Extracted from WidgetApiService.js — no debug console.logs.
 *
 * Usage:
 *   import { callApi, createMappingCsv, getNowStr } from '@/Backend/ApiClient';
 *   await callApi('/api/app/widget/', payload, { multipart: true });
 */

import { API_BASE } from '../config/apiConfig';

// ── CSRF ──

function getCsrfToken() {
    const value = `; ${document.cookie}`;
    const parts = value.split('; csrftoken=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// ── Core API Caller ──

/**
 * Make an authenticated API call to the backend.
 * @param {string} endpoint - API path (e.g. '/api/app/widget/')
 * @param {Object} payload  - Request body
 * @param {Object} opts
 * @param {boolean} opts.multipart - Send as FormData (default: false → JSON)
 * @returns {Promise<Response>}
 */
export async function callApi(endpoint, payload, { multipart = false } = {}) {
    const csrfToken = getCsrfToken();
    const url = `${API_BASE}${endpoint}`;

    const options = {
        method: 'POST',
        credentials: 'include',
        headers: {
            'X-CSRFToken': csrfToken || '',
        },
    };

    if (multipart) {
        const formData = new FormData();
        for (const [key, value] of Object.entries(payload)) {
            formData.append(key, value);
        }
        options.body = formData;
    } else {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API ${response.status}: ${text.substring(0, 200)}`);
    }

    return response;
}

// ── CSV Mapping Builder ──

/**
 * Build a CSV Blob for widget/layout mapping APIs.
 * @param {'widget_item'|'layout_widget'|'global_page'} type - Mapping type
 * @param {string} slugName - Slug to map
 * @param {Object} opts - Optional overrides
 * @param {string} opts.levelTag    - default 'global'
 * @param {string} opts.levelProperty - default 'global'
 * @param {number} opts.priority    - default 1
 * @param {string} opts.cohort      - default ''
 * @returns {Blob} CSV blob ready for FormData
 */
export function createMappingCsv(type, slugName, { levelTag = 'global', levelProperty = 'global', priority = 1, cohort = '' } = {}) {
    let content = '';

    if (type === 'widget_item') {
        content = `widget_item_slug_name,level_tag,level_property,priority,cohort\n${slugName},${levelTag},${levelProperty},${priority},${cohort}`;
    } else if (type === 'layout_widget') {
        content = `widget_slug_name,level_tag,level_property,priority,cohort\n${slugName},${levelTag},${levelProperty},${priority},${cohort}`;
    } else if (type === 'global_page') {
        content = 'level_tag,level_property\nglobal,global';
    }

    return new Blob([content], { type: 'text/csv' });
}

// ── Time Utilities ──

/** Current datetime as 'YYYY-MM-DD HH:MM:SS' */
export function getNowStr() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** Future datetime (default +365 days) as 'YYYY-MM-DD HH:MM:SS' */
export function getFutureStr(days = 365) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return future.toISOString().slice(0, 19).replace('T', ' ');
}
