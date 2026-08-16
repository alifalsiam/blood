-- =====================================================================
-- LifeDrop Blood Network — Supabase Production Migration v4
-- Add missing columns for manual donation logging.
-- Run this ONCE in your Supabase SQL Editor.
-- =====================================================================

ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS hospital_name VARCHAR(255);
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS hospital_address TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS donation_date DATE;

-- Add DELETE policy for donations (so users can delete their manual logs)
DROP POLICY IF EXISTS "Anyone can delete donations" ON public.donations;
CREATE POLICY "Anyone can delete donations"
ON public.donations FOR DELETE USING (true);
