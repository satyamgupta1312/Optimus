/**
 * WidgetRegistry — Central Registry of Config-Driven Widgets
 *
 * This is the single entry point for all widget config lookups.
 * Consumer modules (PropertyEditor, WidgetRenderer, PayloadBuilder)
 * use this to get the config for any widget type.
 *
 * Adding a new widget = import its config + add to the registry.
 *
 * Also integrates BackendFlow.js — the end-to-end workflow config
 * (stages, roles, validation, approval routing, API endpoints).
 * Wiki Reference: wiki/Backend-work-flow.md
 */

import { CollectionBannerConfig } from './widgets/CollectionBannerConfig';
import { MastheadConfig } from './widgets/MastheadConfig';
import { SPRConfig } from './widgets/SPRConfig';
import { resolveVariant, resolveStrategy, getAvailableVariants } from '../services/system/VariantResolver';
import {
    WORKFLOW_STAGES,
    ROLE_PERMISSIONS,
    VALIDATION_RULES,
    APPROVAL_ROUTING,
    BACKEND_ENDPOINTS,
    ERROR_CATALOGUE,
    WORKFLOW_SUMMARY,
} from './BackendFlow';

// ── Registry Map: type → config ──
const configMap = {
    [SPRConfig.type]: SPRConfig, // 'product_rail' — all 8 SPR+DPR variants
    [CollectionBannerConfig.type]: CollectionBannerConfig,
    [MastheadConfig.type]: MastheadConfig,
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

    // ── BackendFlow Integration ──

    /**
     * Get the complete backend workflow config (from BackendFlow.js).
     * Includes stages, roles, validation rules, routing, endpoints, errors.
     * Wiki: wiki/Backend-work-flow.md
     */
    getWorkflowConfig() {
        return {
            stages: WORKFLOW_STAGES,
            roles: ROLE_PERMISSIONS,
            validation: VALIDATION_RULES,
            routing: APPROVAL_ROUTING,
            endpoints: BACKEND_ENDPOINTS,
            errors: ERROR_CATALOGUE,
            summary: WORKFLOW_SUMMARY,
        };
    },

    /**
     * Get allowed action keys for a role + page status combination.
     * @param {string} role   - 'MAKER' | 'CHECKER' | 'SUPER_ADMIN'
     * @param {string} status - 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
     * @returns {string[]}
     */
    getAllowedActions(role, status) {
        const perms = ROLE_PERMISSIONS[role];
        const stage = WORKFLOW_STAGES[status];
        if (!perms || !stage) return [];
        return Object.entries(perms)
            .filter(([, allowed]) => allowed === true)
            .map(([action]) => action);
    },

    /**
     * Get the Apps Script function name + script for a canvas widget type.
     * @param {string} widgetType - e.g. 'Single Product Row Optimize'
     * @returns {{ fn, script, description } | null}
     */
    getApprovalRoute(widgetType) {
        return APPROVAL_ROUTING[widgetType] || null;
    },

    /**
     * Get combined validation rules (universal + type-specific) for a widget type.
     * @param {string} widgetType - e.g. 'Single Product Row'
     * @returns {Object[]}
     */
    getValidationRules(widgetType) {
        const universal = VALIDATION_RULES.universal || [];
        const specific = VALIDATION_RULES.perType?.[widgetType] || [];
        return [...universal, ...specific];
    },
};

// Legacy Widget Definitions (To be migrated one by one)
export const LegacyWidgetDefinitions = [];

// Re-export BackendFlow constants for direct import by other modules
export {
    WORKFLOW_STAGES,
    ROLE_PERMISSIONS,
    VALIDATION_RULES,
    APPROVAL_ROUTING,
    BACKEND_ENDPOINTS,
    ERROR_CATALOGUE,
    WORKFLOW_SUMMARY,
};
