/**
 * WidgetDataService — All Supabase (PostgreSQL) data access.
 *
 * Data layer for:
 * - Auth (user_roles table, cached)
 * - Widgets + Headers (canvas_widgets table)
 * - Versions (widget_versions table)
 * - Checkers (user_roles table)
 * - Locations (locations table)
 * - Products (Metabase API)
 */
import { getClient } from './SupabaseService.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

// ── Metabase config ──
let METABASE_URL = process.env.METABASE_URL || '';
let METABASE_API_KEY = process.env.METABASE_API_KEY || '';
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

if (METABASE_API_KEY) {
  console.log(`[WidgetDataService] Metabase configured → ${METABASE_URL} ✓`);
}

// ── Constants ──
const SUPER_ADMIN_IDENTIFIERS = ['satyam.gupta@apnamart.in', 'satyam'];
const HARDCODED_CHECKERS = { 'manoj.kumar': 'Manoj Kumar' };

// ── Auth cache ──
const userCache = new Map();
const USER_CACHE_TTL = 60_000;

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

export async function resolveUser(email, env) {
  const lowerEmail = email.toLowerCase();

  if (SUPER_ADMIN_IDENTIFIERS.includes(lowerEmail)) {
    return { email: lowerEmail, name: lowerEmail.split('@')[0], role: 'SUPER_ADMIN' };
  }

  if (HARDCODED_CHECKERS[lowerEmail]) {
    return { email: lowerEmail, name: HARDCODED_CHECKERS[lowerEmail], role: 'CHECKER' };
  }

  const cacheKey = `${lowerEmail}:${env}`;
  const cached = userCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < USER_CACHE_TTL) {
    return cached.user;
  }

  let role = 'MAKER';
  let name = lowerEmail.split('@')[0];
  try {
    const sb = getClient();
    const { data } = await sb
      .from('user_roles')
      .select('role, name')
      .eq('email', lowerEmail)
      .eq('env', env)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (data?.role === 'CHECKER') {
      role = 'CHECKER';
      name = data.name || name;
    }
  } catch {
    // Graceful degradation
  }

  const user = { email: lowerEmail, name, role };
  userCache.set(cacheKey, { user, ts: Date.now() });
  return user;
}

export function bustUserCache(email) {
  const lowerEmail = email.toLowerCase();
  for (const key of userCache.keys()) {
    if (key.startsWith(`${lowerEmail}:`)) userCache.delete(key);
  }
}

// ══════════════════════════════════════════════════════════════
// WIDGETS (canvas_widgets table)
// ══════════════════════════════════════════════════════════════

