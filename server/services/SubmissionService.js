/**
 * SubmissionService — Submissions via Supabase.
 *
 * Single table: submissions (SERIAL id, history JSONB for audit trail)
 * No separate activity_log table.
 *
 * Operations:
 *   1. createSubmission()    — on submit (PENDING)
 *   2. updateRequestStatus() — on approve/reject/reopen (appends to history)
 *   3. appendHistory()       — add any action to history
 *   4. syncDeploy()          — on deploy (DEPLOYED) with mirror IDs
 *   5. fetchRequests()       — list requests
 *   6. fetchRequestById()    — get single request
 */
import { getClient } from './SupabaseService.js';
import { deriveSmappSlug, stripSlugSuffix } from './WidgetDataService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

let METABASE_URL = '', METABASE_API_KEY = '';
try {
  if (fs.existsSync(ENV_PATH)) {
    const envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    for (const line of envContent.split('\n')) {
      let m = line.match(/^METABASE_URL=(.+)$/);
      if (m) METABASE_URL = m[1].trim();
      m = line.match(/^METABASE_API_KEY=(.+)$/);
      if (m) METABASE_API_KEY = m[1].trim();
    }
  }
} catch { /* ignore */ }

/**
 * Lookup widget_id by slug.
 * 1. Check canvas_widgets first (already synced)
 * 2. Fallback to SMApp backend via Metabase (smapp_widgets table)
 */
async function lookupWidgetIdBySlug(slug) {
  if (!slug) return null;

  // 1. Check our own DB first
  try {
    const sb = getClient();
    const { data } = await sb
      .from('canvas_widgets')
      .select('widget_id')
      .eq('slug', slug)
      .eq('is_deleted', false)
      .limit(1)
      .single();
    if (data?.widget_id) return data.widget_id;
  } catch { /* not found locally */ }

  // 2. Fallback: lookup from SMApp via Metabase
  try {
    const { lookupSmappWidgetId } = await import('./WidgetDataService.js');
    return await lookupSmappWidgetId(slug);
  } catch {
    return null;
  }
}

/**
 * Get next request_id from PostgreSQL sequence.
 */
async function nextRequestId() {
  const sb = getClient();
  const { data, error } = await sb.rpc('nextval_request_id');
  if (error) {
    // Fallback: use max(request_id) + 1
    const { data: rows } = await sb.from('submissions').select('request_id').order('request_id', { ascending: false }).limit(1);
    return ((rows?.[0]?.request_id) || 0) + 1;
  }
  return data;
}

// ── Helpers ──

function extractItemTitlesHi(w) {
  const titles = [];
  for (const list of [w.carouselItems, w.scrollItems]) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
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
  return titles;
}

function deriveHierarchy(w) {
  const base = w.slug || w.slug_name || '';
  if (!base) return {};

  const pnc = typeof w.pnc === 'object' ? w.pnc : {};
  const isOptimized = pnc.is_optimized;
  const pageType = w.pageType || 'product_listing_page';
  const type = (w.type || '').toLowerCase();

  // SPR / DPR
  if (type.includes('product_row') || type.includes('product_rail')) {
    const widgetSuffix = isOptimized ? '_spr_opt' : '_spr';
    const pageSuffix = pageType === 'category_page' ? '_Cat_page' : '_page_p';
    const states = Object.keys(w.stateProducts || {});
    return {
      page_layout: { slug: `${base}${pageSuffix}`, id: null, type: pageType },
      widgets: [
        {
          slug: `${base}_plp_w`, id: null, type: 'product_listing',
          items: states.map(s => ({
            slug: `${base}_sc_wi_${s}`, id: null, type: 'sub_category', level: s,
          })),
        },
        {
          slug: `${base}${widgetSuffix}`, id: null, type: 'single_product_row_v2',
          items: states.map(s => ({
            slug: `${base}_pr_wi_${s}`, id: null, type: 'item_rows', level: s,
          })),
        },
      ],
    };
  }

  // Carousel / Collection Banner
  if (type.includes('carousel') || type.includes('collection') || type.includes('scroll')) {
    const items = w.scrollItems || w.carouselItems || [];
    return {
      page_layout: { slug: `${base}_page_p`, id: null, type: 'product_listing_page' },
      widgets: [{
        slug: `${base}_crausel_w`, id: null, type: 'carousel',
        items: items.map((item, i) => ({
          slug: `${base}_item_${i + 1}_cl_wi`, id: null,
          type: 'sub_category', name: item.name || item.title || '',
          plp_page: { slug: `${base}_item_${i + 1}_plp_page`, id: null },
          plp_widget: { slug: `${base}_item_${i + 1}_plp`, id: null },
        })),
      }],
    };
  }

  // Secondary Masthead
  if (type.includes('masthead') && type.includes('secondary')) {
    const items = w.carouselItems || [];
    return {
      widgets: [{
        slug: base, id: null, type: 'secondary_masthead',
        items: items.map((item, i) => ({
          slug: `${base}_item_${i + 1}_carousel`, id: null,
          type: 'carousel_item', name: item.name || '',
        })),
      }],
    };
  }

  return { page_layout: { slug: base, id: null } };
}

