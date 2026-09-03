const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

function isBloodCompatible(donorGroup, receiverGroup) {
  if (!donorGroup || !receiverGroup) return true;
  const d = donorGroup.trim().toUpperCase();
  const r = receiverGroup.trim().toUpperCase();
  if (d === 'O-') return true;
  if (r === 'AB+') return true;
  const compatibilityMap = {
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'A-': ['O-', 'A-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'B-': ['O-', 'B-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'O+': ['O-', 'O+'],
    'O-': ['O-']
  };
  return compatibilityMap[r]?.includes(d) || false;
}

async function run() {
  await client.connect();
  try {
    const res = await client.query("SELECT * FROM profiles WHERE online_status = 'Online' AND role = 'Donor'");
    const dbUsers = res.rows;
    
    const user = { email: 'onirbansiam540@gmail.com' };
    const reqData = { bloodType: 'A+' };
    
    let initialMatchedDonors = dbUsers
      .filter((u) => 
        u.email?.toLowerCase() !== user.email?.toLowerCase() &&
        isBloodCompatible(u.blood_group || 'A+', reqData.bloodType)
      )
      .map((u) => {
        return {
          id: u.id || u.email,
          name: u.full_name || 'Anonymous Donor',
          bloodGroup: u.blood_group || 'A+'
        };
      });
      
    console.log("Matched Donors:", initialMatchedDonors);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
