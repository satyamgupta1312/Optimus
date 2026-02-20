import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

// ── Parse CSV ──
function parseCSVLine(text) {
  const result = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(cell.trim()); cell = ''; }
    else { cell += ch; }
  }
  result.push(cell.trim());
  return result;
}

async function main() {
  console.log('[seed] Starting...');

  // ── 1. Import catalog.csv ──
  const csvPath = resolve(__dirname, '../../src/data/catalog.csv');
  let csvText;
  try {
    csvText = readFileSync(csvPath, 'utf-8');
  } catch {
    console.warn('[seed] catalog.csv not found at', csvPath, '— skipping product import');
    csvText = '';
  }

  if (csvText) {
    const rows = csvText.split('\n').slice(1); // Skip header
    let imported = 0;

    for (const row of rows) {
      if (!row.trim()) continue;
      const cols = parseCSVLine(row);
      const itemCode = (cols[1] || '').replace(/"/g, '').replace(/,/g, '').trim();
      if (!itemCode) continue;

      await prisma.product.upsert({
        where: { itemCode },
        update: {
          name: (cols[2] || '').replace(/"/g, ''),
          brand: cols[3] || '',
          image: cols[4] || '',
          mrp: parseFloat((cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
          price: parseFloat((cols[6] || cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
        },
        create: {
          itemCode,
          name: (cols[2] || '').replace(/"/g, ''),
          brand: cols[3] || '',
          image: cols[4] || '',
          mrp: parseFloat((cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
          price: parseFloat((cols[6] || cols[5] || '0').replace(/[^0-9.]/g, '')) || 0,
        },
      });
      imported++;
    }
    console.log(`[seed] Imported ${imported} products from catalog.csv`);
  }

  // ── 2. Create super admin user ──
  const admin = await prisma.user.upsert({
    where: { email: 'admin@apnamart.in' },
    update: { role: 'SUPER_ADMIN' },
    create: { email: 'admin@apnamart.in', name: 'Admin', role: 'SUPER_ADMIN' },
  });
  console.log('[seed] Super admin created:', admin.email);

  // ── 3. Create header widget rows ──
  for (const id of ['primaryMasthead', 'secondaryMasthead']) {
    await prisma.headerWidget.upsert({
      where: { id },
      update: {},
      create: { id, config: '{}' },
    });
  }
  console.log('[seed] Header widget slots created');

  console.log('[seed] Done!');
}

main()
  .catch((e) => { console.error('[seed] Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
