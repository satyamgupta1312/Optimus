/**
 * KineticSyncService — Widget-specific sync logic for Kinetic.
 *
 * Transforms Optimus widget data into Kinetic table rows and
 * provides history/analytics fetch via saved queries.
 *
 * Two operation modes:
 *   1. STRICT (blocking, throws) — for source-of-truth writes/reads
 *      createSubmission(), updateRequestStatus(), logActivity(),
 *      fetchRequests(), fetchRequestById(), fetchActivityLog()
 *
 *   2. FIRE-AND-FORGET (non-blocking, never throws) — for mirrors
 *      syncDeploy(), syncUserRoleAdd/Remove(), syncLocation*()
 *
 * Sync points:
 *   1. createSubmission()    — on submit (PENDING) — BLOCKING
 *   2. updateRequestStatus() — on approve/reject/reopen — BLOCKING
 *   3. logActivity()         — on any action — BLOCKING for requests, fire-and-forget for widget CRUD
 *   4. syncDeploy()          — on deploy (DEPLOYED) with actual slugs + hierarchy
 */
import * as Kinetic from './KineticService.js';
import crypto from 'crypto';

// ── Table / Query constants ──

const TABLE_PROD = 'submissions';
const TABLE_UAT = 'submissions_uat';
const TABLE_ACTIVITY = 'activity_log';
const TABLE_ACTIVITY_UAT = 'activity_log_uat';

const QUERY_HISTORY = 'widgets/submissions-by-date';
const QUERY_ANALYTICS = 'widgets/analytics';
const QUERY_SEARCH = 'widgets/search';
const QUERY_PENDING = 'widgets/pending-requests';
const QUERY_BY_ID = 'widgets/request-by-id';
const QUERY_ACTIVITY = 'widgets/activity-log';

function getSubmissionsTable(env) {
  return env === 'UAT' ? TABLE_UAT : TABLE_PROD;
}

function getActivityTable(env) {
  return env === 'UAT' ? TABLE_ACTIVITY_UAT : TABLE_ACTIVITY;
}

// ── Helpers ──

/**
 * Extract Hindi titles from widget items (carousel/scroll items, sub-categories).
 * Returns a JSON string of an array of { name, nameHi } objects.
 */
function extractItemTitlesHi(w) {
  const titles = [];

  // Carousel items (Secondary Masthead)
  if (Array.isArray(w.carouselItems)) {
    for (const item of w.carouselItems) {
      if (item.nameHi || item.titleHi) {
        titles.push({ name: item.name || item.title || '', nameHi: item.nameHi || item.titleHi || '' });
      }
      // Sub-categories inside carousel items
      if (Array.isArray(item.subCategories)) {
        for (const sc of item.subCategories) {
          if (sc.nameHi) titles.push({ name: sc.name || '', nameHi: sc.nameHi });
        }
      }
    }
  }

  // Scroll items (Collection Banner)
  if (Array.isArray(w.scrollItems)) {
    for (const item of w.scrollItems) {
      if (item.nameHi || item.titleHi) {
        titles.push({ name: item.name || item.title || '', nameHi: item.nameHi || item.titleHi || '' });
      }
      if (Array.isArray(item.subCategories)) {
        for (const sc of item.subCategories) {
          if (sc.nameHi) titles.push({ name: sc.name || '', nameHi: sc.nameHi });
        }
      }
    }
  }

  return JSON.stringify(titles);
}

/**
 * Derive the expected hierarchy from base slug + widget type + pnc.
 * This is a best-effort derivation at submit time — deploy will overwrite with actuals.
 */
