const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});
async function run() {
  await client.connect();
  const res = await client.query(`SELECT id, email, full_name, weight, phone FROM profiles WHERE email = 'quazi@sharif.com';`);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
run();
