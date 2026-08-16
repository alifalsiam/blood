import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const supabaseKeyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);

if (supabaseUrlMatch && supabaseKeyMatch) {
  const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());
  supabase.from('emergency_contacts').select('*').then(({data}) => console.log('Contacts in DB:', data));
  supabase.from('blood_banks').select('*').limit(1).then(({data}) => console.log('Banks in DB:', data));
}
