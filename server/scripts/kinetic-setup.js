#!/usr/bin/env node
/**
 * kinetic-setup.js — One-time setup for Kinetic managed table + saved queries.
 *
 * Usage:  node server/scripts/kinetic-setup.js
 *
 * Idempotent: safe to run multiple times. PUT creates-or-updates.
 */
import * as Kinetic from '../services/KineticService.js';

const TABLE_SLUG = 'widget_submissions';

async function setup() {
  if (!Kinetic.isAvailable()) {
    console.error('❌ KINETIC_BEARER_TOKEN not set in server/.env');
    process.exit(1);
  }

  console.log('── Step 1: Create managed table ──');
  const tableResult = await Kinetic.putTable(TABLE_SLUG, {
    description: 'Widget submission records from Optimus maker-checker workflow',
    columns: [
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
      { name: 'hierarchy', type: 'String', comment: 'Full slug mapping JSON (page → widget → items)' },
      { name: 'snapshot', type: 'String' },
      { name: 'request_id', type: 'String' },
    ],
    engine: 'MergeTree()',
    order_by: '(dt, widget_id)',
    partition_by: 'toYYYYMM(dt)',
    upsert_key: ['dt', 'widget_id'],
  });

  if (tableResult) {
    console.log('✅ Table defined:', tableResult.slug || TABLE_SLUG);
  } else {
    console.error('❌ Failed to create table');
    process.exit(1);
  }

  console.log('── Step 2: Publish table ──');
  const pubResult = await Kinetic.publishTable(TABLE_SLUG);
  if (pubResult) {
    console.log('✅ Table published:', pubResult.ch_table || 'ok');
  } else {
    console.warn('⚠️  Publish may have failed (table might already be active)');
  }

  console.log('── Step 3: Create saved queries ──');

  const q1 = await Kinetic.putQuery('homepage/submissions-by-date', {
    description: 'Widget submissions within a date range',
    tags: ['homepage', 'widget', 'submissions'],
    sample_questions: ['What widgets were submitted today?', 'Show all pending widget submissions this week'],
    sql: [
      'SELECT dt, widget_id, widget_type, slug, title, title_hi, item_titles_hi,',
      '       status, submitted_by, edited_by, edited_at, env,',
      '       products_count, pnc, page_slug, hierarchy, request_id, snapshot',
      'FROM kinetic.homepage__widget_submissions FINAL',
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
  console.log(q1 ? '✅ Query: homepage/submissions-by-date' : '❌ Failed: submissions-by-date');

  const q2 = await Kinetic.putQuery('homepage/analytics', {
    description: 'Aggregated submission analytics',
    tags: ['homepage', 'analytics'],
    sample_questions: ['How many widgets were deployed this month?', 'Which users submit the most widgets?'],
    sql: [
      'SELECT dt, status, widget_type, submitted_by, edited_by, env,',
      '       count() as submission_count, sum(products_count) as total_products',
      'FROM kinetic.homepage__widget_submissions FINAL',
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
  console.log(q2 ? '✅ Query: homepage/analytics' : '❌ Failed: analytics');

  const qSearch = await Kinetic.putQuery('homepage/search-widgets', {
    description: 'Search widgets by slug or title (for Fetch Widget feature)',
    tags: ['homepage', 'widget', 'search'],
    sample_questions: ['Find widget by slug name', 'Search widgets by title'],
    sql: [
      'SELECT dt, widget_id, widget_type, slug, title, title_hi,',
      '       status, submitted_by, env, pnc, products_count, snapshot',
      'FROM kinetic.homepage__widget_submissions FINAL',
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
  console.log(qSearch ? '✅ Query: homepage/search-widgets' : '❌ Failed: search-widgets');

  // ── Table 2: User Roles (Checker + Super Admin registry) ──

  console.log('── Step 4: Create user roles table ──');
  const ROLES_TABLE = 'user_roles';
  const rolesResult = await Kinetic.putTable(ROLES_TABLE, {
    description: 'Checker and Super Admin user registry for maker-checker workflow',
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

  if (rolesResult) {
    console.log('✅ Table defined:', rolesResult.slug || ROLES_TABLE);
  } else {
    console.error('❌ Failed to create user roles table');
  }

  console.log('── Step 5: Publish user roles table ──');
  const rolesPub = await Kinetic.publishTable(ROLES_TABLE);
  if (rolesPub) {
    console.log('✅ Table published:', rolesPub.ch_table || 'ok');
  } else {
    console.warn('⚠️  Publish may have failed (table might already be active)');
  }

  console.log('── Step 6: Create user roles query ──');
  const q3 = await Kinetic.putQuery('homepage/user-roles', {
    description: 'List all checkers and super admins',
    tags: ['homepage', 'users', 'roles'],
    sample_questions: ['Who are the checkers for PROD?', 'List all super admins'],
    sql: [
      'SELECT email, name, role, env, added_at, added_by, is_active, updated_at',
      'FROM kinetic.homepage__user_roles FINAL',
      'WHERE is_active = 1',
      '{{#if filter_role}} AND lower(role) = {{filter_role}} {{/if}}',
      '{{#if filter_env}} AND lower(env) = {{filter_env}} {{/if}}',
      'ORDER BY role, email',
    ].join('\n'),
    engine: 'clickhouse',
    variables: {
      filter_role: { type: 'string', required: false, default: null, description: 'Filter by role: CHECKER, SUPER_ADMIN' },
      filter_env: { type: 'string', required: false, default: null, description: 'Filter by environment: PROD, STAGING' },
    },
  });
  console.log(q3 ? '✅ Query: homepage/user-roles' : '❌ Failed: user-roles');

  // ── Table 3: Locations (state/city registry) ──

  console.log('── Step 8: Create locations table ──');
  const LOCATIONS_TABLE = 'locations';
  const locResult = await Kinetic.putTable(LOCATIONS_TABLE, {
    description: 'State and city location registry from Optimus',
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

  if (locResult) {
    console.log('✅ Table defined:', locResult.slug || LOCATIONS_TABLE);
  } else {
    console.error('❌ Failed to create locations table');
  }

  console.log('── Step 9: Publish locations table ──');
  const locPub = await Kinetic.publishTable(LOCATIONS_TABLE);
  if (locPub) {
    console.log('✅ Table published:', locPub.ch_table || 'ok');
  } else {
    console.warn('⚠️  Publish may have failed (table might already be active)');
  }

  // ── Query 4: Product Catalog (reads existing smpublic tables) ──

  console.log('── Step 7: Create product catalog query ──');
  const q4 = await Kinetic.putQuery('homepage/product-catalog', {
    description: 'Full product catalog from Mirror (smpublic tables)',
    tags: ['homepage', 'catalog', 'products'],
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
      '    CONCAT(\'https://gs.apnamart.in/\', LTRIM(a.main_image, \'/\')) AS product_image',
      '  FROM smpublic.smpcm_product a',
      '  WHERE a.active = TRUE',
      ') AS source',
      'WHERE',
      '  (source.channels <> \'OFF\' OR source.channels IS NULL)',
    ].join('\n'),
    engine: 'clickhouse',
    variables: {},
  });
  console.log(q4 ? '✅ Query: homepage/product-catalog' : '❌ Failed: product-catalog');

  console.log('\n── Done! ──');
}

setup().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
