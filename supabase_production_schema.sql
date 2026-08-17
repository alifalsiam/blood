-- =====================================================================
-- LifeDrop Blood Network - Production Database Schema & SQL Setup
-- Target Platform: Supabase / PostgreSQL
-- =====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. CLEAN-UP EXISTING DATA (Production Reset)
-- Safely wipes existing test/demo tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'donations') THEN
    TRUNCATE TABLE public.donations CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'blood_requests') THEN
    TRUNCATE TABLE public.blood_requests CASCADE;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'storage_assets') THEN
    TRUNCATE TABLE public.storage_assets CASCADE;
  END IF;
END $$;
-- TRUNCATE TABLE public.profiles CASCADE; -- Optional: Uncomment if wiping user profiles

-- 3. PROFILES TABLE (User Accounts, Donors & Receivers)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(20) UNIQUE NOT NULL, -- Format: RD982745
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(30) UNIQUE NOT NULL,
  emergency_contact VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  division VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  blood_group VARCHAR(10) NOT NULL, -- A+, A-, B+, B-, AB+, AB-, O+, O-
  weight NUMERIC(5,2),
  sex VARCHAR(20),
  dob DATE,
  role VARCHAR(50) DEFAULT 'Donor' NOT NULL CHECK (role IN ('Donor', 'Receiver', 'Volunteer', 'Admin', 'Super Admin')),
  avatar_url TEXT,
  cover_url TEXT,
  total_donations INT DEFAULT 0 CHECK (total_donations >= 0),
  last_donated_date DATE, -- AUTOMATED: Calculated on donation completion
  last_donated_at TIMESTAMPTZ, -- AUTOMATED: Calculated timestamp on donation completion
  online_status VARCHAR(20) DEFAULT 'Online' NOT NULL CHECK (online_status IN ('Online', 'Offline', 'Busy', 'Away')),
  is_logged_in BOOLEAN DEFAULT FALSE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Verified', 'Banned')),
  rating NUMERIC(2,1) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT profiles_phone_emergency_diff_check CHECK (phone IS NULL OR emergency_contact IS NULL OR phone = 'N/A' OR emergency_contact = 'N/A' OR phone <> emergency_contact)
);

-- Migration / Safety ALTER TABLE commands for existing database tables
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(30);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Donor' NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_donated_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS online_status VARCHAR(20) DEFAULT 'Online' NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_logged_in BOOLEAN DEFAULT FALSE NOT NULL;

-- Backwards-compatibility data migration for legacy column names
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_number') THEN
    EXECUTE 'UPDATE public.profiles SET phone = phone_number WHERE phone IS NULL AND phone_number IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'emergency_contact_number') THEN
    EXECUTE 'UPDATE public.profiles SET emergency_contact = emergency_contact_number WHERE emergency_contact IS NULL AND emergency_contact_number IS NOT NULL';
  END IF;
END $$;

