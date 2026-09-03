const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://aws-0-ap-southeast-2.pooler.supabase.com';
const supabaseKey = process.env.SUPABASE_KEY || 'dummy'; // Will use a direct pg query to test uuid error

const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      INSERT INTO blood_requests (id, receiver_id, user_email, user_name, user_phone, blood_type, hospital_name, hospital_location, latitude, longitude, qty_whole, qty_platelets, qty_plasma, qty_double_red, reason_needed, needed_in_hours, status, match_stage, matched_donors, expires_at)
      VALUES ('req-123', null, 'test@test.com', 'test', '123', 'A+', 'H', 'L', 0, 0, 1, 0, 0, 0, 'reason', 4, 'active', 'broadcast', '[]', NOW())
    `);
    console.log("Success");
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}
run();
