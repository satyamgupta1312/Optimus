/**
 * ConfigValidator
 *
 * Provides field-level validation (used by PropertyEditor for real-time errors)
 * and full widget validation (used by PayloadBuilder before API calls).
 *
 * All rules come from the widget config — zero hard-coding.
 *
 * Usage:
 *   import { validateField, validateWidget } from './ConfigValidator';
 *
 *   // Single field
 *   const error = validateField(fieldConfig, value);
 *   // → null (valid) or 'Slug must be lowercase...' (error message)
 *
 *   // Full widget
 *   const errors = validateWidget(ProductRailConfig, widgetState);
 *   // → { slug: 'Slug is required', title: null, ... }
 */

/**
 * Validate a single field value against its config.
 * @param {Object} field - Field config (from config.fields[])
 * @param {*} value - Current field value
 * @returns {string|null} Error message or null if valid
 */
export function validateField(field, value) {
    const rules = field.validation;
    if (!rules) return null;

    // Required check
    if (rules.required) {
        if (value === undefined || value === null || value === '') {
            return field.errorMessage || `${field.label} is required`;
        }
        // Array-based required (e.g. products list)
        if (Array.isArray(value) && value.length === 0) {
            return field.errorMessage || `${field.label} requires at least one item`;
        }
    }

    // Skip further checks if value is empty and not required
    if (!value && !rules.required) return null;

    // String validations
    if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
            return field.errorMessage || `${field.label} must be at least ${rules.minLength} characters`;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
            return field.errorMessage || `${field.label} must be at most ${rules.maxLength} characters`;
        }
        if (rules.pattern && !rules.pattern.test(value)) {
            return field.errorMessage || `${field.label} format is invalid`;
        }
    }

    // Array validations
    if (Array.isArray(value)) {
        if (rules.minItems && value.length < rules.minItems) {
            return field.errorMessage || `${field.label} needs at least ${rules.minItems} items`;
        }
        if (rules.maxItems && value.length > rules.maxItems) {
            return field.errorMessage || `${field.label} can have at most ${rules.maxItems} items`;
        }
        if (rules.itemValidator) {
            const invalidItems = value.filter(item => !rules.itemValidator(item));
            if (invalidItems.length > 0) {
                return field.errorMessage || `${field.label} contains invalid items`;
            }
        }
    }

    // File size validation
    if (rules.maxSizeKB && value && value.size) {
        if (value.size > rules.maxSizeKB * 1024) {
            return field.errorMessage || `${field.label} must be under ${rules.maxSizeKB}KB`;
        }
    }

    // File extension validation
    if (rules.acceptExtensions && typeof value === 'string' && value.length > 0) {
        const ext = '.' + value.split('.').pop().toLowerCase();
        if (!rules.acceptExtensions.includes(ext)) {
            return field.errorMessage || `${field.label} must be one of: ${rules.acceptExtensions.join(', ')}`;
        }
    }

    return null;
}

/**
 * Validate the entire widget state against its config.
 * @param {Object} config - Widget config (e.g. ProductRailConfig)
 * @param {Object} widgetState - Current widget state { slug, title, products, pnc, ... }
 * @returns {Object} Map of fieldName → errorMessage (null if valid)
 *
 * Example return:
 *   { slug: null, title: 'Title is required', products: null, ... }
 */
export function validateWidget(config, widgetState = {}) {
    const errors = {};
    const pnc = widgetState.pnc || {};

    if (!config.fields) return errors;

    for (const field of config.fields) {
        // Skip fields whose condition is not met
        if (field.condition && !field.condition(pnc)) {
            continue;
        }

        errors[field.name] = validateField(field, widgetState[field.name]);
    }

    return errors;
}

/**
 * Check if a widget is ready to deploy (all validations pass).
 * @param {Object} config - Widget config
 * @param {Object} widgetState - Current widget state
 * @returns {{ valid: boolean, errors: Object }}
 */
export function isDeployReady(config, widgetState) {
    const errors = validateWidget(config, widgetState);
    const hasErrors = Object.values(errors).some(e => e !== null);
    return { valid: !hasErrors, errors };
}
