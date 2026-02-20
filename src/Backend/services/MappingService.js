/**
 * MappingService — CSV mapping utilities for widget → item, layout → widget, page → global.
 *
 * Ported from:
 *   scripts/category_automation.py → update_widget_mapping(), update_layout_widget_mapping()
 *   src/Backend/ApiClient.js → createMappingCsv()
 *   All .gs scripts → mapItems pattern
 *
 * Centralizes the 3 mapping types used across all widget builders:
 *   1. widget_item:   Maps widget items to a widget
 *   2. layout_widget: Maps a widget to a page layout
 *   3. page_layout:   Maps a page layout to the global page registry
 */

import { API_BASE, ENDPOINTS } from '../../config/apiConfig';
import { createMappingCsv } from '../ApiClient';

/**
 * Get CSRF token from cookies (shared with ApiClient).
 */
function getCsrfToken() {
    const value = `; ${document.cookie}`;
    const parts = value.split('; csrftoken=');
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

export const MappingService = {
    /**
     * Map one or more widget items to a widget.
     *
     * @param {string} widgetSlug - Parent widget slug
     * @param {Array<{slug: string, levelTag?: string, levelProperty?: string, priority?: number}>} items
     * @returns {Promise<Response>}
     */
    async mapWidgetItems(widgetSlug, items) {
        const header = 'widget_item_slug_name,level_tag,level_property,priority,cohort';
        const rows = items.map((item, idx) => {
            const lt = item.levelTag || 'global';
            const lp = item.levelProperty || 'global';
            const pr = item.priority || (idx + 1);
            return `${item.slug},${lt},${lp},${pr},`;
        });

        const csv = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
        const formData = new FormData();
        formData.append('widget_slug', widgetSlug);
        formData.append('mapping_file', csv, 'mapping.csv');

        const response = await fetch(`${API_BASE}${ENDPOINTS.mapWidgetItems}`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: { 'X-CSRFToken': getCsrfToken() || '' },
        });

        if (!response.ok) {
            throw new Error(`Map widget items failed: HTTP ${response.status}`);
        }
        return response;
    },

    /**
     * Map a widget to a page layout.
     *
     * @param {string} pageLayoutSlug - Parent page layout slug
     * @param {string} widgetSlug - Widget to assign
     * @param {Object} opts
     * @param {string} opts.levelTag - default 'global'
     * @param {string} opts.levelProperty - default 'global'
     * @param {number} opts.priority - default 1
     * @returns {Promise<Response>}
     */
    async mapLayoutWidget(pageLayoutSlug, widgetSlug, { levelTag = 'global', levelProperty = 'global', priority = 1 } = {}) {
        const csv = createMappingCsv('layout_widget', widgetSlug, { levelTag, levelProperty, priority });
        const formData = new FormData();
        formData.append('page_layout_slug', pageLayoutSlug);
        formData.append('mapping_file', csv, 'mapping.csv');

        const response = await fetch(`${API_BASE}${ENDPOINTS.mapLayoutWidget}`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: { 'X-CSRFToken': getCsrfToken() || '' },
        });

        if (!response.ok) {
            throw new Error(`Map layout widget failed: HTTP ${response.status}`);
        }
        return response;
    },

    /**
     * Map a page layout to the global page registry.
     *
     * @param {string} pageLayoutSlug - Page layout to register
     * @param {string} pageType - 'product_listing_page' | 'category_page'
     * @returns {Promise<Response>}
     */
    async mapPageLayout(pageLayoutSlug, pageType = 'product_listing_page') {
        const csv = createMappingCsv('global_page');
        const formData = new FormData();
        formData.append('page_layout_slug', pageLayoutSlug);
        formData.append('page_type', pageType);
        formData.append('mapping_file', csv, 'mapping.csv');

        const response = await fetch(`${API_BASE}${ENDPOINTS.mapPageLayout}`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: { 'X-CSRFToken': getCsrfToken() || '' },
        });

        if (!response.ok) {
            throw new Error(`Map page layout failed: HTTP ${response.status}`);
        }
        return response;
    },
};
