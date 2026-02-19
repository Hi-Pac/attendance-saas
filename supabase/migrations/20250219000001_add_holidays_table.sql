-- Add holidays table for company-specific holidays
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, date)
);

CREATE INDEX idx_holidays_company_id ON public.holidays(company_id);
CREATE INDEX idx_holidays_date ON public.holidays(date);

-- Enable RLS
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view company holidays"
  ON public.holidays FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = holidays.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert holidays"
  ON public.holidays FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = holidays.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

CREATE POLICY "Admins can update holidays"
  ON public.holidays FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = holidays.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = holidays.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete holidays"
  ON public.holidays FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = holidays.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  );
