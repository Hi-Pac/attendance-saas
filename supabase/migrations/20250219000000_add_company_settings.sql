-- Add company settings fields
-- Run in Supabase SQL Editor

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS work_start_time TIME DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS work_end_time TIME DEFAULT '17:00:00',
  ADD COLUMN IF NOT EXISTS allowed_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS allowed_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS allowed_radius_meters INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS late_threshold_minutes INTEGER DEFAULT 15;
