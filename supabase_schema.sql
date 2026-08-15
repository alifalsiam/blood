-- Supabase Schema for LifeDrop Database

-- 1. PROFILES TABLE (User Accounts, Donors & Receivers)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(20) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(30) UNIQUE NOT NULL,
  emergency_contact VARCHAR(30) NOT NULL,
  address TEXT NOT NULL,
  division VARCHAR(100) NOT NULL,
  district VARCHAR(100) NOT NULL,
  blood_group VARCHAR(10) NOT NULL,
  weight NUMERIC(5,2),
  sex VARCHAR(20),
  dob DATE,
  role VARCHAR(50) DEFAULT 'Donor' NOT NULL CHECK (role IN ('Donor', 'Receiver', 'Volunteer', 'Admin', 'Super Admin')),
  avatar_url TEXT,
  cover_url TEXT,
  total_donations INT DEFAULT 0 CHECK (total_donations >= 0),
  last_donated_date DATE,
  last_donated_at TIMESTAMPTZ,
  online_status VARCHAR(20) DEFAULT 'Online' NOT NULL CHECK (online_status IN ('Online', 'Offline', 'Busy', 'Away')),
  is_logged_in BOOLEAN DEFAULT FALSE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Verified', 'Banned')),
  rating NUMERIC(2,1) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BLOOD REQUESTS
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blood_type VARCHAR(10) NOT NULL,
  hospital_name VARCHAR(255) NOT NULL,
  hospital_location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  qty_whole INT DEFAULT 0,
  qty_platelets INT DEFAULT 0,
  qty_plasma INT DEFAULT 0,
  qty_double_red INT DEFAULT 0,
  reason_needed TEXT,
  needed_in_hours INT NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'cancelled')),
  match_stage VARCHAR(30) DEFAULT 'broadcast' CHECK (match_stage IN ('broadcast', 'donor_interested', 'contact_shared', 'receiver_confirmed', 'donor_completed', 'rating_submitted')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DONOR MATCHES (Tracks workflow state between Donor & Receiver)
CREATE TABLE IF NOT EXISTS public.donor_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  distance_km DOUBLE PRECISION,
  state VARCHAR(30) DEFAULT 'pending' CHECK (state IN ('pending', 'interested', 'declined', 'approved', 'arrival_pending', 'arrival_confirmed', 'review', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(request_id, donor_id)
);

-- 4. SITE SETTINGS
CREATE TABLE IF NOT EXISTS public.site_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'global_config',
  company_name VARCHAR(255),
  logo_symbol VARCHAR(50),
  logo_url TEXT,
  favicon_url TEXT,
  og_image_url TEXT,
  logo_display_mode VARCHAR(20) DEFAULT 'both',
  tagline VARCHAR(255),
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT,
  analytics_id VARCHAR(50),
  meta_pixel_id VARCHAR(50),
  maintenance_mode BOOLEAN DEFAULT FALSE,
  announcement_active BOOLEAN DEFAULT FALSE,
  announcement_text TEXT,
  emergency_hotline VARCHAR(50),
  radar_radius_km INT DEFAULT 25,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: Ensure realtime is enabled for these tables in the Supabase Dashboard.
