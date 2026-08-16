-- =====================================================================
-- LifeDrop Blood Network — Supabase Production Migration v3
-- Add missing columns for blood banks.
-- Run this ONCE in your Supabase SQL Editor.
-- =====================================================================

ALTER TABLE public.blood_banks ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,6);
ALTER TABLE public.blood_banks ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,6);
ALTER TABLE public.blood_banks ADD COLUMN IF NOT EXISTS distance_km NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.blood_banks ADD COLUMN IF NOT EXISTS map_url TEXT;
ALTER TABLE public.blood_banks ADD COLUMN IF NOT EXISTS phones JSONB DEFAULT '[]'::jsonb;
