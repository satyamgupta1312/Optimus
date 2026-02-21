/**
 * ValidationService — Frontend Pre-Submit Validation
 *
 * Runs WidgetRegistry.getValidationRules() per widget before submission.
 * Also provides slug uniqueness check via backend API.
 *
 * Wiki Reference: wiki/Backend-work-flow.md — Pre-Submit Validation
 */

import { WidgetRegistry } from '../config/WidgetRegistry';
import { LocalApiService } from './LocalApiService';

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
        if (!value) return true; // Optional — only validate format if present
        // Accept multiple formats:
        //   YYYY-MM-DD HH:MM:SS, YYYY-MM-DDTHH:MM, DD Mon YYYY HH:MM
        return /^(\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}(:\d{2})?|\d{1,2} \w{3} \d{4} \d{2}:\d{2})/.test(value);
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
            // Normalize: slug field may live in 'slug_name' on fetched widgets
            let fieldValue = widget[rule.field];
            if (rule.field === 'slug' && !fieldValue) {
                fieldValue = widget.slug_name;
            }
            const passes = runRule(rule.rule, fieldValue);

            if (!passes) {
                errors.push({
                    widgetId: widget.id,
                    widgetTitle: widget.title || widget.type || 'Untitled Widget',
                    field: rule.field,
                    message: rule.errorMessage || rule.error || `${rule.field} is invalid.`,
                });
            }
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
        // Check via local backend (Prisma) with proper auth headers
        const results = await LocalApiService.getWidgets({ slug: slugName.trim() });

        // If backend returns non-empty results, slug is taken
        const taken = Array.isArray(results) ? results.length > 0 : !!results?.id;
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
        .filter((w) => (w.slug || w.slug_name || '').trim() !== '')
        .map(async (w) => {
            // Skip slug check for fetched widgets (they already exist on backend)
            if (w._fetched) return null;

            const result = await checkSlugAvailability(w.slug || w.slug_name);
            if (!result.available) {
                return {
                    widgetId: w.id,
                    widgetTitle: w.title || w.type || 'Untitled Widget',
                    field: 'slug_name',
                    message: `Slug "${w.slug || w.slug_name}" already exists. Please use a different slug.`,
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
