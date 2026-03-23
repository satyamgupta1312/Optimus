/**
 * KineticSyncService — Widget-specific sync logic for Kinetic.
 *
 * Transforms Optimus widget data into Kinetic table rows and
 * provides history/analytics fetch via saved queries.
 *
 * Sync points:
 *   1. syncSubmission()   — on submit (PENDING)
 *   2. syncStatusChange() — on approve/reject (APPROVED/REJECTED)
 *   3. syncDeploy()       — on deploy (DEPLOYED) with actual slugs + hierarchy
 *
 * All methods are safe to call fire-and-forget — they never throw.
 */
import * as Kinetic from './KineticService.js';

const TABLE = 'widget_submissions';
const QUERY_HISTORY = 'homepage/submissions-by-date';
const QUERY_ANALYTICS = 'homepage/analytics';
const QUERY_SEARCH = 'homepage/search-widgets';

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

// ── Write path ──

/**
 * Sync widget submissions to Kinetic after Prisma transaction succeeds.
 *
 * @param {object} request - The Prisma request object (with requestWidgets)
 * @param {Array}  widgets - Original canvas widgets (pre-serialization)
 * @param {object} user    - { id, email, name }
 * @param {string} env     - 'PROD' or 'STAGING'
 */
export async function syncSubmission(request, widgets, user, env) {
  if (!Kinetic.isAvailable()) return;
  if (env !== 'PROD') return;

  const today = new Date().toISOString().split('T')[0];

  const rows = widgets.map((w) => {
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
  const result = await Kinetic.insertRows(TABLE, rows);
  if (result) {
    console.log(`[KineticSync] ✓ ${rows.length} row(s) synced`);
  } else {
    console.warn('[KineticSync] Insert failed (non-blocking)');
  }
}

/**
 * Update status in Kinetic when a request is approved/rejected.
 *
 * @param {string} requestId - Request UUID
 * @param {string} newStatus - 'APPROVED' or 'REJECTED'
 * @param {object} [user]    - { email } of the approver/rejector
 */
export async function syncStatusChange(requestId, newStatus, user) {
  if (!Kinetic.isAvailable()) return;

  const set = { status: `'${newStatus}'` };
  if (user?.email) {
    set.edited_by = `'${user.email}'`;
    set.edited_at = `'${new Date().toISOString()}'`;
  }

  console.log(`[KineticSync] Updating status → ${newStatus} for request ${requestId}`);
  const result = await Kinetic.updateRows(TABLE, {
    set,
    where: `request_id = '${requestId}'`,
  });
  if (result) {
    console.log(`[KineticSync] ✓ Status updated`);
  } else {
    console.warn('[KineticSync] Status update failed (non-blocking)');
  }
}

/**
 * Sync deploy results to Kinetic — updates with actual slugs and DEPLOYED status.
 *
 * @param {string} widgetId  - Widget UUID (matches widget_id in Kinetic)
 * @param {string} dt        - Submission date (YYYY-MM-DD) for upsert key match
 * @param {object} slugs     - Actual slugs object from builder.deploy() result
 * @param {object} [user]    - { email } of the deployer
 */
export async function syncDeploy(widgetId, dt, slugs, user) {
  if (!Kinetic.isAvailable()) return;

  const set = {
    status: "'DEPLOYED'",
    hierarchy: `'${JSON.stringify(slugs).replace(/'/g, "\\'")}'`,
  };

  if (slugs.page) set.page_slug = `'${slugs.page}'`;
  if (user?.email) {
    set.edited_by = `'${user.email}'`;
    set.edited_at = `'${new Date().toISOString()}'`;
  }

  console.log(`[KineticSync] Syncing deploy for widget ${widgetId}`);
  const result = await Kinetic.updateRows(TABLE, {
    set,
    where: `widget_id = '${widgetId}' AND dt = '${dt}'`,
  });
  if (result) {
    console.log(`[KineticSync] ✓ Deploy synced`);
  } else {
    console.warn('[KineticSync] Deploy sync failed (non-blocking)');
  }
}

// ── User Roles sync ──

const ROLES_TABLE = 'user_roles';

/**
 * Sync a checker/admin addition to Kinetic.
 *
 * @param {object} user    - { email, name, role }
 * @param {string} env     - 'PROD' or 'STAGING'
 * @param {object} [addedBy] - { email } of who added this user
 */
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

  console.log(`[KineticSync] Syncing user role: ${row.email} → ${row.role} (${row.env})`);
  const result = await Kinetic.insertRows(ROLES_TABLE, [row]);
  if (result) {
    console.log(`[KineticSync] ✓ User role synced`);
  } else {
    console.warn('[KineticSync] User role sync failed (non-blocking)');
  }
}

/**
 * Sync a checker removal to Kinetic (soft-delete: is_active = 0).
 *
 * @param {string} email   - User email
 * @param {string} env     - 'PROD' or 'STAGING'
 */
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
    console.log(`[KineticSync] ✓ User role removed`);
  } else {
    console.warn('[KineticSync] User role remove failed (non-blocking)');
  }
}

// ── Locations sync ──

const LOCATIONS_TABLE = 'locations';

/**
 * Sync a location (create or update) to Kinetic.
 * Fire-and-forget — never throws.
 *
 * @param {object} location - Prisma Location object
 */
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
    console.log(`[KineticSync] ✓ Location synced: ${row.key}`);
  } else {
    console.warn('[KineticSync] Location sync failed (non-blocking)');
  }
}

/**
 * Sync location deletion to Kinetic (soft-delete: is_enabled = 0).
 * Fire-and-forget — never throws.
 *
 * @param {string} key - Location key
 * @param {string} env - Environment
 */
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
    console.log(`[KineticSync] ✓ Location deleted: ${key}`);
  } else {
    console.warn('[KineticSync] Location delete failed (non-blocking)');
  }
}

/**
 * Bulk sync all locations to Kinetic (for initial migration).
 * Fire-and-forget — never throws.
 *
 * @param {Array} locations - Array of Prisma Location objects
 */
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
    console.log(`[KineticSync] ✓ ${rows.length} location(s) synced`);
  } else {
    console.warn('[KineticSync] Bulk location sync failed (non-blocking)');
  }
}

// ── Read path ──

/**
 * Fetch widget submission history from Kinetic.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate   - YYYY-MM-DD
 * @param {object} filters   - { status?, env? }
 * @returns {Array|null} rows or null on failure
 */
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

/**
 * Fetch aggregated analytics from Kinetic.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate   - YYYY-MM-DD
 * @param {object} filters   - { env? }
 * @returns {Array|null} rows or null on failure
 */
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

/**
 * Search widgets by slug or title from Kinetic (ClickHouse).
 *
 * @param {string} query - Search term
 * @returns {Array|null} rows or null on failure
 */
export async function searchWidgets(query) {
  if (!Kinetic.isAvailable()) return null;

  const result = await Kinetic.runQuery(QUERY_SEARCH, {
    search_query: query,
  });
  return result?.data?.rows || null;
}