// ══════════════════════════════════════════════════════════════
// SUBMISSIONS
// ══════════════════════════════════════════════════════════════

export async function createSubmission(requestIdOverride, widgets, user, env, headerWidgets = {}) {
  const sb = getClient();
  const now = new Date().toISOString();
  const requestId = requestIdOverride || await nextRequestId();

  // Lookup widget_ids from canvas_widgets by slug
  const slugs = widgets.map(w => w.slug || w.slug_name || '');
  const widgetIds = await Promise.all(slugs.map(s => lookupWidgetIdBySlug(s)));

  const rows = widgets.map((w, i) => {
    let products = w.products || [];
    if (typeof products === 'string') {
      try { products = JSON.parse(products); } catch { products = []; }
    }
    if (!Array.isArray(products)) products = [];

    // Derive full slug with suffix (same as mirror) — prevents double suffix
    const wPnc = typeof w.pnc === 'object' ? w.pnc : {};
    const fullSlug = deriveSmappSlug(w.slug || w.slug_name || '', w.type, wPnc)
      || w.slug || w.slug_name || '';

    return {
      request_id: requestId,
      widget_id: w.id || widgetIds[i] || null,
      widget_type: w.type || 'unknown',
      slug: fullSlug,
      title: w.title || '',
      title_hi: w.titleHi || '',
      item_titles_hi: extractItemTitlesHi(w),
      request_status: 'PENDING',
      env: env || 'PROD',
      products_count: products.length,
      pnc: typeof w.pnc === 'object' ? w.pnc : {},
      config: typeof w.config === 'object' ? w.config : {},
      hierarchy: deriveHierarchy(w),
      rejection_reason: '',
      header_widgets: headerWidgets || {},
      request_type: 'Homepage Update',
      sort_order: i,
      result: '',
      error_msg: '',
      history: [{ action: 'submit', by: user.email || '', at: now }],
    };
  });

  if (rows.length === 0) {
    if (Object.keys(headerWidgets || {}).length > 0) {
      rows.push({
        request_id: requestId,
        widget_id: null,
        widget_type: 'header',
        slug: '',
        title: 'Header Widgets Only',
        title_hi: '',
        item_titles_hi: [],
        request_status: 'PENDING',
        env: env || 'PROD',
        products_count: 0,
        pnc: {},
        config: {},
        hierarchy: {},
        rejection_reason: '',
        header_widgets: headerWidgets,
        request_type: 'Homepage Update',
        sort_order: 0,
        result: '',
        error_msg: '',
        history: [{ action: 'submit', by: user.email || '', at: now }],
      });
    } else {
      throw new Error('No widgets to submit');
    }
  }

  console.log(`[Submission] Creating: ${rows.length} widget(s) for request ${requestId}`);
  const { data: inserted, error } = await sb.from('submissions').insert(rows).select('id, widget_id, slug, env, widget_type, title, pnc, config, hierarchy');
  if (error) throw new Error(`Supabase: ${error.message}`);

  // Also create matching widget_versions
  // Need to generate IDs since column is not auto-increment
  if ((inserted || []).some(r => r.widget_id)) {
    try {
      const { data: maxRow } = await sb.from('widget_versions').select('id').order('id', { ascending: false }).limit(1).single();
      let nextId = (maxRow?.id || 0) + 1;

      const versionRows = (inserted || []).filter(r => r.widget_id).map(r => ({
        id: nextId++,
        widget_id: r.widget_id,
        widget_slug: r.slug,
        env: r.env,
        version: 1,
        snapshot: { type: r.widget_type, slug: r.slug, title: r.title, pnc: r.pnc, hierarchy: r.hierarchy },
        changed_by: user.email || '',
        change_log: `From submission #${requestId}`,
      }));

      const { error: vErr } = await sb.from('widget_versions').insert(versionRows);
      if (vErr) console.warn('[Submission] widget_versions sync failed (non-fatal):', vErr.message);
    } catch (e) {
      console.warn('[Submission] widget_versions sync failed (non-fatal):', e.message);
    }
  }

  return requestId;
}

