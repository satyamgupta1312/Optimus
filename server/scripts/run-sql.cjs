const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'aws-0-ap-south-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.rmgdvpbksgoidfjjyzzx',
  password: 'Satyam@546#',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase Postgres');

  const sql = fs.readFileSync('server/scripts/supabase-migration.sql', 'utf-8');

  // Remove comment-only lines, split by semicolons
  const clean = sql.replace(/--.*$/gm, '');
  const statements = clean.split(';').map(s => s.trim()).filter(s => s.length > 5);

  for (const stmt of statements) {
    try {
      await client.query(stmt);
      const preview = stmt.replace(/\s+/g, ' ').substring(0, 70);
      console.log('OK:', preview);
    } catch (err) {
      console.error('ERR:', err.message);
      console.error('    Statement:', stmt.substring(0, 80));
    }
  }

  await client.end();
  console.log('\nAll tables created!');
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
