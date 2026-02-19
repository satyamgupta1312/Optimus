/**
 * ValidationService — Frontend Pre-Submit Validation
 *
 * Runs WidgetRegistry.getValidationRules() per widget before submission.
 * Also provides slug uniqueness check via backend API.
 *
 * Wiki Reference: wiki/Backend-work-flow.md — Pre-Submit Validation
 */

import { WidgetRegistry } from '../config/WidgetRegistry';
import { API_BASE } from '../config/apiConfig';

// ── Field Validation Helpers ───────────────────────────────────────────────

const validators = {
    required: (value) => {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim().length > 0;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    },
    'minItems:1': (value) =>
        Array.isArray(value) && value.length >= 1,
    'minLength:3': (value) =>
        typeof value === 'string' && value.trim().length >= 3,
    'format:datetime': (value) => {
        if (!value) return false;
        // Accept YYYY-MM-DD HH:MM:SS or ISO format
        return /^\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}(:\d{2})?/.test(value);
    },
};

const runRule = (rule, value) => {
    const fn = validators[rule];
    if (!fn) return true; // Unknown rule — skip
    return fn(value);
};

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * validateWidgets(widgets)
 *
 * Validates all widgets against their WidgetRegistry rules.
 * Returns { valid: bool, errors: [{widgetId, widgetTitle, field, message}] }
 */
export const validateWidgets = (widgets = []) => {
    const errors = [];

    for (const widget of widgets) {
        const rules = WidgetRegistry.getValidationRules(widget.type) || [];

        for (const rule of rules) {
            const fieldValue = widget[rule.field];
            const passes = runRule(rule.rule, fieldValue);

            if (!passes) {
                errors.push({
                    widgetId: widget.id,
                    widgetTitle: widget.title || widget.type || 'Untitled Widget',
                    field: rule.field,
                    message: rule.errorMessage || `${rule.field} is invalid.`,
                });
            }
        }

        // slug_name-specific: must have value if type not in exclusions
        if (!widget.slug_name || widget.slug_name.trim() === '') {
            errors.push({
                widgetId: widget.id,
                widgetTitle: widget.title || widget.type || 'Untitled Widget',
                field: 'slug_name',
                message: 'Slug name is required.',
            });
        }
    }

    return { valid: errors.length === 0, errors };
};

/**
 * checkSlugAvailability(slugName)
 *
 * Checks if a slug already exists on the backend.
 * Returns { available: bool, error?: string }
 *
 * Wiki Reference: Backend-work-flow.md — Slug Uniqueness Check (Step 5)
 */
export const checkSlugAvailability = async (slugName) => {
    if (!slugName || slugName.trim() === '') {
        return { available: false, error: 'Slug name is empty.' };
    }

    try {
        const url = `${API_BASE}/api/app/widget/?slug_name=${encodeURIComponent(slugName.trim())}`;
        const res = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            redirect: 'follow',
        });

        if (!res.ok) {
            // 404 = not found = available ✅
            if (res.status === 404) return { available: true };
            throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        // If backend returns non-empty results, slug is taken
        const taken =
            (Array.isArray(data) && data.length > 0) ||
            (data?.results && data.results.length > 0) ||
            (data?.id); // single object return

        return { available: !taken };
    } catch (e) {
        console.warn('[ValidationService] Slug check failed (network):', e.message);
        // On network failure: allow submit (non-blocking)
        return { available: true, warning: 'Slug check skipped (network error)' };
    }
};

/**
 * validateAndCheckSlugs(widgets)
 *
 * Combines field validation + slug uniqueness checks.
 * Returns { valid: bool, errors: [...] }
 */
export const validateAndCheckSlugs = async (widgets = []) => {
    // 1. Field-level validation (sync)
    const fieldResult = validateWidgets(widgets);
    const errors = [...fieldResult.errors];

    // 2. Slug uniqueness checks (async, only if field validation passed for slug_name)
    const slugChecks = widgets
        .filter((w) => w.slug_name && w.slug_name.trim() !== '')
        .map(async (w) => {
            // Skip slug check for fetched widgets (they already exist on backend)
            if (w._fetched) return null;

            const result = await checkSlugAvailability(w.slug_name);
            if (!result.available) {
                return {
                    widgetId: w.id,
                    widgetTitle: w.title || w.type || 'Untitled Widget',
                    field: 'slug_name',
                    message: `Slug "${w.slug_name}" already exists. Please use a different slug.`,
                };
            }
            return null;
        });

    const slugResults = await Promise.all(slugChecks);
    const slugErrors = slugResults.filter(Boolean);
    errors.push(...slugErrors);

    return { valid: errors.length === 0, errors };
};

export default { validateWidgets, checkSlugAvailability, validateAndCheckSlugs };
