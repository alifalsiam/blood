import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zeyrtbbrlumvlmxomens.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleXJ0YmJybHVtdmxteG9tZW5zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjM4MDY3NSwiZXhwIjoyMTAxOTU2Njc1fQ._2njSXamp3keRLTrC8FVLu_zYs4iKVVeBbFqu-R1p6w';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabaseAdmin.from('blood_requests').select('*').limit(1);
  console.log('blood_requests:', data);
}

check();