/**
 * Append an action to the history JSONB array for all rows in a request.
 */
export async function appendHistory(requestId, action, user, extra = {}) {
  const sb = getClient();
  const entry = { action, by: user?.email || '', at: new Date().toISOString(), ...extra };

  // Read current history, append, write back
  const { data: rows, error: readErr } = await sb
    .from('submissions')
    .select('id, history')
    .eq('request_id', requestId);

  if (readErr) throw new Error(`Supabase: ${readErr.message}`);

  for (const row of (rows || [])) {
    const history = [...(row.history || []), entry];
    const { error } = await sb.from('submissions').update({ history }).eq('id', row.id);
    if (error) throw new Error(`Supabase: ${error.message}`);
  }
}

/**
 * Atomic status update — uses expectedStatus as a WHERE condition
 * so concurrent requests can't both succeed (DB-level CAS).
 */
export async function updateRequestStatus(requestId, newStatus, user, env, opts = {}) {
  const sb = getClient();
  const updates = { request_status: newStatus };

  if (opts.rejectionReason !== undefined) {
    updates.rejection_reason = opts.rejectionReason || '';
  }

  let query = sb
    .from('submissions')
    .update(updates)
    .eq('request_id', requestId);

  // Atomic guard: only update if current status matches expected
  if (opts.expectedStatus) {
    query = query.eq('request_status', opts.expectedStatus);
  }

  console.log(`[Submission] Status -> ${newStatus} for request ${requestId}`);
  const { data, error, count } = await query.select('id');

  if (error) throw new Error(`Supabase: ${error.message}`);

  // If expectedStatus was set and no rows matched, someone else already changed it
  if (opts.expectedStatus && (!data || data.length === 0)) {
    const err = new Error(`Request ${requestId} is no longer in ${opts.expectedStatus} status (concurrent update)`);
    err.status = 409;
    throw err;
  }

  // Append to history
  const ACTION_MAP = { APPROVED: 'approve', REJECTED: 'reject', DEPLOYED: 'deploy', PENDING: 'reopen', DRAFT: 'reopen' };
  const actionName = ACTION_MAP[newStatus] || newStatus.toLowerCase();
  const extra = {};
  if (opts.rejectionReason) extra.reason = opts.rejectionReason;
  await appendHistory(requestId, actionName, user, extra);
}

/**
 * Log activity — appends to history array. No separate table.
 */
export async function logActivity({ action, user, targetId, targetType, details, env }) {
  if (targetType === 'widget' || targetType === 'headerWidgets') {
    console.log(`[Activity] ${action} ${targetType}:${targetId} by ${user?.email}`);
    return;
  }
  await appendHistory(targetId, action, user, details || {});
}

export async function logActivitySafe(params) {
  try {
    await logActivity(params);
  } catch (err) {
    console.warn('[Submission] History append failed (non-blocking):', err.message);
  }
}

// ── Read path ──

