import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const supabaseKeyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);

if (supabaseUrlMatch && supabaseKeyMatch) {
  const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());
  supabase.from('emergency_contacts').select('*').then(({data, error}) => {
     console.log('Emergency Contacts (Anon Key):', data?.length, error);
  });
  supabase.from('blood_banks').select('*').then(({data, error}) => {
     console.log('Blood Banks (Anon Key):', data?.length, error);
  });
}
