/**
 * DeploymentService — Unified deploy orchestrator for all widget types.
 *
 * Replaces/enhances: src/services/BackendSyncService.js
 *
 * Routes each widget to its appropriate builder and executes the deploy.
 * Supports:
 *   - SPR (Standard + Optimized) → SPRBuilder
 *   - Primary Masthead → PrimaryMastheadBuilder
 *   - Secondary Masthead → SecondaryMastheadBuilder
 *   - Category Grid → CategoryGridBuilder
 *   - Collection Banner (Scroll) → CollectionBannerBuilder
 *   - Fetched widget → PATCH update
 *
 * Features:
 *   - Per-widget result tracking (ok / updated / skipped / failed)
 *   - Non-fatal per-widget errors (continues with remaining)
 *   - Exponential backoff retry (via builders using ApiClient)
 *   - Slug collision retry (via SlugGenerator.withRetry)
 */

import { SPRBuilder } from '../builders/SPRBuilder';
import { PrimaryMastheadBuilder } from '../builders/PrimaryMastheadBuilder';
import { SecondaryMastheadBuilder } from '../builders/SecondaryMastheadBuilder';
import { CategoryGridBuilder } from '../builders/CategoryGridBuilder';
import { CollectionBannerBuilder } from '../builders/CollectionBannerBuilder';
import { API_BASE, ENDPOINTS } from '../../config/apiConfig';
import { FETCHED_WIDGET_UPDATE_STRATEGY } from '../../config/BackendFlow';
import { setCsrfToken } from '../ApiClient';

/**
 * Widget type → Builder class mapping.
 * Keys match the canvas widget.type values from WidgetRegistry + BackendFlow.APPROVAL_ROUTING.
 */
const BUILDER_MAP = {
    'Single Product Row': SPRBuilder,
    'Single Product Row Optimize': SPRBuilder,
    'product_rail': SPRBuilder,
    'Primary Masthead': PrimaryMastheadBuilder,
    'masthead': PrimaryMastheadBuilder,
    'Category Grid': CategoryGridBuilder,
    'Category Masthead': CategoryGridBuilder,
    'Banner With Product Listing': CollectionBannerBuilder,
    'Product Listing Page (CLP)': CollectionBannerBuilder,
    'collection_banner': CollectionBannerBuilder,
};

