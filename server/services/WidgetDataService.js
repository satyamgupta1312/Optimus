/**
 * WidgetDataService — All ClickHouse + Metabase data access.
 *
 * Replaces Prisma as the data layer for:
 * - Auth (user_roles table, cached)
 * - Widgets + Headers (canvas_widgets table)
 * - Versions (widget_versions table)
 * - Checkers (user_roles table)
 * - Locations (locations table)
 * - Products (Metabase API)
 */
import * as Kinetic from './KineticService.js';
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
const WIDGETS_TABLE = 'canvas_widgets';
const VERSIONS_TABLE = 'widget_versions';
const ROLES_TABLE = 'user_roles';
const LOCATIONS_TABLE = 'locations';

const SUPER_ADMIN_IDENTIFIERS = ['satyam.gupta@apnamart.in', 'satyam'];
const HARDCODED_CHECKERS = { 'manoj.kumar': 'Manoj Kumar' };

// ── Auth cache ──
const userCache = new Map();
const USER_CACHE_TTL = 60_000; // 60s

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

export async function resolveUser(email, env) {
  const lowerEmail = email.toLowerCase();

  // SUPER_ADMIN — zero DB calls
  if (SUPER_ADMIN_IDENTIFIERS.includes(lowerEmail)) {
    return { email: lowerEmail, name: lowerEmail.split('@')[0], role: 'SUPER_ADMIN' };
  }

  // Hard-coded CHECKER — zero DB calls
  if (HARDCODED_CHECKERS[lowerEmail]) {
    return { email: lowerEmail, name: HARDCODED_CHECKERS[lowerEmail], role: 'CHECKER' };
  }

  // Check cache
  const cacheKey = `${lowerEmail}:${env}`;
  const cached = userCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < USER_CACHE_TTL) {
    return cached.user;
  }

  // Read from user_roles table
  let role = 'MAKER';
  let name = lowerEmail.split('@')[0];
  try {
    const result = await Kinetic.readRowsStrict(ROLES_TABLE, {
      where: `email = '${lowerEmail}' AND env = '${env}' AND is_active = 1`,
      limit: 1,
    });
    const rows = result?.data?.rows || [];
    if (rows.length > 0 && rows[0].role === 'CHECKER') {
      role = 'CHECKER';
      name = rows[0].name || name;
    }
  } catch {
    // If CH read fails, default to MAKER (graceful degradation)
  }

  const user = { email: lowerEmail, name, role };
  userCache.set(cacheKey, { user, ts: Date.now() });
  return user;
}

export function bustUserCache(email, env) {
  const lowerEmail = email.toLowerCase();
  for (const key of userCache.keys()) {
    if (key.startsWith(`${lowerEmail}:`)) userCache.delete(key);
  }
}

// ══════════════════════════════════════════════════════════════
// WIDGETS (canvas_widgets table)
// ══════════════════════════════════════════════════════════════

