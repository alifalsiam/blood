const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await client.connect();
  try {
    const res = await client.query("SELECT full_name, email, role, online_status, is_logged_in, latitude, longitude FROM profiles");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
