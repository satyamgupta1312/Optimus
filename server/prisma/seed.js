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

  // ── 4. Seed locations (states & cities) ──
  const defaultLocations = [
    { key: 'jh', levelTag: 'state', levelProperty: 'jharkhand', slugSuffix: '_jh', label: 'Jharkhand', type: 'state', isDefault: true },
    { key: 'cg', levelTag: 'state', levelProperty: 'chhattisgarh', slugSuffix: '_cg', label: 'Chhattisgarh', type: 'state', isDefault: true },
    { key: 'wb', levelTag: 'state', levelProperty: 'west bengal', slugSuffix: '_wb', label: 'West Bengal', type: 'state', isDefault: true },
    { key: 'patna', levelTag: 'city', levelProperty: 'patna', slugSuffix: '_patna', label: 'Patna', type: 'city', isDefault: true },
  ];

  const catalogLocations = [
    // States
    { key: 'up', levelTag: 'state', levelProperty: 'uttar pradesh', slugSuffix: '_up', label: 'Uttar Pradesh', type: 'state' },
    { key: 'br', levelTag: 'state', levelProperty: 'bihar', slugSuffix: '_br', label: 'Bihar', type: 'state' },
    { key: 'gj', levelTag: 'state', levelProperty: 'gujarat', slugSuffix: '_gj', label: 'Gujarat', type: 'state' },
    { key: 'mp', levelTag: 'state', levelProperty: 'madhya pradesh', slugSuffix: '_mp', label: 'Madhya Pradesh', type: 'state' },
    { key: 'rj', levelTag: 'state', levelProperty: 'rajasthan', slugSuffix: '_rj', label: 'Rajasthan', type: 'state' },
    { key: 'mh', levelTag: 'state', levelProperty: 'maharashtra', slugSuffix: '_mh', label: 'Maharashtra', type: 'state' },
    { key: 'dl', levelTag: 'state', levelProperty: 'delhi', slugSuffix: '_dl', label: 'Delhi', type: 'state' },
    { key: 'ka', levelTag: 'state', levelProperty: 'karnataka', slugSuffix: '_ka', label: 'Karnataka', type: 'state' },
    { key: 'tn', levelTag: 'state', levelProperty: 'tamil nadu', slugSuffix: '_tn', label: 'Tamil Nadu', type: 'state' },
    { key: 'ap', levelTag: 'state', levelProperty: 'andhra pradesh', slugSuffix: '_ap', label: 'Andhra Pradesh', type: 'state' },
    { key: 'tg', levelTag: 'state', levelProperty: 'telangana', slugSuffix: '_tg', label: 'Telangana', type: 'state' },
    { key: 'od', levelTag: 'state', levelProperty: 'odisha', slugSuffix: '_od', label: 'Odisha', type: 'state' },
    { key: 'as', levelTag: 'state', levelProperty: 'assam', slugSuffix: '_as', label: 'Assam', type: 'state' },
    { key: 'hr', levelTag: 'state', levelProperty: 'haryana', slugSuffix: '_hr', label: 'Haryana', type: 'state' },
    { key: 'pb', levelTag: 'state', levelProperty: 'punjab', slugSuffix: '_pb', label: 'Punjab', type: 'state' },
    { key: 'uk', levelTag: 'state', levelProperty: 'uttarakhand', slugSuffix: '_uk', label: 'Uttarakhand', type: 'state' },
    { key: 'hp', levelTag: 'state', levelProperty: 'himachal pradesh', slugSuffix: '_hp', label: 'Himachal Pradesh', type: 'state' },
    { key: 'ga', levelTag: 'state', levelProperty: 'goa', slugSuffix: '_ga', label: 'Goa', type: 'state' },
    { key: 'ke', levelTag: 'state', levelProperty: 'kerala', slugSuffix: '_ke', label: 'Kerala', type: 'state' },
    { key: 'mn', levelTag: 'state', levelProperty: 'manipur', slugSuffix: '_mn', label: 'Manipur', type: 'state' },
    { key: 'ml', levelTag: 'state', levelProperty: 'meghalaya', slugSuffix: '_ml', label: 'Meghalaya', type: 'state' },
    { key: 'sk', levelTag: 'state', levelProperty: 'sikkim', slugSuffix: '_sk', label: 'Sikkim', type: 'state' },
    // Cities
    { key: 'ranchi', levelTag: 'city', levelProperty: 'ranchi', slugSuffix: '_rnc', label: 'Ranchi', type: 'city' },
    { key: 'lucknow', levelTag: 'city', levelProperty: 'lucknow', slugSuffix: '_lko', label: 'Lucknow', type: 'city' },
    { key: 'kanpur', levelTag: 'city', levelProperty: 'kanpur', slugSuffix: '_knp', label: 'Kanpur', type: 'city' },
    { key: 'varanasi', levelTag: 'city', levelProperty: 'varanasi', slugSuffix: '_vns', label: 'Varanasi', type: 'city' },
    { key: 'agra', levelTag: 'city', levelProperty: 'agra', slugSuffix: '_agr', label: 'Agra', type: 'city' },
    { key: 'kolkata', levelTag: 'city', levelProperty: 'kolkata', slugSuffix: '_kol', label: 'Kolkata', type: 'city' },
    { key: 'mumbai', levelTag: 'city', levelProperty: 'mumbai', slugSuffix: '_mum', label: 'Mumbai', type: 'city' },
    { key: 'pune', levelTag: 'city', levelProperty: 'pune', slugSuffix: '_pun', label: 'Pune', type: 'city' },
    { key: 'surat', levelTag: 'city', levelProperty: 'surat', slugSuffix: '_sur', label: 'Surat', type: 'city' },
    { key: 'ahmedabad', levelTag: 'city', levelProperty: 'ahmedabad', slugSuffix: '_ahm', label: 'Ahmedabad', type: 'city' },
    { key: 'jaipur', levelTag: 'city', levelProperty: 'jaipur', slugSuffix: '_jai', label: 'Jaipur', type: 'city' },
    { key: 'bhopal', levelTag: 'city', levelProperty: 'bhopal', slugSuffix: '_bho', label: 'Bhopal', type: 'city' },
    { key: 'indore', levelTag: 'city', levelProperty: 'indore', slugSuffix: '_ind', label: 'Indore', type: 'city' },
    { key: 'nagpur', levelTag: 'city', levelProperty: 'nagpur', slugSuffix: '_ngp', label: 'Nagpur', type: 'city' },
    { key: 'raipur', levelTag: 'city', levelProperty: 'raipur', slugSuffix: '_rpr', label: 'Raipur', type: 'city' },
    { key: 'bhubaneswar', levelTag: 'city', levelProperty: 'bhubaneswar', slugSuffix: '_bbsr', label: 'Bhubaneswar', type: 'city' },
    { key: 'guwahati', levelTag: 'city', levelProperty: 'guwahati', slugSuffix: '_gwh', label: 'Guwahati', type: 'city' },
    { key: 'chandigarh', levelTag: 'city', levelProperty: 'chandigarh', slugSuffix: '_chd', label: 'Chandigarh', type: 'city' },
  ];

  let locSeeded = 0;
  for (const env of ['PROD', 'UAT']) {
    // Seed defaults (isDefault: true, isEnabled: true)
    for (const loc of defaultLocations) {
      await prisma.location.upsert({
        where: { key_env: { key: loc.key, env } },
        update: {}, // Don't overwrite user toggles on re-seed
        create: { ...loc, env, isDefault: true, isEnabled: true },
      });
      locSeeded++;
    }
    // Seed catalog (isDefault: false, isEnabled: false)
    for (const loc of catalogLocations) {
      await prisma.location.upsert({
        where: { key_env: { key: loc.key, env } },
        update: {}, // Don't overwrite user toggles on re-seed
        create: { ...loc, env, isDefault: false, isEnabled: false },
      });
      locSeeded++;
    }
  }
  console.log(`[seed] Seeded ${locSeeded} location entries (PROD + UAT)`);

  console.log('[seed] Done!');
}

main()
  .catch((e) => { console.error('[seed] Error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