function parseWidget(row) {
  return {
    id: row.id,
    type: row.type || '',
    slug: row.slug || '',
    env: row.env || 'PROD',
    title: row.title || '',
    titleHi: row.title_hi || '',
    status: row.status || 'DRAFT',
    sortOrder: Number(row.sort_order) || 0,
    pnc: safeJsonParse(row.pnc, {}),
    config: safeJsonParse(row.config, {}),
    products: safeJsonParse(row.products, []),
    createdBy: row.created_by || '',
    creator: { email: row.created_by || '', name: (row.created_by || '').split('@')[0] },
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export async function listWidgets(env, { status, type, slug, date } = {}) {
  const whereParts = ['is_deleted = 0', `env = '${env}'`];
  whereParts.push("type NOT IN ('primaryMasthead', 'secondaryMasthead')");

  if (status) whereParts.push(`status = '${esc(status)}'`);
  if (type) whereParts.push(`type = '${esc(type)}'`);
  if (slug) whereParts.push(`slug = '${esc(slug)}'`);
  if (date) {
    whereParts.push(`created_at >= '${date}T00:00:00'`);
    whereParts.push(`created_at < '${date}T23:59:59'`);
  }

  const result = await Kinetic.readRowsStrict(WIDGETS_TABLE, {
    where: whereParts.join(' AND '),
    order_by: 'sort_order ASC',
    limit: 500,
  });

  return (result?.data?.rows || []).map(parseWidget);
}

export async function getWidgetById(id) {
  const result = await Kinetic.readRowsStrict(WIDGETS_TABLE, {
    where: `id = '${esc(id)}' AND is_deleted = 0`,
    limit: 1,
  });
  const rows = result?.data?.rows || [];
  return rows.length > 0 ? parseWidget(rows[0]) : null;
}

export async function createWidget(data) {
  const id = data.id || crypto.randomUUID();
  const now = new Date().toISOString();

  const row = {
    id,
    type: data.type || 'unknown',
    slug: data.slug || '',
    env: data.env || 'PROD',
    title: data.title || '',
    title_hi: data.titleHi || '',
    status: data.status || 'DRAFT',
    sort_order: data.sortOrder ?? 0,
    pnc: typeof data.pnc === 'string' ? data.pnc : JSON.stringify(data.pnc || {}),
    config: typeof data.config === 'string' ? data.config : JSON.stringify(data.config || {}),
    products: typeof data.products === 'string' ? data.products : JSON.stringify(data.products || []),
    created_by: data.createdBy || '',
    created_at: now,
    updated_at: now,
    is_deleted: 0,
  };

  await Kinetic.insertRowsStrict(WIDGETS_TABLE, [row]);
  return parseWidget(row);
}

export async function updateWidget(id, data) {
  const set = {};
  if (data.type !== undefined) set.type = `'${esc(data.type)}'`;
  if (data.slug !== undefined) set.slug = `'${esc(data.slug)}'`;
  if (data.title !== undefined) set.title = `'${esc(data.title)}'`;
  if (data.titleHi !== undefined) set.title_hi = `'${esc(data.titleHi)}'`;
  if (data.status !== undefined) set.status = `'${esc(data.status)}'`;
  if (data.sortOrder !== undefined) set.sort_order = String(data.sortOrder);
  if (data.pnc !== undefined) set.pnc = `'${esc(JSON.stringify(data.pnc))}'`;
  if (data.config !== undefined) set.config = `'${esc(JSON.stringify(data.config))}'`;
  if (data.products !== undefined) set.products = `'${esc(JSON.stringify(data.products))}'`;
  set.updated_at = `'${new Date().toISOString()}'`;

  await Kinetic.updateRowsStrict(WIDGETS_TABLE, {
    set,
    where: `id = '${esc(id)}'`,
  });

  // Read back updated widget (Kinetic uses FINAL for upsert_key tables)
  return getWidgetById(id);
}

export async function deleteWidget(id) {
  await Kinetic.updateRowsStrict(WIDGETS_TABLE, {
    set: { is_deleted: '1', updated_at: `'${new Date().toISOString()}'` },
    where: `id = '${esc(id)}'`,
  });
}

export async function reorderWidgets(order) {
  const now = new Date().toISOString();
  for (const { id, sortOrder } of order) {
    await Kinetic.updateRowsStrict(WIDGETS_TABLE, {
      set: { sort_order: String(sortOrder), updated_at: `'${now}'` },
      where: `id = '${esc(id)}'`,
    });
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
  const idList = widgetIds.map(id => `'${esc(id)}'`).join(', ');
  await Kinetic.updateRowsStrict(WIDGETS_TABLE, {
    set: { status: `'${esc(status)}'`, updated_at: `'${new Date().toISOString()}'` },
    where: `id IN (${idList})`,
  });
}

// Find multiple widgets by ID list
export async function findWidgetsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const idList = ids.map(id => `'${esc(id)}'`).join(', ');
  const result = await Kinetic.readRowsStrict(WIDGETS_TABLE, {
    where: `id IN (${idList}) AND is_deleted = 0`,
    limit: ids.length,
  });
  return (result?.data?.rows || []).map(parseWidget);
}

// ══════════════════════════════════════════════════════════════
// HEADER WIDGETS (canvas_widgets table — global, not per-env)
// ══════════════════════════════════════════════════════════════

export async function getHeaderWidgets() {
  const result = await Kinetic.readRowsStrict(WIDGETS_TABLE, {
    where: "type IN ('primaryMasthead', 'secondaryMasthead') AND is_deleted = 0",
    limit: 2,
  });
  const rows = result?.data?.rows || [];
  const headers = { primaryMasthead: null, secondaryMasthead: null };
  for (const row of rows) {
    headers[row.type] = safeJsonParse(row.config, null);
  }
  return headers;
}

export async function upsertHeaderWidget(type, config, email) {
  const now = new Date().toISOString();
  await Kinetic.insertRowsStrict(WIDGETS_TABLE, [{
    id: type, // "primaryMasthead" or "secondaryMasthead"
    type,
    slug: '',
    env: 'PROD', // global — stored under PROD
    title: type,
    title_hi: '',
    status: 'APPROVED',
    sort_order: 0,
    pnc: '{}',
    config: JSON.stringify(config),
    products: '[]',
    created_by: email || '',
    created_at: now,
    updated_at: now,
    is_deleted: 0,
  }]);
}

// ══════════════════════════════════════════════════════════════
// VERSIONS (widget_versions table)
// ══════════════════════════════════════════════════════════════

function parseVersion(row) {
  return {
    id: row.id,
    widgetId: row.widget_id,
    widgetSlug: row.widget_slug || '',
    env: row.env || 'PROD',
    version: Number(row.version) || 0,
    snapshot: safeJsonParse(row.snapshot, {}),
    changedBy: row.changed_by || '',
    changeLog: row.change_log || '',
    createdAt: row.created_at || '',
  };
}

export async function listVersions(widgetId, { limit = 20, cursor } = {}) {
  const whereParts = [`widget_id = '${esc(widgetId)}'`];
  if (cursor) whereParts.push(`version < ${parseInt(cursor)}`);

  const result = await Kinetic.readRowsStrict(VERSIONS_TABLE, {
    where: whereParts.join(' AND '),
    order_by: 'version DESC',
    limit,
  });

  const rows = result?.data?.rows || [];
  const versions = rows.map(parseVersion);
  const hasMore = versions.length === limit;
  const nextCursor = hasMore ? versions[versions.length - 1].version : null;

  return { versions, hasMore, nextCursor };
}

export async function createVersion(data) {
  const row = {
    id: crypto.randomUUID(),
    widget_id: data.widgetId,
    widget_slug: data.widgetSlug || '',
    env: data.env || 'PROD',
    version: data.version,
    snapshot: typeof data.snapshot === 'string' ? data.snapshot : JSON.stringify(data.snapshot || {}),
    changed_by: data.changedBy || '',
    change_log: data.changeLog || '',
    created_at: new Date().toISOString(),
  };

  await Kinetic.insertRowsStrict(VERSIONS_TABLE, [row]);
  return parseVersion(row);
}

export async function getLatestVersion(widgetId) {
  const result = await Kinetic.readRowsStrict(VERSIONS_TABLE, {
    where: `widget_id = '${esc(widgetId)}'`,
    order_by: 'version DESC',
    limit: 1,
  });
  const rows = result?.data?.rows || [];
  return rows.length > 0 ? parseVersion(rows[0]) : null;
}

// ══════════════════════════════════════════════════════════════
// CHECKERS (user_roles table)
// ══════════════════════════════════════════════════════════════

export async function listCheckers(env) {
  const result = await Kinetic.readRowsStrict(ROLES_TABLE, {
    where: `env = '${env}' AND is_active = 1`,
    order_by: 'role, email',
  });
  return (result?.data?.rows || []).map(row => ({
    email: row.email,
    name: row.name || row.email.split('@')[0],
    role: row.role || 'CHECKER',
    addedAt: row.added_at || null,
  }));
}

export async function addChecker(email, name, env, addedBy) {
  const now = new Date().toISOString();
  const lowerEmail = email.toLowerCase();
  await Kinetic.insertRowsStrict(ROLES_TABLE, [{
    email: lowerEmail,
    name: name || lowerEmail.split('@')[0],
    role: 'CHECKER',
    env,
    added_at: now,
    added_by: addedBy || '',
    is_active: 1,
    updated_at: now,
  }]);
  bustUserCache(lowerEmail, env);
  return { email: lowerEmail, name: name || lowerEmail.split('@')[0], role: 'CHECKER' };
}

export async function removeChecker(email, env) {
  const lowerEmail = email.toLowerCase();
  await Kinetic.updateRowsStrict(ROLES_TABLE, {
    set: { is_active: '0', updated_at: `'${new Date().toISOString()}'` },
    where: `email = '${lowerEmail}' AND env = '${env}'`,
  });
  bustUserCache(lowerEmail, env);
}

// Check if a user is still a checker in ANY environment
export async function isCheckerAnywhere(email) {
  const lowerEmail = email.toLowerCase();
  const result = await Kinetic.readRowsStrict(ROLES_TABLE, {
    where: `email = '${lowerEmail}' AND is_active = 1`,
    limit: 1,
  });
  return (result?.data?.rows || []).length > 0;
}

// ══════════════════════════════════════════════════════════════
// LOCATIONS
// ══════════════════════════════════════════════════════════════

function parseLocation(row) {
  return {
    key: row.key,
    env: row.env || 'PROD',
    levelTag: row.level_tag || '',
    levelProperty: row.level_property || '',
    slugSuffix: row.slug_suffix || '',
    label: row.label || '',
    type: row.type || '',
    isDefault: Number(row.is_default) === 1,
    isEnabled: Number(row.is_enabled) === 1,
    isCustom: Number(row.is_custom) === 1,
    updatedAt: row.updated_at || '',
  };
}

export async function listLocations(env, enabledOnly = false) {
  const whereParts = [`env = '${env}'`];
  if (enabledOnly) whereParts.push('is_enabled = 1');

  const result = await Kinetic.readRowsStrict(LOCATIONS_TABLE, {
    where: whereParts.join(' AND '),
    order_by: 'is_default DESC, type ASC, label ASC',
  });

  return (result?.data?.rows || []).map(parseLocation);
}

export async function getLocation(key, env) {
  const result = await Kinetic.readRowsStrict(LOCATIONS_TABLE, {
    where: `key = '${esc(key)}' AND env = '${env}'`,
    limit: 1,
  });
  const rows = result?.data?.rows || [];
  return rows.length > 0 ? parseLocation(rows[0]) : null;
}

export async function createLocation(data) {
  // Check for duplicate
  const existing = await getLocation(data.key, data.env || 'PROD');
  if (existing) {
    throw Object.assign(new Error(`Location with key "${data.key}" already exists`), { status: 409 });
  }

  const row = {
    key: data.key,
    env: data.env || 'PROD',
    level_tag: data.levelTag || '',
    level_property: data.levelProperty || '',
    slug_suffix: data.slugSuffix || '',
    label: data.label || '',
    type: data.type || '',
    is_default: 0,
    is_enabled: 1,
    is_custom: 1,
    updated_at: new Date().toISOString(),
  };

  await Kinetic.insertRowsStrict(LOCATIONS_TABLE, [row]);
  return parseLocation(row);
}

export async function toggleLocation(key, env) {
  const result = await Kinetic.readRowsStrict(LOCATIONS_TABLE, {
    where: `key = '${esc(key)}' AND env = '${env}'`,
    limit: 1,
  });
  const rows = result?.data?.rows || [];
  if (rows.length === 0) return null;

  const current = rows[0];
  if (Number(current.is_default) === 1) {
    throw Object.assign(new Error('Cannot toggle default locations'), { status: 403 });
  }

  const newEnabled = Number(current.is_enabled) === 1 ? 0 : 1;

  // Upsert with toggled value (upsert_key: [key, env])
  await Kinetic.insertRowsStrict(LOCATIONS_TABLE, [{
    ...current,
    is_enabled: newEnabled,
    updated_at: new Date().toISOString(),
  }]);

  return parseLocation({ ...current, is_enabled: newEnabled, updated_at: new Date().toISOString() });
}

export async function deleteLocation(key, env) {
  const result = await Kinetic.readRowsStrict(LOCATIONS_TABLE, {
    where: `key = '${esc(key)}' AND env = '${env}'`,
    limit: 1,
  });
  const rows = result?.data?.rows || [];
  if (rows.length === 0) return null;

  if (Number(rows[0].is_custom) !== 1) {
    throw Object.assign(new Error('Only custom locations can be deleted'), { status: 403 });
  }

  // Soft delete: disable
  await Kinetic.updateRowsStrict(LOCATIONS_TABLE, {
    set: { is_enabled: '0', updated_at: `'${new Date().toISOString()}'` },
    where: `key = '${esc(key)}' AND env = '${env}'`,
  });

  return true;
}

// ══════════════════════════════════════════════════════════════
// PRODUCTS (Metabase Structured Query)
// ══════════════════════════════════════════════════════════════

const IMAGE_BASE = 'https://gs.apnamart.in/';

const METABASE_FIELDS = [
  ['field', 2171, { 'base-type': 'type/BigInteger' }],  // id
  ['field', 2157, { 'base-type': 'type/Integer' }],     // item_code
  ['field', 2144, { 'base-type': 'type/Text' }],        // display_name
  ['field', 2149, { 'base-type': 'type/Text' }],        // brand
  ['field', 2156, { 'base-type': 'type/Text' }],        // main_image
  ['field', 2146, { 'base-type': 'type/Float' }],       // mrp
  ['field', 2188, { 'base-type': 'type/Float' }],       // selling_price
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

// ── Helpers ──

function safeJsonParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
