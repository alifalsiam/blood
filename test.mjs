import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const supabaseUrlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const supabaseKeyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);

if (supabaseUrlMatch && supabaseKeyMatch) {
  const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());
  
  async function test() {
    const { error: bbError } = await supabase.from('blood_banks').upsert({
      id: 'test-bb',
      name: 'Test BB',
      division: 'Dhaka Division',
      district: 'Dhaka',
      phone: '01234567890',
      address: 'Test Address',
      latitude: null,
      longitude: null,
      distance_km: 0
    });
    console.log('Blood Banks Upsert Error:', bbError);
    if (!bbError) await supabase.from('blood_banks').delete().eq('id', 'test-bb');

    const { error: ecInsError } = await supabase.from('emergency_contacts').upsert({
      id: 'test-ec',
      title: 'Test EC',
      number: '123',
      tel: 'tel:123',
      icon: '📞',
      category: 'Medical'
    });
    console.log('Emergency Contacts Upsert Error:', ecInsError);
    if (!ecInsError) await supabase.from('emergency_contacts').delete().eq('id', 'test-ec');
  }
  
  test();
} else {
  console.log('Env variables not found');
}
