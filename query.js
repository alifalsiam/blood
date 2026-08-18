const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres'
});
async function run() {
  await client.connect();
  const res = await client.query("SELECT pg_trigger.tgname, pg_proc.prosrc FROM pg_trigger JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid WHERE pg_class.relname IN ('users', 'profiles');");
  console.log(res.rows);
  await client.end();
}
run().catch(console.error);
