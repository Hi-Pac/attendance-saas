-- Add email to employees for display and when creating new employees.
-- Run in Supabase SQL Editor if you already applied the main schema.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing rows: optional (auth.users email not easily joinable from public).
-- UPDATE public.employees SET email = '...' WHERE ...;
-- For new inserts, always set email.
