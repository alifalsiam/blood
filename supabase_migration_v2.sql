-- =====================================================================
-- LifeDrop Blood Network - Supabase Production Migration v2
-- Run this ONCE in your Supabase SQL Editor before deploying.
-- =====================================================================

-- 1. Add config_json to site_settings (stores full SiteConfig blob)
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS config_json JSONB;

-- 2. Add missing columns to blood_requests
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS user_email TEXT;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS user_phone TEXT;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS match_stage TEXT DEFAULT 'broadcast';
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS matched_donors TEXT DEFAULT '[]';
ALTER TABLE public.blood_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. blood_banks updated_at
ALTER TABLE public.blood_banks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Seed global_config row
INSERT INTO public.site_settings (id, company_name, tagline, emergency_hotline, config_json, updated_at)
VALUES (
  'global_config', 'LifeDrop Blood Network', 'Saving Lives, One Drop at a Time', '999 / 16263',
  '{"announcementActive":false,"announcementText":"","banned_users":[],"deleted_users":[],"admin_accounts":[]}'::jsonb, NOW()
) ON CONFLICT (id) DO NOTHING;
