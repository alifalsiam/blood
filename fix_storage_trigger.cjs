const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.zeyrtbbrlumvlmxomens:ZBiWvNvEBsR9vSbZ@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  
  try {
    const query = `
      CREATE OR REPLACE FUNCTION public.fn_cleanup_replaced_storage_asset()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url 
           AND OLD.avatar_url IS NOT NULL 
           AND OLD.avatar_url LIKE '%supabase.co/storage/%' THEN
          INSERT INTO public.storage_assets (user_id, asset_type, file_path, url)
          VALUES (NEW.id, 'avatar', 'cleanup_queue', OLD.avatar_url);
        END IF;
        
        IF OLD.cover_url IS DISTINCT FROM NEW.cover_url 
           AND OLD.cover_url IS NOT NULL 
           AND OLD.cover_url LIKE '%supabase.co/storage/%' THEN
          INSERT INTO public.storage_assets (user_id, asset_type, file_path, url)
          VALUES (NEW.id, 'cover', 'cleanup_queue', OLD.cover_url);
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await client.query(query);
    console.log('Trigger function updated successfully!');

    // Also delete the existing digital waste (rows that don't match supabase.co)
    const cleanupQuery = `
      DELETE FROM public.storage_assets
      WHERE url NOT LIKE '%supabase.co/storage/%' OR url IS NULL;
    `;
    const res = await client.query(cleanupQuery);
    console.log(`Cleaned up ${res.rowCount} digital waste rows from storage_assets.`);
    
  } catch (err) {
    console.error('Error updating trigger:', err);
  } finally {
    await client.end();
  }
}

run();
