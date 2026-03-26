#!/usr/bin/env node
/**
 * kinetic-setup.js — One-time setup for Kinetic managed table + saved queries.
 *
 * Usage:  node server/scripts/kinetic-setup.js
 *
 * Idempotent: safe to run multiple times. PUT creates-or-updates.
 */
import * as Kinetic from '../services/KineticService.js';

// ── Shared column definitions ──

const SUBMISSIONS_COLUMNS = [
  { name: 'dt', type: 'Date' },
  { name: 'widget_id', type: 'String' },
  { name: 'widget_type', type: 'String' },
  { name: 'slug', type: 'String' },
  { name: 'title', type: 'String' },
  { name: 'title_hi', type: 'String', comment: 'Widget Hindi title' },
  { name: 'item_titles_hi', type: 'String', comment: 'Widget items Hindi titles (JSON array)' },
  { name: 'status', type: 'String' },
  { name: 'submitted_by', type: 'String' },
  { name: 'edited_by', type: 'String', comment: 'Last editor email' },
  { name: 'edited_at', type: 'String', comment: 'Last edit timestamp (ISO)' },
  { name: 'env', type: 'String' },
  { name: 'products_count', type: 'UInt32', default: '0' },
  { name: 'pnc', type: 'String' },
  { name: 'page_slug', type: 'String', comment: 'Derived page layout slug' },
  { name: 'hierarchy', type: 'String', comment: 'Full slug mapping JSON (page -> widget -> items)' },
  { name: 'snapshot', type: 'String' },
  { name: 'request_id', type: 'String' },
  // New columns for ClickHouse-as-source-of-truth
  { name: 'rejection_reason', type: 'String', default: "''" },
  { name: 'header_widgets', type: 'String', default: "'{}'", comment: 'JSON snapshot of header widgets' },
  { name: 'request_type', type: 'String', default: "'Homepage Update'" },
  { name: 'sort_order', type: 'UInt32', default: '0' },
  { name: 'request_status', type: 'String', default: "'PENDING'", comment: 'Request-level status' },
  { name: 'submitted_at', type: 'String', default: "''", comment: 'ISO timestamp of submission' },
  { name: 'result', type: 'String', default: "''", comment: 'Deploy result' },
  { name: 'error', type: 'String', default: "''", comment: 'Deploy error message' },
];

const SUBMISSIONS_TABLE_DEF = {
  description: 'Widgets Submissions',
  columns: SUBMISSIONS_COLUMNS,
  engine: 'MergeTree()',
  order_by: '(request_id, widget_id)',
  partition_by: 'toYYYYMM(dt)',
  upsert_key: ['request_id', 'widget_id'],
};

const ACTIVITY_COLUMNS = [
  { name: 'id', type: 'String' },
  { name: 'dt', type: 'Date' },
  { name: 'action', type: 'String', comment: 'submit | approve | reject | create | update | delete | deploy | reopen' },
  { name: 'user_email', type: 'String' },
  { name: 'user_name', type: 'String' },
  { name: 'target_id', type: 'String', comment: 'Widget or Request ID' },
  { name: 'target_type', type: 'String', default: "''", comment: 'request | widget | headerWidgets' },
  { name: 'details', type: 'String', default: "'{}'", comment: 'Extra context as JSON' },
  { name: 'env', type: 'String', default: "'PROD'" },
  { name: 'created_at', type: 'String', comment: 'ISO timestamp' },
];

const ACTIVITY_TABLE_DEF = {
  description: 'Widgets Activity Log',
  columns: ACTIVITY_COLUMNS,
  engine: 'MergeTree()',
  order_by: '(dt, id)',
  partition_by: 'toYYYYMM(dt)',
  upsert_key: ['dt', 'id'],
};

// ── Helper ──
async function createAndPublish(slug, def) {
  const result = await Kinetic.putTable(slug, def);
  if (result) {
    console.log(`  Defined: ${result.slug || slug}`);
  } else {
    console.error(`  FAILED to define: ${slug}`);
    return false;
  }
  const pub = await Kinetic.publishTable(slug);
  if (pub) {
    console.log(`  Published: ${pub.ch_table || 'ok'}`);
  } else {
    console.warn(`  Publish may have failed for ${slug}`);
  }
  return true;
}