function parseWidget(row) {
  if (!row) return null;
  return {
    id: row.id,
    widgetId: row.widget_id,
    type: row.type || '',
    slug: row.slug || '',
    env: row.env || 'PROD',
    title: row.title || '',
    titleHi: row.title_hi || '',
    status: row.status || 'DRAFT',
    sortOrder: row.sort_order ?? 0,
    pnc: row.pnc || {},
    config: row.config || {},
    products: row.products || [],
    createdBy: row.author || '',
    creator: { email: row.author || '', name: (row.author || '').split('@')[0] },
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export async function listWidgets(env, { status, type, slug, date } = {}) {
  const sb = getClient();
  let query = sb
    .from('canvas_widgets')
    .select('*')
    .eq('is_deleted', false)
    .eq('env', env)
    .not('type', 'in', '("primaryMasthead","secondaryMasthead")')
    .order('sort_order', { ascending: true })
    .limit(500);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);
  if (slug) query = query.eq('slug', slug);
  if (date) {
    query = query.gte('created_at', `${date}T00:00:00`).lt('created_at', `${date}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data || []).map(parseWidget);
}

export async function getWidgetById(id, env) {
  const sb = getClient();
  let query = sb
    .from('canvas_widgets')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false);

  if (env) query = query.eq('env', env);

  const { data, error } = await query.limit(1).single();
  if (error && error.code !== 'PGRST116') throw new Error(`Supabase: ${error.message}`);
  return parseWidget(data);
}

export async function createWidget(data) {
  const sb = getClient();
  const id = data.id || crypto.randomUUID();

  const row = {
    id,
    widget_id: id,
    type: data.type || 'unknown',
    slug: data.slug || '',
    env: data.env || 'PROD',
    title: data.title || '',
    title_hi: data.titleHi || '',
    status: data.status || 'DRAFT',
    sort_order: data.sortOrder ?? 0,
    pnc: typeof data.pnc === 'string' ? JSON.parse(data.pnc) : (data.pnc || {}),
    config: typeof data.config === 'string' ? JSON.parse(data.config) : (data.config || {}),
    products: typeof data.products === 'string' ? JSON.parse(data.products) : (data.products || []),
    author: data.createdBy || '',
    is_deleted: false,
  };

  const { data: inserted, error } = await sb
    .from('canvas_widgets')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Supabase: ${error.message}`);
  return parseWidget(inserted);
}

export async function updateWidget(id, data, env) {
  const sb = getClient();
  const updates = {};

  if (data.type !== undefined) updates.type = data.type;
  if (data.slug !== undefined) updates.slug = data.slug;
  if (data.title !== undefined) updates.title = data.title;
  if (data.titleHi !== undefined) updates.title_hi = data.titleHi;
  if (data.status !== undefined) updates.status = data.status;
  if (data.sortOrder !== undefined) updates.sort_order = data.sortOrder;
  if (data.pnc !== undefined) updates.pnc = typeof data.pnc === 'string' ? JSON.parse(data.pnc) : data.pnc;
  if (data.config !== undefined) updates.config = typeof data.config === 'string' ? JSON.parse(data.config) : data.config;
  if (data.products !== undefined) updates.products = typeof data.products === 'string' ? JSON.parse(data.products) : data.products;

  let query = sb
    .from('canvas_widgets')
    .update(updates)
    .eq('id', id)
    .eq('is_deleted', false);

  if (env) query = query.eq('env', env);

  const { data: updated, error } = await query.select().single();

  if (error && error.code !== 'PGRST116') throw new Error(`Supabase: ${error.message}`);
  return parseWidget(updated);
}

export async function deleteWidget(id, env) {
  const sb = getClient();
  let query = sb
    .from('canvas_widgets')
    .update({ is_deleted: true })
    .eq('id', id);

  if (env) query = query.eq('env', env);

  const { error } = await query;
  if (error) throw new Error(`Supabase: ${error.message}`);
}

export async function reorderWidgets(order) {
  const sb = getClient();
  for (const { id, sortOrder } of order) {
    const { error } = await sb
      .from('canvas_widgets')
      .update({ sort_order: sortOrder })
      .eq('id', id)
      .eq('is_deleted', false);

    if (error) throw new Error(`Supabase: ${error.message}`);
  }
}

export async function duplicateWidget(sourceId, user, env) {
  const source = await getWidgetById(sourceId);
  if (!source) return null;

  const suffix = `_copy_${Date.now().toString(36)}`;
  return createWidget({
    type: source.type,
    slug: source.slug + suffix,
    env: source.env,
    title: source.title + ' (Copy)',
    titleHi: source.titleHi,
    status: 'DRAFT',
    sortOrder: source.sortOrder + 1,
    pnc: source.pnc,
    config: source.config,
    products: source.products,
    createdBy: user.email,
  });
}

export async function updateWidgetStatuses(widgetIds, status) {
  if (!widgetIds || widgetIds.length === 0) return;
  const sb = getClient();

  const { error } = await sb
    .from('canvas_widgets')
    .update({ status })
    .in('widget_id', widgetIds)
    .eq('is_deleted', false);

  if (error) throw new Error(`Supabase: ${error.message}`);
}

export async function findWidgetsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const sb = getClient();

  const { data, error } = await sb
    .from('canvas_widgets')
    .select('*')
    .in('id', ids)
    .eq('is_deleted', false);

  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data || []).map(parseWidget);
}

