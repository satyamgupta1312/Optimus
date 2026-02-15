/**
 * VariantResolver
 *
 * Pure function that resolves PNC (Properties & Configuration) into a backend widget_type.
 * Reads the variantMatrix from the widget config — zero hard-coding.
 *
 * Usage:
 *   import { resolveVariant } from './VariantResolver';
 *   const widgetType = resolveVariant(ProductRailConfig, widget.pnc);
 *   // → 'multimedia_single_product_row_v2'
 */

/**
 * Resolve the backend widget_type from PNC properties.
 * @param {Object} config - Widget config (e.g. ProductRailConfig)
 * @param {Object} pnc - Current PNC state (e.g. { rows: 1, is_optimized: true })
 * @param {Object} widget - Full widget state (used to check implicit props like background_media)
 * @returns {string} The resolved backend widget_type string
 */
export function resolveVariant(config, pnc = {}, widget = {}) {
    if (!config.variantMatrix || config.variantMatrix.length === 0) {
        console.warn('[VariantResolver] No variantMatrix found in config:', config.type);
        return config.type;
    }

    // Determine implicit properties
    const hasMultimedia = !!(widget.background_media || widget.backgroundMultimedia || widget.background_video);

    // Build lookup key from PNC + implicit props
    const lookupProps = {
        rows: pnc.rows ?? config.properties?.rows?.default ?? 1,
        is_optimized: pnc.is_optimized ?? config.properties?.is_optimized?.default ?? true,
        has_multimedia: hasMultimedia,
    };

    // Find exact match in the matrix
    const match = config.variantMatrix.find(entry =>
        entry.rows === lookupProps.rows &&
        entry.is_optimized === lookupProps.is_optimized &&
        entry.has_multimedia === lookupProps.has_multimedia
    );

    if (!match) {
        console.warn(
            '[VariantResolver] No matrix match for:', lookupProps,
            '— falling back to first entry.'
        );
        return config.variantMatrix[0].widgetType;
    }

    return match.widgetType;
}

/**
 * Get the deploy strategy key based on PNC.
 * @param {Object} config - Widget config
 * @param {Object} pnc - Current PNC state
 * @returns {string} Strategy key (e.g. 'STANDARD', 'OPTIMIZED')
 */
export function resolveStrategy(config, pnc = {}) {
    if (!config.deployStrategies) return 'STANDARD';

    const isOptimized = pnc.is_optimized ?? config.properties?.is_optimized?.default ?? true;
    return isOptimized ? 'OPTIMIZED' : 'STANDARD';
}

/**
 * Get all available variant types for a config (useful for dropdowns/debugging).
 * @param {Object} config - Widget config
 * @returns {string[]} Array of unique widget_type strings
 */
export function getAvailableVariants(config) {
    if (!config.variantMatrix) return [config.type];
    return [...new Set(config.variantMatrix.map(e => e.widgetType))];
}
