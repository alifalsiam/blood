import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const supabaseKeyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);

if (supabaseUrlMatch && supabaseKeyMatch) {
  const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());
  supabase.from('site_settings').select('config_json').eq('id', 'global_config').single().then(({data}) => console.log('config_json keys:', data && data.config_json ? Object.keys(data.config_json) : 'no config_json'));
}