DO $$
BEGIN
  -- Unique constraint on email
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
  END IF;

  -- Unique constraint on phone
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_key') THEN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
    END IF;
  END IF;

  -- Check constraint ensuring Whatsapp phone and emergency contact are not identical
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'emergency_contact') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_phone_emergency_diff_check') THEN
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_emergency_diff_check CHECK (phone IS NULL OR emergency_contact IS NULL OR phone = 'N/A' OR emergency_contact = 'N/A' OR phone <> emergency_contact);
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('Donor', 'Receiver', 'Volunteer', 'Admin', 'Super Admin'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_online_status_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_online_status_check CHECK (online_status IN ('Online', 'Offline', 'Busy', 'Away'));
  END IF;
END $$;

-- 4. BLOOD REQUESTS TABLE (Emergency Radar Requests)
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_type VARCHAR(10) NOT NULL,
  hospital_name VARCHAR(255) NOT NULL,
  hospital_location TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  qty_whole INT DEFAULT 0,
  qty_platelets INT DEFAULT 0,
  qty_plasma INT DEFAULT 0,
  qty_double_red INT DEFAULT 0,
  reason_needed TEXT,
  needed_in_hours INT DEFAULT 4,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  match_stage VARCHAR(30) DEFAULT 'broadcast',
  selected_donor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 5. DONATIONS TABLE (Donation History & Verification Records)
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  rating NUMERIC(2,1) CHECK (rating >= 1.0 AND rating <= 5.0),
  review TEXT,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. STORAGE ASSETS HYGIENE TABLE (File Tracking & Deletion Log)
CREATE TABLE IF NOT EXISTS public.storage_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  asset_type VARCHAR(20) CHECK (asset_type IN ('avatar', 'cover', 'doc')),
  file_path TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BLOOD BANKS DIRECTORY TABLE
CREATE TABLE IF NOT EXISTS public.blood_banks (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  division VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  phones JSONB DEFAULT '[]'::jsonb,
  address TEXT NOT NULL,
  map_url TEXT,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  distance_km NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EMERGENCY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  number VARCHAR(50) NOT NULL,
  tel VARCHAR(60) NOT NULL,
  icon VARCHAR(20) DEFAULT '📞',
  category VARCHAR(100) DEFAULT 'Medical',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SITE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.site_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'global_config',
  company_name VARCHAR(255),
  tagline TEXT,
  emergency_hotline VARCHAR(50) DEFAULT '999 / 16263',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SUPPORT TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(100),
  user_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  message TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved', 'Closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 11. AUTOMATED TIMERS & CALCULATIONS (Triggers & Functions)
-- =====================================================================

-- AUTOMATED RULE: "last date of donation" MUST NOT be manually entered.
-- Automatically calculates & updates last_donated_date, last_donated_at and increments total_donations
CREATE OR REPLACE FUNCTION public.fn_auto_calculate_donor_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' THEN
    UPDATE public.profiles
    SET 
      last_donated_date = CURRENT_DATE,
      last_donated_at = NOW(),
      total_donations = total_donations + 1,
      updated_at = NOW()
    WHERE id = NEW.donor_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_calculate_donor_stats ON public.donations;
CREATE TRIGGER trg_auto_calculate_donor_stats
AFTER INSERT OR UPDATE ON public.donations
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_calculate_donor_stats();

-- AUTOMATED RULE: Clean up old image files when replaced in storage
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

DROP TRIGGER IF EXISTS trg_cleanup_replaced_storage_asset ON public.profiles;
CREATE TRIGGER trg_cleanup_replaced_storage_asset
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.fn_cleanup_replaced_storage_asset();

-- =====================================================================
-- 12. INDEXES FOR HIGH-PERFORMANCE 25KM RADAR & DIRECTORY SEARCH
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_profiles_blood_group ON public.profiles(blood_group);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_location ON public.blood_requests(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_banks_division ON public.blood_banks(division);
CREATE INDEX IF NOT EXISTS idx_blood_banks_district ON public.blood_banks(district);

-- =====================================================================
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_assets ENABLE ROW LEVEL SECURITY;

-- Storage Assets: Allow triggers running as authenticated users to log assets
DROP POLICY IF EXISTS "Enable insert for authenticated users on storage_assets" ON public.storage_assets;
CREATE POLICY "Enable insert for authenticated users on storage_assets"
ON public.storage_assets FOR INSERT TO authenticated WITH CHECK (true);

-- Profiles: Publicly viewable and writeable for user registration & management
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by all" ON public.profiles;
CREATE POLICY "Profiles are viewable by all" 
ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert profile" ON public.profiles;
CREATE POLICY "Anyone can insert profile" 
ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can update profile" ON public.profiles;
CREATE POLICY "Anyone can update profile" 
ON public.profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete profile" ON public.profiles;
CREATE POLICY "Anyone can delete profile"
ON public.profiles FOR DELETE USING (true);

-- Requests: Viewable by all active donors, editable by receiver
DROP POLICY IF EXISTS "Blood requests are viewable by all" ON public.blood_requests;
CREATE POLICY "Blood requests are viewable by all" 
ON public.blood_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Receivers can create blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Anyone can create blood requests" ON public.blood_requests;
CREATE POLICY "Anyone can create blood requests" 
ON public.blood_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Receivers can update own blood request" ON public.blood_requests;
DROP POLICY IF EXISTS "Anyone can update blood requests" ON public.blood_requests;
CREATE POLICY "Anyone can update blood requests" 
ON public.blood_requests FOR UPDATE USING (true);

-- Donations
DROP POLICY IF EXISTS "Donations are viewable by all" ON public.donations;
CREATE POLICY "Donations are viewable by all"
ON public.donations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert donations" ON public.donations;
CREATE POLICY "Anyone can insert donations"
ON public.donations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update donations" ON public.donations;
CREATE POLICY "Anyone can update donations"
ON public.donations FOR UPDATE USING (true);

-- Blood Banks
DROP POLICY IF EXISTS "Blood banks are viewable by all" ON public.blood_banks;
CREATE POLICY "Blood banks are viewable by all"
ON public.blood_banks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert blood banks" ON public.blood_banks;
CREATE POLICY "Anyone can insert blood banks"
ON public.blood_banks FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update blood banks" ON public.blood_banks;
CREATE POLICY "Anyone can update blood banks"
ON public.blood_banks FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete blood banks" ON public.blood_banks;
CREATE POLICY "Anyone can delete blood banks"
ON public.blood_banks FOR DELETE USING (true);

-- Emergency Contacts
DROP POLICY IF EXISTS "Emergency contacts are viewable by all" ON public.emergency_contacts;
CREATE POLICY "Emergency contacts are viewable by all"
ON public.emergency_contacts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Anyone can insert emergency contacts"
ON public.emergency_contacts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Anyone can update emergency contacts"
ON public.emergency_contacts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Anyone can delete emergency contacts"
ON public.emergency_contacts FOR DELETE USING (true);

-- Site Settings
DROP POLICY IF EXISTS "Site settings viewable by all" ON public.site_settings;
CREATE POLICY "Site settings viewable by all"
ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update site settings" ON public.site_settings;
CREATE POLICY "Anyone can update site settings"
ON public.site_settings FOR ALL USING (true);

-- Support Tickets
DROP POLICY IF EXISTS "Support tickets viewable by all" ON public.support_tickets;
CREATE POLICY "Support tickets viewable by all"
ON public.support_tickets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert support tickets" ON public.support_tickets;
CREATE POLICY "Anyone can insert support tickets"
ON public.support_tickets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update support tickets" ON public.support_tickets;
CREATE POLICY "Anyone can update support tickets"
ON public.support_tickets FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Anyone can delete support tickets" ON public.support_tickets;
CREATE POLICY "Anyone can delete support tickets"
ON public.support_tickets FOR DELETE USING (true);

-- =====================================================================
-- 12. ENABLE REALTIME PUBLICATION FOR SITE SETTINGS & OTHER TABLES
-- =====================================================================
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.blood_banks, public.blood_requests, public.profiles, public.emergency_contacts, public.site_settings, public.support_tickets;

-- =====================================================================
-- 13. ENABLE STORAGE BUCKET & RLS POLICIES FOR IMAGE UPLOADS
-- =====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read access to brand-assets" ON storage.objects;
CREATE POLICY "Allow public read access to brand-assets" ON storage.objects FOR SELECT USING (bucket_id = 'brand-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public uploads to brand-assets" ON storage.objects;
CREATE POLICY "Allow public uploads to brand-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'brand-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public updates to brand-assets" ON storage.objects;
CREATE POLICY "Allow public updates to brand-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'brand-assets' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public deletes from brand-assets" ON storage.objects;
CREATE POLICY "Allow public deletes from brand-assets" ON storage.objects FOR DELETE USING (bucket_id = 'brand-assets' AND auth.role() = 'authenticated');

-- =====================================================================
-- END OF PRODUCTION SQL SCRIPT
-- =====================================================================

-- Ads Table (Sponsorships & Ads)
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placement VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT false,
    pc_image_url TEXT,
    mobile_image_url TEXT,
    link_url TEXT,
    title VARCHAR(255),
    button_text VARCHAR(100),
    auto_slide_ms INT DEFAULT 5000,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active ads" ON public.ads FOR SELECT USING (true);
CREATE POLICY "Admins can manage ads" ON public.ads FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_accounts 
    WHERE admin_accounts.email = auth.jwt()->>'email'
  )
);
