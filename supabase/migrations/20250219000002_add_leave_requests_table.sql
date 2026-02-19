-- Add leave requests table
-- Run in Supabase SQL Editor

CREATE TYPE leave_type AS ENUM ('annual', 'sick', 'personal', 'unpaid');

CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leave_requests_company_id ON public.leave_requests(company_id);
CREATE INDEX idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_leave_requests_dates ON public.leave_requests(start_date, end_date);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Employees can view own requests; admins can view company requests"
  ON public.leave_requests FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = leave_requests.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

CREATE POLICY "Employees can create own requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can cancel own pending requests"
  ON public.leave_requests FOR UPDATE
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    AND status = 'cancelled'
  );

CREATE POLICY "Admins can approve/reject requests"
  ON public.leave_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = leave_requests.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = leave_requests.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
    AND status IN ('approved', 'rejected')
  );

CREATE POLICY "Admins can delete requests"
  ON public.leave_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = leave_requests.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  );
