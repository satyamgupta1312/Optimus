/**
 * WidgetRegistry — Central Registry of Config-Driven Widgets
 *
 * This is the single entry point for all widget config lookups.
 * Consumer modules (PropertyEditor, WidgetRenderer, PayloadBuilder)
 * use this to get the config for any widget type.
 *
 * Adding a new widget = import its config + add to the registry.
 */

import { ProductRailConfig } from './widgets/ProductRailConfig';
import { resolveVariant, resolveStrategy, getAvailableVariants } from '../services/system/VariantResolver';

// ── Registry Map: type → config ──
const configMap = {
    [ProductRailConfig.type]: ProductRailConfig,
    // Future:
    // [CategoryGridConfig.type]: CategoryGridConfig,
    // [MastheadConfig.type]: MastheadConfig,
    // [BannerConfig.type]: BannerConfig,
    // [CarouselConfig.type]: CarouselConfig,
};

export const WidgetRegistry = {
    /**
     * Get config by type string.
     * @param {string} type - Widget type (e.g. 'product_rail')
     * @returns {Object|null}
     */
    getConfig(type) {
        return configMap[type] || null;
    },

    /**
     * Get all registered config-driven widget configs.
     * Used by WidgetLibrary to render the "Add" menu.
     * @returns {Object[]}
     */
    getAllConfigs() {
        return Object.values(configMap);
    },

    /**
     * Resolve the backend widget_type from PNC properties.
     * Convenience wrapper around VariantResolver.
     */
    resolveVariant(type, pnc, widget) {
        const config = this.getConfig(type);
        if (!config) return type;
        return resolveVariant(config, pnc, widget);
    },

    /**
     * Resolve the deploy strategy key from PNC.
     */
    resolveStrategy(type, pnc) {
        const config = this.getConfig(type);
        if (!config) return 'STANDARD';
        return resolveStrategy(config, pnc);
    },

    /**
     * Get all available variant types for a widget.
     */
    getAvailableVariants(type) {
        const config = this.getConfig(type);
        if (!config) return [type];
        return getAvailableVariants(config);
    },

    /**
     * Check if a type is config-driven (vs legacy).
     */
    isConfigDriven(type) {
        return !!configMap[type];
    },
};

// Legacy Widget Definitions (To be migrated one by one)
export const LegacyWidgetDefinitions = [];