export const DeploymentService = {
    /**
     * Deploy a full request (header widgets + body widgets).
     *
     * @param {Object} requestData
     * @param {Object} requestData.headerWidgets - { primaryMasthead, secondaryMasthead }
     * @param {Array}  requestData.widgets - Canvas widgets
     * @param {Object} tokens - { csrftoken } (for legacy compatibility)
     * @returns {Promise<{ success, results, logs, summary }>}
     */
    async deployRequest(requestData, tokens = {}) {
        const logs = [];
        const log = (msg) => { console.log(`[Deploy] ${msg}`); logs.push(msg); };
        const results = [];

        // Initialize CSRF token for ApiClient (used by all builders)
        if (tokens.csrftoken) setCsrfToken(tokens.csrftoken);

        log('Starting deployment...');

        try {
            // ── Header Widgets ──
            // Both Primary and Secondary Masthead now deploy from canvas widgets via BUILDER_MAP
            // (headerWidgets path is obsolete — canvas widgets have full data including
            //  background_media, carouselItems, view_all_redirect, media_number, etc.)
            // NOTE: headerWidgets block kept for any future non-masthead header widgets

            // ── Body Widgets ──
            const widgets = requestData.widgets || [];

            for (const widget of widgets) {
                const widgetName = widget.title || widget.type;
                log(`Processing: ${widget.type} — ${widgetName}`);

                try {
                    // Fetched widget → PATCH update (re-deploy)
                    if (widget[FETCHED_WIDGET_UPDATE_STRATEGY.checkMarker]) {
                        log(`[Re-Deploy] Fetched widget → PATCH: ${widget.slug_name}`);
                        await this.patchWidget(widget, log);
                        results.push({ widget: widgetName, status: 'updated', slug: widget.slug_name });
                        continue;
                    }

                    // Look up builder
                    // Special case: 'collection_banner' has two modes
                    // displayMode lives in widget.pnc.displayMode (CollectionBannerConfig.initialState)
                    let BuilderClass = BUILDER_MAP[widget.type];
                    if (widget.type === 'collection_banner' || widget.type === 'Collection Banner') {
                        const mode = widget.pnc?.displayMode || widget.displayMode || 'scroll';
                        BuilderClass = (mode === 'stick')
                            ? CategoryGridBuilder
                            : CollectionBannerBuilder;
                    }
                    // Special case: 'masthead' has primary/secondary variants
                    if (widget.type === 'masthead') {
                        const variant = widget.pnc?.variant || 'primary';
                        BuilderClass = (variant === 'secondary')
                            ? SecondaryMastheadBuilder
                            : PrimaryMastheadBuilder;
                    }
                    if (!BuilderClass) {
                        log(`Skipping unsupported type: ${widget.type}`);
                        results.push({ widget: widgetName, status: 'skipped', error: `Unsupported type: ${widget.type}` });
                        continue;
                    }

                    // Build and deploy
                    const builder = new BuilderClass(widget, { log });
                    const result = await builder.deploy();
                    results.push({
                        widget: widgetName,
                        status: 'ok',
                        slug: result.slugs.widget || Object.values(result.slugs)[0],
                    });
                } catch (err) {
                    log(`Error on "${widgetName}": ${err.message}`);
                    results.push({ widget: widgetName, status: 'failed', error: err.message });
                }
            }

            const failedCount = results.filter(r => r.status === 'failed').length;
            const totalCount = results.length;

            return {
                success: failedCount === 0,
                results,
                logs,
                summary: `${totalCount - failedCount}/${totalCount} widget(s) deployed successfully.`,
            };
        } catch (error) {
            log(`Fatal error: ${error.message}`);
            return { success: false, error: error.message, results, logs };
        }
    },

    /**
     * PATCH an existing (fetched) widget on the backend.
     * Feature 6: Fetched Widget Re-Deploy
     *
     * @param {Object} widget - Widget with _fetched marker
     * @param {Function} log
     */
    async patchWidget(widget, log = console.log) {
        const slug = widget[FETCHED_WIDGET_UPDATE_STRATEGY.slugField] || widget.slug_name;
        if (!slug) throw new Error('Cannot PATCH: slug_name is missing');

        const url = `${API_BASE}${ENDPOINTS.widget}${slug}/`;
        log(`[PATCH] ${url}`);

        const formData = new FormData();
        if (widget.title) formData.append('heading', widget.title);
        if (widget.titleHi) formData.append('heading_hi', widget.titleHi);
        if (widget.start_time) formData.append('start_time', widget.start_time);
        if (widget.end_time) formData.append('end_time', widget.end_time);

        const response = await fetch(url, {
            method: 'PATCH',
            body: formData,
            credentials: 'include',
        });

        if (response.status === 405) {
            log(`[PATCH] Not supported for ${slug}, skipping.`);
            return;
        }
        if (!response.ok) {
            throw new Error(`PATCH failed for ${slug}: HTTP ${response.status}`);
        }
        log(`[PATCH] Updated ${slug}`);
    },

    /**
     * Deploy a single widget (outside of a request context).
     * Useful for testing or manual deployment.
     *
     * @param {Object} widget - Canvas widget object
     * @returns {Promise<{ status, slug?, error? }>}
     */
    async deploySingle(widget) {
        const log = (msg) => console.log(`[Deploy Single] ${msg}`);
        let BuilderClass = BUILDER_MAP[widget.type];
        // collection_banner → displayMode lives in widget.pnc.displayMode
        if (widget.type === 'collection_banner' || widget.type === 'Collection Banner') {
            const mode = widget.pnc?.displayMode || widget.displayMode || 'scroll';
            BuilderClass = (mode === 'stick')
                ? CategoryGridBuilder
                : CollectionBannerBuilder;
        }

        if (!BuilderClass) {
            return { status: 'skipped', error: `Unsupported type: ${widget.type}` };
        }

        try {
            const builder = new BuilderClass(widget, { log });
            const result = await builder.deploy();
            return { status: 'ok', slug: result.slugs.widget || Object.values(result.slugs)[0] };
        } catch (err) {
            return { status: 'failed', error: err.message };
        }
    },
};
