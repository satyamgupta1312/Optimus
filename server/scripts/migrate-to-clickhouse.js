#!/usr/bin/env node
/**
 * migrate-to-clickhouse.js — One-time migration from SQLite (Prisma) to ClickHouse.
 *
 * Reads: widgets, widgetVersions, headerWidgets from SQLite
 * Writes: canvas_widgets, widget_versions tables in ClickHouse
 *
 * Usage: node server/scripts/migrate-to-clickhouse.js
 *
 * Prerequisites:
 *   1. Run `node server/scripts/kinetic-setup.js` first (creates tables)
 *   2. Prisma client must still be available (run before removing Prisma)
 */
import { PrismaClient } from '@prisma/client';
import * as Kinetic from '../services/KineticService.js';

const prisma = new PrismaClient();

async function migrate() {
  if (!Kinetic.isAvailable()) {
    console.error('KINETIC_BEARER_TOKEN not set');
    process.exit(1);
  }

  // ── 1. Build email lookup (userId → email) ──
  console.log('[1] Building user email lookup...');
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const emailMap = new Map(users.map(u => [u.id, u.email]));
  console.log(`  Found ${users.length} users`);

  // ── 2. Migrate Widgets → canvas_widgets ──
  console.log('\n[2] Migrating widgets...');
  const widgets = await prisma.widget.findMany();
  console.log(`  Found ${widgets.length} widgets in SQLite`);

  if (widgets.length > 0) {
    const rows = widgets.map(w => ({
      id: w.id,
      type: w.type || '',
      slug: w.slug || '',
      env: w.env || 'PROD',
      title: w.title || '',
      title_hi: w.titleHi || '',
      status: w.status || 'DRAFT',
      sort_order: w.sortOrder || 0,
      pnc: w.pnc || '{}',
      config: w.config || '{}',
      products: w.products || '[]',
      created_by: emailMap.get(w.createdBy) || w.createdBy || '',
      created_at: w.createdAt?.toISOString() || new Date().toISOString(),
      updated_at: w.updatedAt?.toISOString() || new Date().toISOString(),
      is_deleted: 0,
    }));

    // Batch insert (100 at a time)
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      await Kinetic.insertRowsStrict('canvas_widgets', batch);
      console.log(`  Inserted ${Math.min(i + 100, rows.length)}/${rows.length} widgets`);
    }
  }

  // ── 3. Migrate HeaderWidgets → canvas_widgets ──
  console.log('\n[3] Migrating header widgets...');
  const headers = await prisma.headerWidget.findMany();
  console.log(`  Found ${headers.length} header widgets`);

  if (headers.length > 0) {
    const now = new Date().toISOString();
    const headerRows = headers.map(h => ({
      id: h.id, // "primaryMasthead" or "secondaryMasthead"
      type: h.id,
      slug: '',
      env: 'PROD',
      title: h.id,
      title_hi: '',
      status: 'APPROVED',
      sort_order: 0,
      pnc: '{}',
      config: h.config || '{}',
      products: '[]',
      created_by: '',
      created_at: h.updatedAt?.toISOString() || now,
      updated_at: h.updatedAt?.toISOString() || now,
      is_deleted: 0,
    }));

    await Kinetic.insertRowsStrict('canvas_widgets', headerRows);
    console.log(`  Inserted ${headerRows.length} header widgets`);
  }

  // ── 4. Migrate WidgetVersions → widget_versions ──
  console.log('\n[4] Migrating widget versions...');
  const versions = await prisma.widgetVersion.findMany({
    include: { widget: { select: { slug: true, env: true } } },
  });
  console.log(`  Found ${versions.length} versions`);

  if (versions.length > 0) {
    const vRows = versions.map(v => ({
      id: v.id,
      widget_id: v.widgetId,
      widget_slug: v.widget?.slug || '',
      env: v.widget?.env || 'PROD',
      version: v.version,
      snapshot: v.snapshot || '{}',
      changed_by: v.changedBy || '',
      change_log: v.changeLog || '',
      created_at: v.createdAt?.toISOString() || new Date().toISOString(),
    }));

    for (let i = 0; i < vRows.length; i += 100) {
      const batch = vRows.slice(i, i + 100);
      await Kinetic.insertRowsStrict('widget_versions', batch);
      console.log(`  Inserted ${Math.min(i + 100, vRows.length)}/${vRows.length} versions`);
    }
  }

  // ── 5. Verify counts ──
  console.log('\n[5] Verifying...');
  const chWidgets = await Kinetic.readRowsStrict('canvas_widgets', { limit: 1 });
  const chVersions = await Kinetic.readRowsStrict('widget_versions', { limit: 1 });
  console.log(`  canvas_widgets: ${chWidgets?.data?.total_rows ?? '?'} rows`);
  console.log(`  widget_versions: ${chVersions?.data?.total_rows ?? '?'} rows`);

  console.log('\n✓ Migration complete!');
  await prisma.$disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
