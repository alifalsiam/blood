const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await client.connect();
  try {
    const res = await client.query("SELECT pg_get_viewdef('public_profiles', true)");
    console.log(res.rows[0].pg_get_viewdef);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
