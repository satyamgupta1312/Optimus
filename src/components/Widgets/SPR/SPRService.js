/**
 * SPRService — SPR Widget Backend
 *
 * Complete backend for the Single/Double Product Row widget.
 * Handles: validation, variant resolution, payload building, and deployment.
 *
 * Co-located with SPR/SingleProductRow.jsx so the widget is self-contained.
 *
 * Usage:
 *   import { SPRService } from './SPRService';
 *
 *   // Validate before deploy
 *   const { valid, errors } = SPRService.validate(widget);
 *
 *   // Full deploy
 *   const result = await SPRService.deploy(widget);
 */

import { SPRConfig } from '../../../config/widgets/SPRConfig';
import { ENDPOINTS } from '../../../config/apiConfig';
import { resolveVariant, resolveStrategy } from '../../../services/system/VariantResolver';
import { validateWidget, isDeployReady } from '../../../services/system/ConfigValidator';
import { buildPayloads } from '../../../services/system/PayloadBuilder';
import { callApi, createMappingCsv, getNowStr, getFutureStr } from '../../../Backend/ApiClient';

export const SPRService = {

    // ── Validate ──

    /**
     * Validate widget state against SPRConfig rules.
     * @param {Object} widget - Current widget state
     * @returns {{ valid: boolean, errors: Object }}
     */
    validate(widget) {
        return isDeployReady(SPRConfig, widget);
    },

    /**
     * Per-field validation errors (for live form feedback).
     * @param {Object} widget
     * @returns {Object} Map of fieldName → error string | null
     */
    getFieldErrors(widget) {
        return validateWidget(SPRConfig, widget);
    },

    // ── Variant Resolution ──

    /**
     * Resolve the backend widget_type from current PNC state.
     * @param {Object} widget
     * @returns {string} e.g. 'single_product_row_v2', 'multimedia_double_product_row'
     */
    resolveVariant(widget) {
        const pnc = widget.pnc || SPRConfig.initialState.pnc;
        return resolveVariant(SPRConfig, pnc, widget);
    },

    /**
     * Resolve the deploy strategy key.
     * @param {Object} widget
     * @returns {'STANDARD'|'OPTIMIZED'}
     */
    resolveStrategy(widget) {
        const pnc = widget.pnc || SPRConfig.initialState.pnc;
        return resolveStrategy(SPRConfig, pnc);
    },

    // ── Payload Building ──

    /**
     * Build the full deployment plan (dry-run — no API calls).
     * Returns ordered steps with resolved slugs, endpoints, and data.
     * @param {Object} widget
     * @returns {Object} { type, description, resolvedWidgetType, slugBase, steps[] }
     */
    buildDeployPlan(widget) {
        return buildPayloads(SPRConfig, widget);
    },

    // ── Deploy ──

    /**
     * Execute the full deploy flow: validate → build payloads → call APIs sequentially.
     * @param {Object} widget - Widget state { slug, title, products, pnc, ... }
     * @returns {Promise<{ success: boolean, widgetSlug: string, steps: Object[] }>}
     * @throws {Error} If validation fails or any API call fails
     */
    async deploy(widget) {
        // 1. Validate
        const { valid, errors } = this.validate(widget);
        if (!valid) {
            const errorFields = Object.entries(errors)
                .filter(([, msg]) => msg !== null)
                .map(([field, msg]) => `${field}: ${msg}`);
            throw new Error(`Validation failed:\n${errorFields.join('\n')}`);
        }

        // 2. Build plan
        const plan = this.buildDeployPlan(widget);
        const results = [];

        // 3. Execute each step sequentially
        for (const step of plan.steps) {
            if (step.action) {
                // Mapping step
                const result = await this._executeMapping(step);
                results.push({ step: step.index, action: step.action, ...result });
            } else {
                // Entity creation step
                await callApi(step.endpoint, step.data, { multipart: step.type === 'multipart' });
                results.push({ step: step.index, entity: step.entity, slug: step.slug, success: true });
            }
        }

        return {
            success: true,
            strategy: plan.type,
            widgetType: plan.resolvedWidgetType,
            slugBase: plan.slugBase,
            steps: results,
        };
    },

    // ── Internal: Execute Mapping Steps ──

    async _executeMapping(step) {
        if (step.action === 'map_widget_item') {
            const csv = createMappingCsv('widget_item', step.childSlug);
            await callApi(ENDPOINTS.mapWidgetItems, {
                widget_slug: step.parentSlug,
                mapping_file: csv,
            }, { multipart: true });
            return { success: true, parent: step.parentSlug, child: step.childSlug };
        }

        if (step.action === 'map_layout_widget') {
            const csv = createMappingCsv('layout_widget', step.parentSlug);
            await callApi(ENDPOINTS.mapLayoutWidget, {
                page_layout_slug: step.parentSlug,
                mapping_file: csv,
            }, { multipart: true });
            return { success: true, parent: step.parentSlug, child: step.childSlug };
        }

        if (step.action === 'map_page_layout') {
            const csv = createMappingCsv('global_page', '');
            await callApi(ENDPOINTS.mapPageLayout, {
                page_layout_slug: step.parentSlug,
                page_type: '',
                mapping_file: csv,
            }, { multipart: true });
            return { success: true, parent: step.parentSlug };
        }

        throw new Error(`Unknown mapping action: ${step.action}`);
    },
};