function deriveHierarchy(w) {
  const base = w.slug || w.slug_name || '';
  if (!base) return JSON.stringify({});

  const pnc = typeof w.pnc === 'object' ? w.pnc : {};
  const isOptimized = pnc.is_optimized;
  const pageType = w.pageType || 'product_listing_page';
  const type = (w.type || '').toLowerCase();

  // SPR / DPR variants
  if (type.includes('product_row')) {
    const widgetSuffix = isOptimized ? '_spr_opt' : '_spr';
    const pageSuffix = pageType === 'category_page' ? '_Cat_page' : '_page_p';
    const states = Object.keys(w.stateProducts || {});

    return JSON.stringify({
      page: `${base}${pageSuffix}`,
      plpWidget: `${base}_plp_w`,
      homeWidget: `${base}${widgetSuffix}`,
      scItems: states.map(s => `${base}_sc_wi_${s}`),
      rowItems: states.map(s => `${base}_pr_wi_${s}`),
    });
  }

  // Carousel / Collection Banner
  if (type.includes('carousel') || type.includes('collection') || type.includes('scroll')) {
    const items = w.scrollItems || w.carouselItems || [];
    return JSON.stringify({
      page: `${base}_page_p`,
      items: items.map((_, i) => ({
        item: `${base}_item_${i + 1}_cl_wi`,
        page: `${base}_item_${i + 1}_plp_page`,
        plp: `${base}_item_${i + 1}_plp`,
      })),
    });
  }

  // Secondary Masthead
  if (type.includes('masthead') && type.includes('secondary')) {
    const items = w.carouselItems || [];
    return JSON.stringify({
      items: items.map((_, i) => ({
        carousel: `${base}_item_${i + 1}_carousel`,
      })),
    });
  }

  return JSON.stringify({ base });
}

/**
 * Derive the page slug from base slug + widget config.
 */
function derivePageSlug(w) {
  const base = w.slug || w.slug_name || '';
  if (!base) return '';
  const pageType = w.pageType || 'product_listing_page';
  return pageType === 'category_page' ? `${base}_Cat_page` : `${base}_page_p`;
}

// ══════════════════════════════════════════════════════════════
// STRICT (BLOCKING) — ClickHouse is source of truth
// ══════════════════════════════════════════════════════════════

/**
 * Create a submission in ClickHouse — BLOCKING, throws on failure.
 *
 * @param {string} requestId - UUID for the request
 * @param {Array}  widgets   - Canvas widgets array
 * @param {object} user      - { id, email, name }
 * @param {string} env       - 'PROD' or 'UAT'
 * @param {object} headerWidgets - Header widget snapshot object
 * @returns {object} Kinetic API response
 */
export async function createSubmission(requestId, widgets, user, env, headerWidgets = {}) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const table = getSubmissionsTable(env);
  const headerJson = JSON.stringify(headerWidgets || {});

  const rows = widgets.map((w, i) => {
    const pnc = typeof w.pnc === 'string' ? w.pnc : JSON.stringify(w.pnc || {});
    const products = typeof w.products === 'string'
      ? JSON.parse(w.products)
      : (w.products || []);

    // Build a clean snapshot (strip File/Blob which can't serialize)
    const snapshot = {};
    for (const [k, v] of Object.entries(w)) {
      if (typeof v === 'function') continue;
      if (typeof File !== 'undefined' && v instanceof File) continue;
      if (typeof Blob !== 'undefined' && v instanceof Blob) continue;
      snapshot[k] = v;
    }

    return {
      dt: today,
      widget_id: w.id || w._dbId || '',
      widget_type: w.type || 'unknown',
      slug: w.slug || w.slug_name || '',
      title: w.title || '',
      title_hi: w.titleHi || '',
      item_titles_hi: extractItemTitlesHi(w),
      status: 'PENDING',
      submitted_by: user.email || '',
      edited_by: '',
      edited_at: '',
      env: env || 'PROD',
      products_count: Array.isArray(products) ? products.length : 0,
      pnc,
      page_slug: derivePageSlug(w),
      hierarchy: deriveHierarchy(w),
      snapshot: JSON.stringify(snapshot),
      request_id: requestId,
      // New source-of-truth columns
      rejection_reason: '',
      header_widgets: headerJson,
      request_type: 'Homepage Update',
      sort_order: i,
      request_status: 'PENDING',
      submitted_at: now,
      result: '',
      error: '',
    };
  });

  if (rows.length === 0) {
    // Insert a header-only row if no body widgets but headerWidgets exist
    if (Object.keys(headerWidgets || {}).length > 0) {
      rows.push({
        dt: today,
        widget_id: '__header_only__',
        widget_type: 'header',
        slug: '',
        title: 'Header Widgets Only',
        title_hi: '',
        item_titles_hi: '[]',
        status: 'PENDING',
        submitted_by: user.email || '',
        edited_by: '',
        edited_at: '',
        env: env || 'PROD',
        products_count: 0,
        pnc: '{}',
        page_slug: '',
        hierarchy: '{}',
        snapshot: '{}',
        request_id: requestId,
        rejection_reason: '',
        header_widgets: headerJson,
        request_type: 'Homepage Update',
        sort_order: 0,
        request_status: 'PENDING',
        submitted_at: now,
        result: '',
        error: '',
      });
    } else {
      throw new Error('No widgets to submit');
    }
  }

  console.log(`[KineticSync] Creating submission: ${rows.length} widget(s) for request ${requestId}`);
  const result = await Kinetic.insertRowsStrict(table, rows);
  console.log(`[KineticSync] Submission created in ${table}`);
  return result;
}