async function setup() {
  if (!Kinetic.isAvailable()) {
    console.error('KINETIC_BEARER_TOKEN not set in server/.env');
    process.exit(1);
  }

  // ── Tables ──

  console.log('[1] submissions (PROD)');
  await createAndPublish('submissions', SUBMISSIONS_TABLE_DEF);

  console.log('[2] submissions_uat');
  await createAndPublish('submissions_uat', {
    ...SUBMISSIONS_TABLE_DEF,
    description: 'Widgets Submissions (UAT)',
  });

  console.log('[3] activity_log (PROD)');
  await createAndPublish('activity_log', ACTIVITY_TABLE_DEF);

  console.log('[4] activity_log_uat');
  await createAndPublish('activity_log_uat', {
    ...ACTIVITY_TABLE_DEF,
    description: 'Widgets Activity Log (UAT)',
  });

  console.log('[5] user_roles');
  await createAndPublish('user_roles', {
    description: 'Widgets User Roles',
    columns: [
      { name: 'email', type: 'String', comment: 'User email (primary identifier)' },
      { name: 'name', type: 'String', comment: 'Display name' },
      { name: 'role', type: 'String', comment: 'CHECKER or SUPER_ADMIN' },
      { name: 'env', type: 'String', comment: 'Environment: PROD or STAGING' },
      { name: 'added_at', type: 'String', comment: 'When user was added (ISO timestamp)' },
      { name: 'added_by', type: 'String', comment: 'Who added this user (email)' },
      { name: 'is_active', type: 'UInt8', default: '1', comment: '1 = active, 0 = removed' },
      { name: 'updated_at', type: 'String', comment: 'Last update timestamp (ISO)' },
    ],
    engine: 'MergeTree()',
    order_by: '(email, env)',
    upsert_key: ['email', 'env'],
  });

  console.log('[6] locations');
  await createAndPublish('locations', {
    description: 'Widgets Locations',
    columns: [
      { name: 'key', type: 'String', comment: 'Location key (jh, patna, etc.)' },
      { name: 'env', type: 'String', comment: 'Environment: PROD or UAT' },
      { name: 'level_tag', type: 'String', comment: 'state or city' },
      { name: 'level_property', type: 'String', comment: 'Lowercase name (jharkhand, patna)' },
      { name: 'slug_suffix', type: 'String', comment: 'Slug suffix (_jh, _patna)' },
      { name: 'label', type: 'String', comment: 'Display name' },
      { name: 'type', type: 'String', comment: 'state or city' },
      { name: 'is_default', type: 'UInt8', default: '0', comment: '1 = always active' },
      { name: 'is_enabled', type: 'UInt8', default: '1', comment: '1 = active, 0 = disabled' },
      { name: 'is_custom', type: 'UInt8', default: '0', comment: '1 = user created' },
      { name: 'updated_at', type: 'String', comment: 'Last update timestamp (ISO)' },
    ],
    engine: 'MergeTree()',
    order_by: '(key, env)',
    upsert_key: ['key', 'env'],
  });

  // ── Saved Queries (new queries — old ones owned by another user, can't update) ──

  console.log('\n-- Saved queries --');

  // CH table names: kinetic.widgets__submissions, kinetic.widgets__user_roles, etc.

  const qSubmissions = await Kinetic.putQuery('widgets/submissions-by-date', {
    description: 'Widget submissions within a date range',
    tags: ['widgets', 'submissions'],
    sample_questions: ['What widgets were submitted today?', 'Show all pending widget submissions this week'],
    sql: [
      'SELECT dt, widget_id, widget_type, slug, title, title_hi, item_titles_hi,',
      '       status, submitted_by, edited_by, edited_at, env,',
      '       products_count, pnc, page_slug, hierarchy, request_id, snapshot,',
      '       rejection_reason, header_widgets, request_type, sort_order,',
      '       request_status, submitted_at, result, error',
      'FROM kinetic.widgets__submissions FINAL',
      'WHERE dt >= {{start_date}} AND dt <= {{end_date}}',
      '{{#if filter_status}} AND lower(status) = {{filter_status}} {{/if}}',
      '{{#if filter_env}} AND lower(env) = {{filter_env}} {{/if}}',
      'ORDER BY dt DESC',
    ].join('\n'),
    engine: 'clickhouse',
    variables: {
      start_date: { type: 'date', required: true, default: null, description: 'Start date' },
      end_date: { type: 'date', required: true, default: null, description: 'End date' },
      filter_status: { type: 'string', required: false, default: null, description: 'Filter by status' },
      filter_env: { type: 'string', required: false, default: null, description: 'Filter by environment' },
    },
  });
  console.log(qSubmissions ? 'Query: widgets/submissions-by-date' : 'Failed: submissions-by-date');

  const qAnalytics = await Kinetic.putQuery('widgets/analytics', {
    description: 'Aggregated submission analytics',
    tags: ['widgets', 'analytics'],
    sample_questions: ['How many widgets were deployed this month?', 'Which users submit the most widgets?'],
    sql: [
      'SELECT dt, status, widget_type, submitted_by, edited_by, env,',
      '       count() as submission_count, sum(products_count) as total_products',
      'FROM kinetic.widgets__submissions FINAL',
      'WHERE dt >= {{start_date}} AND dt <= {{end_date}}',
      '{{#if filter_env}} AND lower(env) = {{filter_env}} {{/if}}',
      'GROUP BY dt, status, widget_type, submitted_by, edited_by, env',
      'ORDER BY dt DESC',
    ].join('\n'),
    engine: 'clickhouse',
    variables: {
      start_date: { type: 'date', required: true, default: null, description: 'Start date' },
      end_date: { type: 'date', required: true, default: null, description: 'End date' },
      filter_env: { type: 'string', required: false, default: null, description: 'Filter by environment' },
    },
  });
  console.log(qAnalytics ? 'Query: widgets/analytics' : 'Failed: analytics');

  const qSearch = await Kinetic.putQuery('widgets/search', {
    description: 'Search widgets by slug or title',
    tags: ['widgets', 'search'],
    sample_questions: ['Find widget by slug name', 'Search widgets by title'],
    sql: [
      'SELECT dt, widget_id, widget_type, slug, title, title_hi,',
      '       status, submitted_by, env, pnc, products_count, snapshot',
      'FROM kinetic.widgets__submissions FINAL',
      'WHERE position(lower(slug), {{search_query}}) > 0',
      '   OR position(lower(title), {{search_query}}) > 0',
      'ORDER BY dt DESC',
      'LIMIT 10',
    ].join('\n'),
    engine: 'clickhouse',
    variables: {
      search_query: { type: 'string', required: true, default: null, description: 'Search term (slug or title)' },
    },
  });
  console.log(qSearch ? 'Query: widgets/search' : 'Failed: search');

  const qPending = await Kinetic.putQuery('widgets/pending-requests', {
    description: 'Fetch requests by status and environment (for RequestQueue)',
    tags: ['widgets', 'requests', 'approval'],
    sample_questions: ['Show all pending requests', 'What requests need approval?'],
    sql: [
      'SELECT dt, widget_id, widget_type, slug, title, title_hi, item_titles_hi,',
      '       status, submitted_by, edited_by, edited_at, env,',
      '       products_count, pnc, page_slug, hierarchy, request_id, snapshot,',
      '       rejection_reason, header_widgets, request_type, sort_order,',
      '       request_status, submitted_at, result, error',
      'FROM kinetic.widgets__{{filter_table}} FINAL',
      'WHERE 1=1',
      '{{#if filter_request_status}} AND lower(request_status) = {{filter_request_status}} {{/if}}',
      '{{#if filter_date}} AND dt = {{filter_date}} {{/if}}',
      'ORDER BY submitted_at DESC',
    ].join('\n'),
    engine: 'clickhouse',
    variables: {
      filter_table: { type: 'string', required: true, default: 'submissions', description: 'Table: submissions or submissions_uat' },
      filter_request_status: { type: 'string', required: false, default: null, description: 'Filter by request status' },
      filter_date: { type: 'date', required: false, default: null, description: 'Filter by specific date' },
    },
  });
  console.log(qPending ? 'Query: widgets/pending-requests' : 'Failed: pending-requests');

  const qById = await Kinetic.putQuery('widgets/request-by-id', {
    description: 'Fetch a single request by ID',
    tags: ['widgets', 'requests'],
    sample_questions: ['Get request details by ID'],
    sql: [
      'SELECT dt, widget_id, widget_type, slug, title, title_hi, item_titles_hi,',
      '       status, submitted_by, edited_by, edited_at, env,',
      '       products_count, pnc, page_slug, hierarchy, request_id, snapshot,',
      '       rejection_reason, header_widgets, request_type, sort_order,',
      '       request_status, submitted_at, result, error',
      'FROM kinetic.widgets__{{filter_table}} FINAL',
      'WHERE lower(request_id) = {{filter_request_id}}',
      'ORDER BY sort_order ASC',
    ].join('\n'),
    engine: 'clickhouse',
    variables: {
      filter_table: { type: 'string', required: true, default: 'submissions', description: 'Table name' },
      filter_request_id: { type: 'string', required: true, default: null, description: 'Request UUID' },
    },
  });
  console.log(qById ? 'Query: widgets/request-by-id' : 'Failed: request-by-id');

  const qActivity = await Kinetic.putQuery('widgets/activity-log', {
    description: 'Activity log with date range and optional filters',
    tags: ['widgets', 'activity', 'audit'],
    sample_questions: ['Show recent activity', 'What approvals happened today?'],
    sql: [
      'SELECT id, dt, action, user_email, user_name, target_id, target_type,',
      '       details, env, created_at',
      'FROM kinetic.widgets__{{filter_table}} FINAL',
      'WHERE dt >= {{start_date}} AND dt <= {{end_date}}',
      '{{#if filter_action}} AND lower(action) = {{filter_action}} {{/if}}',
      'ORDER BY created_at DESC',
      '{{#if filter_limit}} LIMIT {{filter_limit}} {{/if}}',
      '{{#if filter_offset}} OFFSET {{filter_offset}} {{/if}}',
    ].join('\n'),
    engine: 'clickhouse',
    variables: {
      filter_table: { type: 'string', required: true, default: 'activity_log', description: 'Table: activity_log or activity_log_uat' },
      start_date: { type: 'date', required: true, default: null, description: 'Start date' },
      end_date: { type: 'date', required: true, default: null, description: 'End date' },
      filter_action: { type: 'string', required: false, default: null, description: 'Filter by action type' },
      filter_limit: { type: 'number', required: false, default: null, description: 'Limit results' },
      filter_offset: { type: 'number', required: false, default: null, description: 'Offset for pagination' },
    },
  });
  console.log(qActivity ? 'Query: widgets/activity-log' : 'Failed: activity-log');

  const qUserRoles = await Kinetic.putQuery('widgets/user-roles', {
    description: 'List all checkers and super admins',
    tags: ['widgets', 'users', 'roles'],
    sample_questions: ['Who are the checkers for PROD?', 'List all super admins'],
    sql: [
      'SELECT email, name, role, env, added_at, added_by, is_active, updated_at',
      'FROM kinetic.widgets__user_roles FINAL',
      'WHERE is_active = 1',
      '{{#if filter_role}} AND lower(role) = {{filter_role}} {{/if}}',
      '{{#if filter_env}} AND lower(env) = {{filter_env}} {{/if}}',
      'ORDER BY role, email',
    ].join('\n'),
    engine: 'clickhouse',
    variables: {
      filter_role: { type: 'string', required: false, default: null, description: 'Filter by role' },
      filter_env: { type: 'string', required: false, default: null, description: 'Filter by environment' },
    },
  });
  console.log(qUserRoles ? 'Query: widgets/user-roles' : 'Failed: user-roles');

  const qCatalog = await Kinetic.putQuery('widgets/product-catalog', {
    description: 'Full product catalog from Mirror (smpublic tables)',
    tags: ['widgets', 'catalog', 'products'],
    sample_questions: ['Show all active products', 'Get product catalog for homepage'],
    sql: [
      'SELECT',
      '  source.id AS id,',
      '  source.item_code AS item_code,',
      '  source.display_name AS display_name,',
      '  source.brand AS brand,',
      '  source.product_image AS product_image,',
      '  source.mrp AS mrp,',
      '  source.selling_price AS selling_price',
      'FROM',
      '(',
      '  SELECT',
      '    a.*,',
      "    CONCAT('https://gs.apnamart.in/', LTRIM(a.main_image, '/')) AS product_image",
      '  FROM smpublic.smpcm_product a',
      '  WHERE a.active = TRUE',
      ') AS source',
      'WHERE',
      "  (source.channels <> 'OFF' OR source.channels IS NULL)",
    ].join('\n'),
    engine: 'clickhouse',
    variables: {},
  });
  console.log(qCatalog ? 'Query: widgets/product-catalog' : 'Failed: product-catalog');

  console.log('\n-- Done! --');
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
