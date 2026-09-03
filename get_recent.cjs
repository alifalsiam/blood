const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    const res = await client.query("SELECT id, receiver_id, status, created_at FROM blood_requests ORDER BY created_at DESC LIMIT 10");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Query Error:', err.message);
  } finally {
    await client.end();
  }
}
run();
