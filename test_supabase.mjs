import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const supabaseUrlMatch = envFile.match(/VITE_SUPABASE_URL=([^\n]+)/);
const supabaseKeyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY=([^\n]+)/);

if (supabaseUrlMatch && supabaseKeyMatch) {
  const supabase = createClient(supabaseUrlMatch[1].trim(), supabaseKeyMatch[1].trim());
  
  async function test() {
    console.log("Testing Emergency Contacts...");
    const { data: ecData, error: ecError } = await supabase.from('emergency_contacts').select('*');
    console.log('Emergency Contacts Read:', ecError ? ecError : ecData?.length + " rows");

    console.log("Testing Blood Banks Upsert...");
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
    console.log('Blood Banks Upsert Error:', bbError || 'Success');

    console.log("Testing Emergency Contacts Insert...");
    const { error: ecInsError } = await supabase.from('emergency_contacts').upsert({
      id: 'test-ec',
      title: 'Test EC',
      number: '123',
      tel: 'tel:123',
      icon: '📞',
      category: 'Medical'
    });
    console.log('Emergency Contacts Insert Error:', ecInsError || 'Success');

    if (ecInsError == null) {
        await supabase.from('emergency_contacts').delete().eq('id', 'test-ec');
    }
    if (bbError == null) {
        await supabase.from('blood_banks').delete().eq('id', 'test-bb');
    }
  }
  
  test();
} else {
  console.log('Env variables not found');
}