// ══════════════════════════════════════════════════════════════
// HEADER WIDGETS (canvas_widgets — global, not per-env)
// ══════════════════════════════════════════════════════════════

export async function getHeaderWidgets() {
  const sb = getClient();
  const { data, error } = await sb
    .from('canvas_widgets')
    .select('type, config')
    .in('type', ['primaryMasthead', 'secondaryMasthead'])
    .eq('is_deleted', false);

  if (error) throw new Error(`Supabase: ${error.message}`);

  const headers = { primaryMasthead: null, secondaryMasthead: null };
  for (const row of (data || [])) {
    headers[row.type] = row.config || null;
  }
  return headers;
}

export async function upsertHeaderWidget(type, config, email) {
  const sb = getClient();
  const { error } = await sb
    .from('canvas_widgets')
    .upsert({
      widget_id: type,
      type,
      slug: '',
      env: 'PROD',
      title: type,
      title_hi: '',
      status: 'APPROVED',
      sort_order: 0,
      pnc: {},
      config,
      products: [],
      author: email || '',
      is_deleted: false,
    }, { onConflict: 'widget_id' });

  if (error) throw new Error(`Supabase: ${error.message}`);
}

// ══════════════════════════════════════════════════════════════
// VERSIONS (widget_versions table)
// ══════════════════════════════════════════════════════════════

function parseVersion(row) {
  if (!row) return null;
  return {
    id: row.id,
    widgetId: row.widget_id,
    widgetSlug: row.widget_slug || '',
    env: row.env || 'PROD',
    version: row.version ?? 0,
    snapshot: row.snapshot || {},
    changedBy: row.changed_by || '',
    changeLog: row.change_log || '',
    createdAt: row.created_at || '',
  };
}

