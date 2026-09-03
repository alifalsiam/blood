const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      INSERT INTO blood_requests (id, receiver_id, user_email, user_name, user_phone, blood_type, hospital_name, hospital_location, latitude, longitude, qty_whole, qty_platelets, qty_plasma, qty_double_red, reason_needed, needed_in_hours, status, cancel_reason, match_stage, selected_donor_id, matched_donors, created_at, expires_at, updated_at) 
      VALUES ('123e4567-e89b-12d3-a456-426614174000', null, 'test@test.com', 'test', '1234', 'A+', 'hospital', 'location', 0, 0, 1, 0, 0, 0, 'reason', 4, 'active', null, 'broadcast', null, '[]'::jsonb, NOW(), NOW() + interval '4 hours', NOW()) RETURNING id
    `);
    console.log('Inserted:', res.rows);
    await client.query(`DELETE FROM blood_requests WHERE id = '123e4567-e89b-12d3-a456-426614174000'`);
  } catch (err) {
    console.error('Insert Error:', err.message);
  } finally {
    await client.end();
  }
}
run();
