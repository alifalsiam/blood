const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await client.connect();
  const res = await client.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'profiles_phone_emergency_diff_check';");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