export async function listVersions(widgetId, { limit = 20, cursor } = {}) {
  const sb = getClient();
  let query = sb
    .from('widget_versions')
    .select('*')
    .eq('widget_id', widgetId)
    .order('version', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('version', parseInt(cursor));

  const { data, error } = await query;
  if (error) throw new Error(`Supabase: ${error.message}`);

  const versions = (data || []).map(parseVersion);
  const hasMore = versions.length === limit;
  const nextCursor = hasMore ? versions[versions.length - 1].version : null;

  return { versions, hasMore, nextCursor };
}

export async function createVersion(data) {
  const sb = getClient();
  const row = {
    widget_id: data.widgetId,
    widget_slug: data.widgetSlug || '',
    env: data.env || 'PROD',
    version: data.version,
    snapshot: typeof data.snapshot === 'string' ? JSON.parse(data.snapshot) : (data.snapshot || {}),
    changed_by: data.changedBy || '',
    change_log: data.changeLog || '',
  };

  // If id is provided (e.g., from submission), use it directly
  if (data.id !== undefined) row.id = data.id;
  else {
    // Otherwise generate next id (max+1)
    const { data: maxRow } = await sb.from('widget_versions').select('id').order('id', { ascending: false }).limit(1).single();
    row.id = (maxRow?.id || 0) + 1;
  }

  const { data: inserted, error } = await sb
    .from('widget_versions')
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Supabase: ${error.message}`);
  return parseVersion(inserted);
}

export async function getLatestVersion(widgetId) {
  const sb = getClient();
  const { data, error } = await sb
    .from('widget_versions')
    .select('*')
    .eq('widget_id', widgetId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`Supabase: ${error.message}`);
  return parseVersion(data);
}

// ══════════════════════════════════════════════════════════════
// CHECKERS (user_roles table — SERIAL id)
// ══════════════════════════════════════════════════════════════

export async function listCheckers(env) {
  const sb = getClient();
  const { data, error } = await sb
    .from('user_roles')
    .select('id, email, name, role, added_at')
    .eq('env', env)
    .eq('is_active', true)
    .order('role').order('email');

  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data || []).map(row => ({
    id: row.id,
    email: row.email,
    name: row.name || row.email.split('@')[0],
    role: row.role || 'CHECKER',
    addedAt: row.added_at || null,
  }));
}

export async function addChecker(email, name, env, addedBy) {
  const sb = getClient();
  const lowerEmail = email.toLowerCase();

  const { data, error } = await sb
    .from('user_roles')
    .upsert({
      email: lowerEmail,
      name: name || lowerEmail.split('@')[0],
      role: 'CHECKER',
      env,
      added_by: addedBy || '',
      is_active: true,
    }, { onConflict: 'email,env' })
    .select()
    .single();

  if (error) throw new Error(`Supabase: ${error.message}`);
  bustUserCache(lowerEmail);
  return { id: data.id, email: lowerEmail, name: name || lowerEmail.split('@')[0], role: 'CHECKER' };
}

export async function removeChecker(email, env) {
  const sb = getClient();
  const lowerEmail = email.toLowerCase();

  const { error } = await sb
    .from('user_roles')
    .update({ is_active: false })
    .eq('email', lowerEmail)
    .eq('env', env);

  if (error) throw new Error(`Supabase: ${error.message}`);
  bustUserCache(lowerEmail);
}

export async function isCheckerAnywhere(email) {
  const sb = getClient();
  const lowerEmail = email.toLowerCase();

  const { data } = await sb
    .from('user_roles')
    .select('id')
    .eq('email', lowerEmail)
    .eq('is_active', true)
    .limit(1);

  return (data || []).length > 0;
}

// ══════════════════════════════════════════════════════════════
// LOCATIONS
// ══════════════════════════════════════════════════════════════

function parseLocation(row) {
  if (!row) return null;
  return {
    key: row.key,
    env: row.env || 'PROD',
    levelTag: row.level_tag || '',
    levelProperty: row.level_property || '',
    slugSuffix: row.slug_suffix || '',
    label: row.label || '',
    type: row.type || '',
    isDefault: !!row.is_default,
    isEnabled: !!row.is_enabled,
    isCustom: !!row.is_custom,
    updatedAt: row.updated_at || '',
  };
}

export async function listLocations(env, enabledOnly = false) {
  const sb = getClient();
  let query = sb
    .from('locations')
    .select('*')
    .eq('env', env)
    .order('is_default', { ascending: false })
    .order('type').order('label');

  if (enabledOnly) query = query.eq('is_enabled', true);

  const { data, error } = await query;
  if (error) throw new Error(`Supabase: ${error.message}`);
  return (data || []).map(parseLocation);
}

export async function getLocation(key, env) {
  const sb = getClient();
  const { data, error } = await sb
    .from('locations')
    .select('*')
    .eq('key', key)
    .eq('env', env)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(`Supabase: ${error.message}`);
  return parseLocation(data);
}

export async function createLocation(data) {
  const existing = await getLocation(data.key, data.env || 'PROD');
  if (existing) {
    throw Object.assign(new Error(`Location with key "${data.key}" already exists`), { status: 409 });
  }

  const sb = getClient();
  const { data: inserted, error } = await sb
    .from('locations')
    .insert({
      key: data.key,
      env: data.env || 'PROD',
      level_tag: data.levelTag || '',
      level_property: data.levelProperty || '',
      slug_suffix: data.slugSuffix || '',
      label: data.label || '',
      type: data.type || '',
      is_default: false,
      is_enabled: true,
      is_custom: true,
    })
    .select()
    .single();

  if (error) throw new Error(`Supabase: ${error.message}`);
  return parseLocation(inserted);
}

export async function toggleLocation(key, env) {
  const sb = getClient();
  const current = await getLocation(key, env);
  if (!current) return null;

  if (current.isDefault) {
    throw Object.assign(new Error('Cannot toggle default locations'), { status: 403 });
  }

  const newEnabled = !current.isEnabled;
  const { data, error } = await sb
    .from('locations')
    .update({ is_enabled: newEnabled })
    .eq('key', key)
    .eq('env', env)
    .select()
    .single();

  if (error) throw new Error(`Supabase: ${error.message}`);
  return parseLocation(data);
}

export async function deleteLocation(key, env) {
  const current = await getLocation(key, env);
  if (!current) return null;

  if (!current.isCustom) {
    throw Object.assign(new Error('Only custom locations can be deleted'), { status: 403 });
  }

  const sb = getClient();
  const { error } = await sb
    .from('locations')
    .update({ is_enabled: false })
    .eq('key', key)
    .eq('env', env);

  if (error) throw new Error(`Supabase: ${error.message}`);
  return true;
}

// ══════════════════════════════════════════════════════════════
// PRODUCTS (Metabase Structured Query)
// ══════════════════════════════════════════════════════════════

const IMAGE_BASE = 'https://gs.apnamart.in/';

const METABASE_FIELDS = [
  ['field', 2171, { 'base-type': 'type/BigInteger' }],
  ['field', 2157, { 'base-type': 'type/Integer' }],
  ['field', 2144, { 'base-type': 'type/Text' }],
  ['field', 2149, { 'base-type': 'type/Text' }],
  ['field', 2156, { 'base-type': 'type/Text' }],
  ['field', 2146, { 'base-type': 'type/Float' }],
  ['field', 2188, { 'base-type': 'type/Float' }],
];

function mapProductRow(r) {
  const mainImage = r[4] || '';
  return {
    id: r[0],
    itemCode: String(r[1] ?? ''),
    name: r[2] || '',
    brand: r[3] || '',
    image: mainImage ? `${IMAGE_BASE}${mainImage.replace(/^\//, '')}` : '',
    mrp: r[5] || 0,
    price: r[6] || 0,
  };
}

async function metabaseQuery(query) {
  if (!METABASE_API_KEY) return [];
  const res = await fetch(`${METABASE_URL}/api/dataset`, {
    method: 'POST',
    headers: { 'x-api-key': METABASE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.data?.rows || [];
}

export async function searchProducts(query, limit = 20) {
  if (!METABASE_API_KEY || !query) return [];

  const take = Math.min(limit, 100);
  const trimmed = query.trim();
  const numericCode = parseInt(trimmed);

  const searchFilter = isNaN(numericCode)
    ? ['contains', ['field', 2144, { 'base-type': 'type/Text' }], trimmed]
    : ['or',
        ['contains', ['field', 2144, { 'base-type': 'type/Text' }], trimmed],
        ['=', ['field', 2157, { 'base-type': 'type/Integer' }], numericCode],
      ];

  const mbQuery = {
    database: 3,
    type: 'query',
    query: {
      'source-table': 154,
      fields: METABASE_FIELDS,
      filter: ['and', searchFilter],
      limit: take,
      'order-by': [['asc', ['field', 2144, { 'base-type': 'type/Text' }]]],
    },
  };

  const rows = await metabaseQuery(mbQuery);
  return rows.map(mapProductRow);
}

export async function batchProducts(codes) {
  if (!METABASE_API_KEY || !codes || codes.length === 0) return {};

  const numericCodes = codes.map(c => parseInt(c)).filter(n => !isNaN(n));
  if (numericCodes.length === 0) return {};

  const mbQuery = {
    database: 3,
    type: 'query',
    query: {
      'source-table': 154,
      fields: METABASE_FIELDS,
      filter: ['=', ['field', 2157, { 'base-type': 'type/Integer' }], ...numericCodes],
    },
  };

  const rows = await metabaseQuery(mbQuery);
  const result = {};
  for (const r of rows) {
    const product = mapProductRow(r);
    if (product.itemCode) result[product.itemCode] = product;
  }
  return result;
}

export function isMetabaseAvailable() {
  return !!METABASE_API_KEY;
}