/**
 * Update request status in ClickHouse — BLOCKING, throws on failure.
 *
 * @param {string} requestId - Request UUID
 * @param {string} newStatus - 'APPROVED', 'REJECTED', 'DRAFT', 'DEPLOYED'
 * @param {object} user      - { email }
 * @param {string} env       - 'PROD' or 'UAT'
 * @param {object} opts      - { rejectionReason? }
 */
export async function updateRequestStatus(requestId, newStatus, user, env, opts = {}) {
  const table = getSubmissionsTable(env);
  const set = {
    request_status: `'${newStatus}'`,
    status: `'${newStatus}'`,
  };
  if (user?.email) {
    set.edited_by = `'${user.email}'`;
    set.edited_at = `'${new Date().toISOString()}'`;
  }
  if (opts.rejectionReason !== undefined) {
    set.rejection_reason = `'${(opts.rejectionReason || '').replace(/'/g, "\\'")}'`;
  }

  console.log(`[KineticSync] Updating status -> ${newStatus} for request ${requestId}`);
  const result = await Kinetic.updateRowsStrict(table, {
    set,
    where: `request_id = '${requestId}'`,
  });
  console.log(`[KineticSync] Status updated`);
  return result;
}

/**
 * Log an activity entry to ClickHouse — BLOCKING, throws on failure.
 *
 * @param {object} params
 * @param {string} params.action    - 'submit', 'approve', 'reject', 'create', etc.
 * @param {object} params.user      - { email, name }
 * @param {string} params.targetId  - Widget or Request ID
 * @param {string} [params.targetType] - 'request', 'widget', 'headerWidgets'
 * @param {object} [params.details] - Extra context
 * @param {string} [params.env]     - 'PROD' or 'UAT'
 */
export async function logActivity({ action, user, targetId, targetType, details, env }) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const table = getActivityTable(env);

  const row = {
    id: crypto.randomUUID(),
    dt: today,
    action: action || '',
    user_email: user?.email || '',
    user_name: user?.name || user?.email?.split('@')[0] || '',
    target_id: targetId || '',
    target_type: targetType || '',
    details: JSON.stringify(details || {}),
    env: env || 'PROD',
    created_at: now,
  };

  const result = await Kinetic.insertRowsStrict(table, [row]);
  return result;
}

/**
 * Fire-and-forget activity log — same as logActivity but swallows errors.
 * Used for widget CRUD logs where failure is acceptable.
 */
export async function logActivitySafe(params) {
  try {
    await logActivity(params);
  } catch (err) {
    console.warn('[KineticSync] Activity log failed (non-blocking):', err.message);
  }
}

// ── Read path (BLOCKING) ──

/**
 * Group flat CH rows into nested request objects matching the Prisma response shape.
 *
 * Input: flat rows with request_id, widget_id, snapshot, etc.
 * Output: array of { id, status, type, env, submitter, headerWidgets, createdAt, rejectionReason, requestWidgets: [...] }
 */
