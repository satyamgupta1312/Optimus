const { Client } = require('pg');

const regions = ['ap-south-1', 'ap-southeast-1', 'us-east-1', 'eu-west-1', 'us-west-1', 'eu-central-1'];
const ref = 'rmgdvpbksgoidfjjyzzx';
const password = 'Satyam@546#';

async function tryRegion(region) {
  const client = new Client({
    host: `aws-0-${region}.pooler.supabase.com`,
    port: 5432,
    database: 'postgres',
    user: `postgres.${ref}`,
    password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return region;
  } catch (e) {
    try { await client.end(); } catch {}
    return null;
  }
}

Promise.all(regions.map(tryRegion)).then(results => {
  const found = results.filter(Boolean);
  if (found.length > 0) {
    console.log('Found region:', found[0]);
  } else {
    console.log('No region worked. Trying direct connection...');
  }
});
