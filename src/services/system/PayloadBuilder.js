/**
 * PayloadBuilder
 *
 * Generic API payload generator that reads `config.deployStrategies`
 * and produces ordered payloads ready for execution.
 *
 * Replaces hard-coded ProductRailBuilder.js and WidgetApiService.createSingleProductRow.
 *
 * Usage:
 *   import { buildPayloads } from './PayloadBuilder';
 *   const plan = buildPayloads(ProductRailConfig, widgetState);
 *   // → { type: 'OPTIMIZED', steps: [{ endpoint, data, type }, ...] }
 */

import { resolveVariant, resolveStrategy } from './VariantResolver';

/**
 * Build the complete deployment plan from config + widget state.
 * @param {Object} config - Widget config (e.g. ProductRailConfig)
 * @param {Object} widget - Widget state { slug, title, titleHi, products, pnc, ... }
 * @returns {Object} Deployment plan with resolved payloads
 */
export function buildPayloads(config, widget) {
    const pnc = widget.pnc || config.initialState?.pnc || {};
    const strategyKey = resolveStrategy(config, pnc);
    const strategy = config.deployStrategies?.[strategyKey];

    if (!strategy) {
        throw new Error(`[PayloadBuilder] No deploy strategy found for key: ${strategyKey}`);
    }

    const resolvedWidgetType = resolveVariant(config, pnc, widget);
    const slugBase = widget.slug || widget.title?.toLowerCase().replace(/\s+/g, '_') || `widget_${Date.now()}`;
    const productCodes = (widget.products || []).map(p => p.itemCode || p.id).filter(Boolean).join(',');

    // Build a context object for $variable resolution
    const context = {
        slug: slugBase,
        title: widget.title || '',
        titleHi: widget.titleHi || '',
        productCodes: productCodes,
        resolvedWidgetType: resolvedWidgetType,
        startTime: widget.startTime || _getNowStr(),
        endTime: widget.endTime || _getFutureStr(),
        backgroundMedia: widget.background_media || widget.backgroundMultimedia || '',
        inStockFilter: JSON.stringify([{
            condition: 'in_stk_item_codes',
            value: productCodes,
        }]),
        viewAllParams: '', // Will be resolved per step
        filterDict: JSON.stringify(widget.filter_dict || {}),
        appConfigurations: JSON.stringify(widget.app_configurations || {}),
    };

    // Resolve each step
    const resolvedSteps = strategy.steps.map((step, index) => {
        // Mapping actions (no endpoint, just action instruction)
        if (step.action) {
            return {
                index,
                action: step.action,
                parentSlug: `${slugBase}${step.parentSlugSuffix}`,
                childSlug: `${slugBase}${step.childSlugSuffix}`,
            };
        }

        // Entity creation steps
        const resolvedSlug = `${slugBase}${step.slugSuffix}`;

        // Resolve $variables in fieldMap
        const data = {};
        if (step.fieldMap) {
            for (const [key, value] of Object.entries(step.fieldMap)) {
                if (typeof value === 'string' && value.startsWith('$')) {
                    const varName = value.slice(1);
                    data[key] = context[varName] ?? '';

                    // Special: resolve slug_name to include suffix
                    if (key === 'slug_name') {
                        data[key] = resolvedSlug;
                    }
                } else {
                    data[key] = value;
                }
            }
        }

        // Special: resolve view_all_action_params if present
        if (data.view_all_action_params === '') {
            // Find the page_layout slug from previous steps
            const pageStep = strategy.steps.find(s => s.entity === 'page_layout');
            if (pageStep) {
                data.view_all_action_params = JSON.stringify({
                    page_type: 'product_listing_page',
                    page_layout_slug_name: `${slugBase}${pageStep.slugSuffix}`,
                });
            }
        }

        return {
            index,
            entity: step.entity,
            endpoint: step.endpoint,
            type: step.type || 'multipart',
            slug: resolvedSlug,
            data,
        };
    });

    return {
        type: strategyKey,
        description: strategy.description,
        resolvedWidgetType,
        slugBase,
        steps: resolvedSteps,
    };
}

// ── Helpers ──

function _getNowStr() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function _getFutureStr(days = 365) {
    const future = new Date();
    future.setDate(future.getDate() + days);
    return future.toISOString().slice(0, 19).replace('T', ' ');
}
