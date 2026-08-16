import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const supabaseKeyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);

if (supabaseUrlMatch && supabaseKeyMatch) {
  const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());
  
  async function test() {
    const contacts = [
      {
        id: 'ec-' + Date.now(),
        title: 'Test Contact',
        number: '123',
        tel: 'tel:123',
        icon: '📞',
        category: 'Medical',
        updated_at: new Date().toISOString()
      }
    ];
    
    // Simulate what AdminDashboardBlock and AuthContext do
    // 1. Delete all
    const { error: delErr } = await supabase.from('emergency_contacts').delete().neq('id', '___no_match___');
    console.log('Delete Error:', delErr);
    
    // 2. Insert
    const { error: insErr } = await supabase.from('emergency_contacts').insert(contacts);
    console.log('Insert Error:', insErr);
  }
  
  test();
}
