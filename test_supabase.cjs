const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://zeyrtbbrlumvlmxomens.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleXJ0YmJybHVtdmxteG9tZW5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzODA2NzUsImV4cCI6MjEwMTk1NjY3NX0.7RPdtL5Gvv-rAalR7QizhKl_WAEEVfz1H8fnsktw5ik'
);

async function test() {
  const req = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    receiver_id: null,
    user_email: 'test@example.com',
    user_name: 'Test',
    user_phone: '1234567890',
    blood_type: 'A+',
    hospital_name: 'Test Hospital',
    hospital_location: 'Test Location',
    latitude: 0,
    longitude: 0,
    qty_whole: 1,
    qty_platelets: 0,
    qty_plasma: 0,
    qty_double_red: 0,
    reason_needed: 'Test',
    needed_in_hours: 4,
    status: 'active',
    cancel_reason: null,
    match_stage: 'broadcast',
    selected_donor_id: null,
    matched_donors: JSON.stringify([]),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('blood_requests').upsert(req);
  if (error) {
    console.error('Test Error:', error);
  } else {
    console.log('Test Success:', data);
    await supabase.from('blood_requests').delete().eq('id', req.id);
  }
}
test();
