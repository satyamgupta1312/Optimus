/**
 * Server-side Validation Middleware
 *
 * Mirrors the validation rules from BackendFlow.js:
 * - Universal fields: type, slug, title, startTime, endTime
 * - Per-type rules: products minItems, carousel items, etc.
 */

// ── Universal Rules ──
const UNIVERSAL_RULES = [
  { field: 'type', rule: 'required', error: 'Widget type is missing' },
  { field: 'slug', rule: 'required', error: 'slug_name cannot be empty' },
  { field: 'title', rule: 'required', error: 'heading_en / text_en cannot be empty' },
];

// ── Per-Type Rules ──
const PER_TYPE_RULES = {
  'Single Product Row': [
    { field: 'products', rule: 'minItems:1', error: 'product_list cannot be empty' },
  ],
  'Single Product Row Optimize': [
    { field: 'products', rule: 'minItems:1', error: 'product_list cannot be empty' },
  ],
  'Double Product Row': [
    { field: 'products', rule: 'minItems:1', error: 'product_list cannot be empty' },
  ],
  'Double Product Row Optimize': [
    { field: 'products', rule: 'minItems:1', error: 'product_list cannot be empty' },
  ],
  'Banner With Product Listing': [
    { field: 'items', rule: 'minItems:1', error: 'At least 1 carousel item required' },
  ],
  'Category Grid': [
    { field: 'items', rule: 'minItems:1', error: 'At least 1 category item required' },
  ],
  'Primary Masthead': [
    { field: 'background_multimedia', rule: 'omitIfEmpty', error: 'Background Multimedia Name is invalid — omit field if empty' },
  ],
};

function checkRule(value, rule) {
  if (rule === 'required') {
    return value !== undefined && value !== null && value !== '';
  }
  if (rule.startsWith('minItems:')) {
    const min = parseInt(rule.split(':')[1], 10);
    return Array.isArray(value) && value.length >= min;
  }
  if (rule === 'omitIfEmpty') {
    // Value should either be absent or non-empty
    return value === undefined || value === null || value !== '';
  }
  if (rule === 'datetime') {
    if (!value) return false;
    return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
  }
  return true;
}

/**
 * Check if a field is exempt from the universal required rule for this widget.
 * Config-driven widgets may have conditional requirements (e.g., multimedia SPR
 * doesn't require title).
 */
function isExempt(widget, field) {
  if (field !== 'title') return false;

  const pnc = typeof widget.pnc === 'string' ? JSON.parse(widget.pnc) : (widget.pnc || {});

  // product_rail (SPR/DPR): title not required when multimedia is enabled
  if (widget.type === 'product_rail' && pnc.has_multimedia) return true;

  // masthead: title/heading is optional — not shown as required field
  if (widget.type === 'masthead') return true;

  // carousel: title optional
  if (widget.type === 'carousel') return true;

  return false;
}

/**
 * Validate a single widget object.
 * Returns array of error strings (empty = valid).
 */
export function validateWidget(widget) {
  const errors = [];

  // Universal
  for (const rule of UNIVERSAL_RULES) {
    // Skip rules that are conditionally exempt for this widget
    if (isExempt(widget, rule.field)) continue;

    // Normalize: slug may live in 'slug_name' on fetched widgets
    let value = widget[rule.field];
    if (rule.field === 'slug' && !value) {
      value = widget.slug_name;
    }
    if (!checkRule(value, rule.rule)) {
      errors.push(rule.error);
    }
  }

  // Per-type
  const typeRules = PER_TYPE_RULES[widget.type] || [];
  for (const rule of typeRules) {
    const value = widget[rule.field] || widget.config?.[rule.field];
    if (!checkRule(value, rule.rule)) {
      errors.push(rule.error);
    }
  }

  return errors;
}

/**
 * Express middleware — validates req.body.widgets array.
 * Attaches validation errors to req.validationErrors (non-blocking)
 * or returns 400 if any widget fails universal checks.
 */
export function validateSubmission(req, res, next) {
  const { widgets } = req.body;
  if (!widgets || !Array.isArray(widgets) || widgets.length === 0) {
    return res.status(400).json({ error: 'At least 1 widget required for submission' });
  }

  const allErrors = [];
  for (let i = 0; i < widgets.length; i++) {
    const errs = validateWidget(widgets[i]);
    if (errs.length > 0) {
      allErrors.push({ index: i, widget: widgets[i].title || `Widget ${i}`, errors: errs });
    }
  }

  if (allErrors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: allErrors });
  }

  next();
}
