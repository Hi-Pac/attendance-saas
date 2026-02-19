-- ============================================================
-- Attendance Management System - Core Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE employee_role AS ENUM ('admin', 'employee');
CREATE TYPE attendance_status AS ENUM ('present', 'late', 'absent');

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Employees (links auth.users to companies; role stored here for RLS)
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role employee_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_employees_company_id ON public.employees(company_id);
CREATE INDEX idx_employees_user_id ON public.employees(user_id);

-- 3. Attendance records
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  check_in_time TIMESTAMPTZ NOT NULL,
  check_out_time TIMESTAMPTZ,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attendance_records_employee_id ON public.attendance_records(employee_id);
CREATE INDEX idx_attendance_records_check_in_time ON public.attendance_records(check_in_time);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
-- SELECT: user must be an employee of that company (admin or employee)
CREATE POLICY "Users can view their company"
  ON public.companies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = companies.id AND e.user_id = auth.uid()
    )
  );

-- INSERT: any authenticated user (for "create company" flow; app will create company + first admin employee)
CREATE POLICY "Authenticated users can create a company"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: only admin of that company
CREATE POLICY "Admins can update their company"
  ON public.companies FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = companies.id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = companies.id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

-- DELETE: only admin of that company
CREATE POLICY "Admins can delete their company"
  ON public.companies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = companies.id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Employees
-- ---------------------------------------------------------------------------
-- SELECT: own row, or admin of the same company
CREATE POLICY "Users can view own row; admins can view company employees"
  ON public.employees FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.employees admin
      WHERE admin.company_id = employees.company_id
        AND admin.user_id = auth.uid()
        AND admin.role = 'admin'
    )
  );

-- INSERT: first employee in a company (self, becomes admin) OR existing admin adding someone
CREATE POLICY "First employee or admin can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() AND NOT EXISTS (
      SELECT 1 FROM public.employees e2 WHERE e2.company_id = employees.company_id
    ))
    OR
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.company_id = employees.company_id AND e.user_id = auth.uid() AND e.role = 'admin'
    )
  );

-- UPDATE: own row (e.g. full_name) or admin of company
CREATE POLICY "Users can update own row; admins can update company employees"
  ON public.employees FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.employees admin
      WHERE admin.company_id = employees.company_id
        AND admin.user_id = auth.uid()
        AND admin.role = 'admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.employees admin
      WHERE admin.company_id = employees.company_id
        AND admin.user_id = auth.uid()
        AND admin.role = 'admin'
    )
  );

-- DELETE: only admin of that company
CREATE POLICY "Admins can delete company employees"
  ON public.employees FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees admin
      WHERE admin.company_id = employees.company_id
        AND admin.user_id = auth.uid()
        AND admin.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Attendance records
-- ---------------------------------------------------------------------------
-- SELECT: employee sees own; admin sees all in their company
CREATE POLICY "Employees see own attendance; admins see company attendance"
  ON public.attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = attendance_records.employee_id AND e.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.employees admin ON admin.company_id = e.company_id AND admin.user_id = auth.uid() AND admin.role = 'admin'
      WHERE e.id = attendance_records.employee_id
    )
  );

-- INSERT: only the employee themselves (check-in)
CREATE POLICY "Employees can insert own attendance"
  ON public.attendance_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = attendance_records.employee_id AND e.user_id = auth.uid()
    )
  );

-- UPDATE: employee can update own record (e.g. check-out); admin can update for corrections
CREATE POLICY "Employees can update own; admins can update company attendance"
  ON public.attendance_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = attendance_records.employee_id AND e.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.employees admin ON admin.company_id = e.company_id AND admin.user_id = auth.uid() AND admin.role = 'admin'
      WHERE e.id = attendance_records.employee_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = attendance_records.employee_id AND e.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.employees admin ON admin.company_id = e.company_id AND admin.user_id = auth.uid() AND admin.role = 'admin'
      WHERE e.id = attendance_records.employee_id
    )
  );

-- DELETE: only admin (for corrections)
CREATE POLICY "Admins can delete company attendance"
  ON public.attendance_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      JOIN public.employees admin ON admin.company_id = e.company_id AND admin.user_id = auth.uid() AND admin.role = 'admin'
      WHERE e.id = attendance_records.employee_id
    )
  );

-- ============================================================
-- Optional: grant usage so anon/authenticated can use tables
-- (Supabase usually sets these; uncomment if needed)
-- ============================================================
-- GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- GRANT ALL ON public.companies TO anon, authenticated;
-- GRANT ALL ON public.employees TO anon, authenticated;
-- GRANT ALL ON public.attendance_records TO anon, authenticated;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