function groupRowsIntoRequests(rows) {
  const map = new Map();

  for (const row of rows) {
    const rid = row.request_id;
    if (!map.has(rid)) {
      map.set(rid, {
        id: rid,
        status: row.request_status || row.status || 'PENDING',
        type: row.request_type || 'Homepage Update',
        env: row.env || 'PROD',
        submittedBy: row.submitted_by || '',
        submitter: {
          email: row.submitted_by || '',
          name: row.submitted_by ? row.submitted_by.split('@')[0] : '',
        },
        rejectionReason: row.rejection_reason || '',
        headerWidgets: safeJsonParse(row.header_widgets, {}),
        createdAt: row.submitted_at || row.dt || '',
        updatedAt: row.edited_at || row.submitted_at || '',
        requestWidgets: [],
      });
    }

    const req = map.get(rid);

    // Skip header-only placeholder rows
    if (row.widget_id === '__header_only__') continue;

    req.requestWidgets.push({
      id: `${rid}_${row.widget_id}`,
      requestId: rid,
      widgetId: row.widget_id || '',
      snapshot: safeJsonParse(row.snapshot, {}),
      sortOrder: Number(row.sort_order) || 0,
      result: row.result || '',
      error: row.error || '',
      widget: {
        id: row.widget_id || '',
        type: row.widget_type || '',
        slug: row.slug || '',
        title: row.title || '',
      },
    });
  }

  // Sort requestWidgets by sortOrder
  for (const req of map.values()) {
    req.requestWidgets.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return Array.from(map.values());
}

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/**
 * Fetch requests from ClickHouse — BLOCKING, throws on failure.
 *
 * Uses direct table read instead of saved queries to avoid Kinetic's
 * auto-quoting of string variables (which breaks dynamic table names in SQL).
 *
 * @param {string} env - 'PROD' or 'UAT'
 * @param {object} filters - { status?, date? }
 * @returns {Array} Nested request objects matching Prisma response shape
 */
export async function fetchRequests(env, { status, date } = {}) {
  const table = getSubmissionsTable(env);
  const whereParts = [];
  if (status) whereParts.push(`request_status = '${status}'`);
  if (date) whereParts.push(`dt = '${date}'`);

  const result = await Kinetic.readRowsStrict(table, {
    where: whereParts.length > 0 ? whereParts.join(' AND ') : undefined,
    order_by: 'submitted_at DESC',
    limit: 200,
  });
  const rows = result?.data?.rows || [];
  return groupRowsIntoRequests(rows);
}

/**
 * Fetch a single request by ID — BLOCKING, throws on failure.
 *
 * @param {string} requestId - Request UUID
 * @param {string} env - 'PROD' or 'UAT'
 * @returns {object|null} Nested request object or null if not found
 */
export async function fetchRequestById(requestId, env) {
  const table = getSubmissionsTable(env);
  const result = await Kinetic.readRowsStrict(table, {
    where: `request_id = '${requestId}'`,
    order_by: 'sort_order ASC',
  });
  const rows = result?.data?.rows || [];
  if (rows.length === 0) return null;
  const requests = groupRowsIntoRequests(rows);
  return requests[0] || null;
}

/**
 * Fetch activity log from ClickHouse — BLOCKING, throws on failure.
 *
 * @param {object} params
 * @param {number} params.page   - Page number (1-based)
 * @param {number} params.limit  - Items per page
 * @param {string} [params.action] - Filter by action
 * @param {string} [params.env]  - Filter by env
 * @returns {{ logs: Array, pagination: object }}
 */
export async function fetchActivityLog({ page = 1, limit = 50, action, env } = {}) {
  const table = getActivityTable(env);
  const whereParts = [];
  if (action) whereParts.push(`action = '${action}'`);

  const result = await Kinetic.readRowsStrict(table, {
    where: whereParts.length > 0 ? whereParts.join(' AND ') : undefined,
    order_by: 'created_at DESC',
    limit,
    offset: (page - 1) * limit,
  });
  const rows = result?.data?.rows || [];

  const logs = rows.map(row => ({
    id: row.id,
    action: row.action,
    user: {
      email: row.user_email || '',
      name: row.user_name || '',
    },
    userId: row.user_email || '', // email as userId for ClickHouse
    targetId: row.target_id || '',
    targetType: row.target_type || '',
    details: safeJsonParse(row.details, {}),
    env: row.env || 'PROD',
    createdAt: row.created_at || '',
  }));

  // For total count, we'd need a separate count query — approximate with rows.length
  // If we got exactly `limit` rows, there might be more
  const total = rows.length < limit ? (page - 1) * limit + rows.length : (page * limit) + 1;

  return {
    logs,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

// ══════════════════════════════════════════════════════════════
// FIRE-AND-FORGET — mirrors (never throw)
// ══════════════════════════════════════════════════════════════

/**
 * Sync widget submissions to Kinetic after Prisma transaction succeeds.
 * (Legacy fire-and-forget — kept for backward compat with deploy sync)
 *
 * @param {object} request - The request object (with requestWidgets)
 * @param {Array}  widgets - Original canvas widgets (pre-serialization)
 * @param {object} user    - { id, email, name }
 * @param {string} env     - 'PROD' or 'UAT'
 */
export async function syncSubmission(request, widgets, user, env) {
  if (!Kinetic.isAvailable()) return;

  const today = new Date().toISOString().split('T')[0];
  const table = getSubmissionsTable(env);

  const rows = widgets.map((w) => {
    const pnc = typeof w.pnc === 'string' ? w.pnc : JSON.stringify(w.pnc || {});
    const products = typeof w.products === 'string'
      ? JSON.parse(w.products)
      : (w.products || []);

    const snapshot = {};
    for (const [k, v] of Object.entries(w)) {
      if (typeof v === 'function') continue;
      if (typeof File !== 'undefined' && v instanceof File) continue;
      if (typeof Blob !== 'undefined' && v instanceof Blob) continue;
      snapshot[k] = v;
    }

    return {
      dt: today,
      widget_id: w.id || w._dbId || '',
      widget_type: w.type || 'unknown',
      slug: w.slug || w.slug_name || '',
      title: w.title || '',
      title_hi: w.titleHi || '',
      item_titles_hi: extractItemTitlesHi(w),
      status: request.status || 'PENDING',
      submitted_by: user.email || '',
      edited_by: '',
      edited_at: '',
      env: env || 'PROD',
      products_count: Array.isArray(products) ? products.length : 0,
      pnc,
      page_slug: derivePageSlug(w),
      hierarchy: deriveHierarchy(w),
      snapshot: JSON.stringify(snapshot),
      request_id: request.id || '',
    };
  });

  if (rows.length === 0) return;

  console.log(`[KineticSync] Syncing ${rows.length} widget(s) for request ${request.id}`);
  const result = await Kinetic.insertRows(table, rows);
  if (result) {
    console.log(`[KineticSync] ${rows.length} row(s) synced`);
  } else {
    console.warn('[KineticSync] Insert failed (non-blocking)');
  }
}

/**
 * Update status in Kinetic when a request is approved/rejected.
 * (Legacy fire-and-forget)
 */
export async function syncStatusChange(requestId, newStatus, user) {
  if (!Kinetic.isAvailable()) return;

  const set = { status: `'${newStatus}'` };
  if (user?.email) {
    set.edited_by = `'${user.email}'`;
    set.edited_at = `'${new Date().toISOString()}'`;
  }

  console.log(`[KineticSync] Updating status -> ${newStatus} for request ${requestId}`);
  const result = await Kinetic.updateRows(TABLE_PROD, {
    set,
    where: `request_id = '${requestId}'`,
  });
  if (result) {
    console.log(`[KineticSync] Status updated`);
  } else {
    console.warn('[KineticSync] Status update failed (non-blocking)');
  }
}

/**
 * Sync deploy results to Kinetic — updates with actual slugs and DEPLOYED status.
 */
export async function syncDeploy(widgetId, dt, slugs, user, env) {
  if (!Kinetic.isAvailable()) return;

  const table = getSubmissionsTable(env || 'PROD');
  const set = {
    status: "'DEPLOYED'",
    request_status: "'DEPLOYED'",
    hierarchy: `'${JSON.stringify(slugs).replace(/'/g, "\\'")}'`,
  };

  if (slugs.page) set.page_slug = `'${slugs.page}'`;
  if (user?.email) {
    set.edited_by = `'${user.email}'`;
    set.edited_at = `'${new Date().toISOString()}'`;
  }

  console.log(`[KineticSync] Syncing deploy for widget ${widgetId}`);
  const result = await Kinetic.updateRows(table, {
    set,
    where: `widget_id = '${widgetId}' AND dt = '${dt}'`,
  });
  if (result) {
    console.log(`[KineticSync] Deploy synced`);
  } else {
    console.warn('[KineticSync] Deploy sync failed (non-blocking)');
  }
}

// ── User Roles sync (fire-and-forget) ──

const ROLES_TABLE = 'user_roles';

export async function syncUserRoleAdd(user, env, addedBy) {
  if (!Kinetic.isAvailable()) return;

  const now = new Date().toISOString();
  const row = {
    email: user.email || '',
    name: user.name || '',
    role: user.role || 'CHECKER',
    env: env || 'PROD',
    added_at: now,
    added_by: addedBy?.email || '',
    is_active: 1,
    updated_at: now,
  };

  console.log(`[KineticSync] Syncing user role: ${row.email} -> ${row.role} (${row.env})`);
  const result = await Kinetic.insertRows(ROLES_TABLE, [row]);
  if (result) {
    console.log(`[KineticSync] User role synced`);
  } else {
    console.warn('[KineticSync] User role sync failed (non-blocking)');
  }
}

export async function syncUserRoleRemove(email, env) {
  if (!Kinetic.isAvailable()) return;

  console.log(`[KineticSync] Removing user role: ${email} (${env})`);
  const result = await Kinetic.updateRows(ROLES_TABLE, {
    set: {
      is_active: '0',
      updated_at: `'${new Date().toISOString()}'`,
    },
    where: `email = '${email}' AND env = '${env}'`,
  });
  if (result) {
    console.log(`[KineticSync] User role removed`);
  } else {
    console.warn('[KineticSync] User role remove failed (non-blocking)');
  }
}

// ── Locations sync (fire-and-forget) ──

const LOCATIONS_TABLE = 'locations';

export async function syncLocationUpsert(location) {
  if (!Kinetic.isAvailable()) return;

  const row = {
    key: location.key || '',
    env: location.env || 'PROD',
    level_tag: location.levelTag || '',
    level_property: location.levelProperty || '',
    slug_suffix: location.slugSuffix || '',
    label: location.label || '',
    type: location.type || '',
    is_default: location.isDefault ? 1 : 0,
    is_enabled: location.isEnabled ? 1 : 0,
    is_custom: location.isCustom ? 1 : 0,
    updated_at: new Date().toISOString(),
  };

  console.log(`[KineticSync] Syncing location: ${row.key} (${row.env})`);
  const result = await Kinetic.insertRows(LOCATIONS_TABLE, [row]);
  if (result) {
    console.log(`[KineticSync] Location synced: ${row.key}`);
  } else {
    console.warn('[KineticSync] Location sync failed (non-blocking)');
  }
}

export async function syncLocationDelete(key, env) {
  if (!Kinetic.isAvailable()) return;

  console.log(`[KineticSync] Deleting location: ${key} (${env})`);
  const result = await Kinetic.updateRows(LOCATIONS_TABLE, {
    set: {
      is_enabled: '0',
      updated_at: `'${new Date().toISOString()}'`,
    },
    where: `key = '${key}' AND env = '${env}'`,
  });
  if (result) {
    console.log(`[KineticSync] Location deleted: ${key}`);
  } else {
    console.warn('[KineticSync] Location delete failed (non-blocking)');
  }
}

export async function syncLocationsBulk(locations) {
  if (!Kinetic.isAvailable()) return;
  if (!locations || locations.length === 0) return;

  const now = new Date().toISOString();
  const rows = locations.map(loc => ({
    key: loc.key || '',
    env: loc.env || 'PROD',
    level_tag: loc.levelTag || '',
    level_property: loc.levelProperty || '',
    slug_suffix: loc.slugSuffix || '',
    label: loc.label || '',
    type: loc.type || '',
    is_default: loc.isDefault ? 1 : 0,
    is_enabled: loc.isEnabled ? 1 : 0,
    is_custom: loc.isCustom ? 1 : 0,
    updated_at: now,
  }));

  console.log(`[KineticSync] Bulk syncing ${rows.length} location(s)`);
  const result = await Kinetic.insertRows(LOCATIONS_TABLE, rows);
  if (result) {
    console.log(`[KineticSync] ${rows.length} location(s) synced`);
  } else {
    console.warn('[KineticSync] Bulk location sync failed (non-blocking)');
  }
}

// ── Read path (fire-and-forget — for history/analytics) ──

export async function fetchHistory(startDate, endDate, filters = {}) {
  if (!Kinetic.isAvailable()) return null;

  const variables = {
    start_date: startDate,
    end_date: endDate,
  };
  if (filters.status) variables.filter_status = filters.status;
  if (filters.env) variables.filter_env = filters.env;

  const result = await Kinetic.runQuery(QUERY_HISTORY, variables);
  return result?.data?.rows || null;
}

export async function fetchAnalytics(startDate, endDate, filters = {}) {
  if (!Kinetic.isAvailable()) return null;

  const variables = {
    start_date: startDate,
    end_date: endDate,
  };
  if (filters.env) variables.filter_env = filters.env;

  const result = await Kinetic.runQuery(QUERY_ANALYTICS, variables);
  return result?.data?.rows || null;
}

export async function searchWidgets(query) {
  if (!Kinetic.isAvailable()) return null;

  const result = await Kinetic.runQuery(QUERY_SEARCH, {
    search_query: query,
  });
  return result?.data?.rows || null;
}