function groupRowsIntoRequests(rows) {
  const map = new Map();

  for (const row of rows) {
    const rid = row.request_id;
    if (!map.has(rid)) {
      // Get submitter from first history entry
      const firstAction = (row.history || [])[0] || {};
      map.set(rid, {
        id: rid,
        status: row.request_status || 'PENDING',
        type: row.request_type || 'Homepage Update',
        env: row.env || 'PROD',
        submittedBy: firstAction.by || '',
        submitter: {
          email: firstAction.by || '',
          name: firstAction.by ? firstAction.by.split('@')[0] : '',
        },
        rejectionReason: row.rejection_reason || '',
        headerWidgets: row.header_widgets || {},
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        history: row.history || [],
        requestWidgets: [],
      });
    }

    const req = map.get(rid);
    if (!row.widget_id && row.widget_type === 'header') continue;

    req.requestWidgets.push({
      id: row.id,
      requestId: rid,
      widgetId: row.widget_id || '',
      sortOrder: row.sort_order ?? 0,
      result: row.result || '',
      error: row.error_msg || '',
      widget: {
        id: row.widget_id || '',
        type: row.widget_type || '',
        slug: row.slug || '',
        title: row.title || '',
        titleHi: row.title_hi || '',
      },
      hierarchy: row.hierarchy || {},
      pnc: row.pnc || {},
      config: row.config || {},
    });
  }

  for (const req of map.values()) {
    req.requestWidgets.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return Array.from(map.values());
}

export async function fetchRequests(env, { status, date } = {}) {
  const sb = getClient();
  let query = sb
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (env) query = query.eq('env', env);
  if (status) query = query.eq('request_status', status);
  if (date) query = query.gte('created_at', `${date}T00:00:00`).lt('created_at', `${date}T23:59:59`);

  const { data, error } = await query;
  if (error) throw new Error(`Supabase: ${error.message}`);
  return groupRowsIntoRequests(data || []);
}

export async function fetchRequestById(requestId, env) {
  const sb = getClient();
  const { data, error } = await sb
    .from('submissions')
    .select('*')
    .eq('request_id', requestId)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!data || data.length === 0) return null;
  const requests = groupRowsIntoRequests(data);
  return requests[0] || null;
}

// ── Deploy sync ──

export async function syncDeploy(widgetId, hierarchyWithIds, user, env, requestId) {
  if (!requestId) throw new Error('requestId is required for deploy sync');

  const sb = getClient();

  // After deploy, lookup mirror ID by slug and update widget_id
  const { data: subRow } = await sb.from('submissions')
    .select('slug')
    .eq('request_id', requestId)
    .limit(1)
    .single();

  let mirrorWidgetId = null;
  if (subRow?.slug) {
    const { lookupSmappWidgetId } = await import('./WidgetDataService.js');
    mirrorWidgetId = await lookupSmappWidgetId(subRow.slug);
    if (mirrorWidgetId) {
      console.log(`[Submission] Mirror ID found: ${mirrorWidgetId} for slug ${subRow.slug}`);
    }
  }

  const updates = {
    request_status: 'DEPLOYED',
    hierarchy: hierarchyWithIds,
  };
  if (mirrorWidgetId) updates.widget_id = String(mirrorWidgetId);

  // Update by request_id (widget_id might be UUID or mirror ID)
  const { data, error } = await sb
    .from('submissions')
    .update(updates)
    .eq('request_id', requestId)
    .select('id');

  if (error) throw new Error(`Supabase deploy sync failed: ${error.message}`);

  const affected = data?.length || 0;
  console.log(`[Submission] Deploy sync: ${affected} rows updated`);

  // Also update canvas_widgets and widget_versions with mirror ID
  if (mirrorWidgetId && subRow?.slug) {
    await sb.from('canvas_widgets').update({ widget_id: String(mirrorWidgetId) }).eq('slug', subRow.slug);
    for (const row of (data || [])) {
      await sb.from('widget_versions').update({ widget_id: String(mirrorWidgetId) }).eq('id', row.id);
    }
    console.log(`[Submission] Updated widget_id to ${mirrorWidgetId} across all tables`);
  }

  await appendHistory(requestId, 'deploy', user);
}
