'use server'

import { createClient } from '@/lib/supabase/server'

type Geo = { latitude: number; longitude: number }

export type CheckResult =
  | { success: true }
  | { success: false; error: string }

async function getMyEmployee(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not logged in.' as const }

  const { data: emp, error } = await supabase
    .from('employees')
    .select('id, company_id, role')
    .eq('user_id', user.id)
    .single()

  if (error || !emp) return { error: error?.message ?? 'Employee not found.' as const }
  return { emp }
}

export async function checkIn(geo?: Geo): Promise<CheckResult> {
  const supabase = await createClient()
  const me = await getMyEmployee(supabase)
  if ('error' in me) return { success: false, error: me.error }

  const now = new Date().toISOString()
  const latitude = geo?.latitude ?? 0
  const longitude = geo?.longitude ?? 0

  const { error } = await supabase.from('attendance_records').insert({
    employee_id: me.emp.id,
    check_in_time: now,
    latitude,
    longitude,
    status: 'present',
  })

  if (error) {
    // ده غالبًا هيبقى duplicate unique constraint
    if (error.message.toLowerCase().includes('duplicate')) {
      return { success: false, error: 'You already checked in today.' }
    }
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function checkOut(geo?: Geo): Promise<CheckResult> {
  const supabase = await createClient()
  const me = await getMyEmployee(supabase)
  if ('error' in me) return { success: false, error: me.error }

  const now = new Date().toISOString()
  const latitude = geo?.latitude ?? 0
  const longitude = geo?.longitude ?? 0

  // Update the open record (no checkout yet)
  const { data, error } = await supabase
    .from('attendance_records')
    .update({
      check_out_time: now,
      latitude,   // (اختياري) لو عايز تحفظ مكان الخروج بدل الدخول فقط
      longitude,
    })
    .eq('employee_id', me.emp.id)
    .is('check_out_time', null)
    .select('id')
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  if (!data) return { success: false, error: 'No open check-in found to check out.' }

  return { success: true }
}
