'use server'

import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/admin'

function randomPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export type AddEmployeeResult =
  | { success: true; temporaryPassword: string }
  | { success: false; error: string }

export type UpdateEmployeeResult =
  | { success: true }
  | { success: false; error: string }

export type DeleteEmployeeResult =
  | { success: true }
  | { success: false; error: string }

export type ResetPasswordResult =
  | { success: true; temporaryPassword: string }
  | { success: false; error: string }

export async function addEmployee(formData: FormData): Promise<AddEmployeeResult> {
  const email = (formData.get('email') as string)?.trim()
  const fullName = (formData.get('fullName') as string)?.trim()
  const role = (formData.get('role') as string)?.trim()

  if (!email || !fullName || !role) {
    return { success: false, error: 'Email, full name, and role are required.' }
  }
  if (role !== 'admin' && role !== 'employee') {
    return { success: false, error: 'Role must be admin or employee.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const { data: myEmployee } = await supabase
    .from('employees')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!myEmployee?.company_id || myEmployee.role !== 'admin') {
    return { success: false, error: 'Only admins can add employees.' }
  }

  const temporaryPassword = randomPassword()

  const admin = createAdminClient()
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
  })

  if (createError) {
    return { success: false, error: createError.message }
  }
  if (!newUser.user?.id) {
    return { success: false, error: 'Failed to create user.' }
  }

  const { error: insertError } = await admin.from('employees').insert({
    company_id: myEmployee.company_id,
    user_id: newUser.user.id,
    full_name: fullName,
    email,
    role: role as 'admin' | 'employee',
  })

  if (insertError) {
    return { success: false, error: insertError.message }
  }

  return { success: true, temporaryPassword }
}

export async function updateEmployee(employeeId: string, formData: FormData): Promise<UpdateEmployeeResult> {
  const fullName = (formData.get('fullName') as string)?.trim()
  const role = (formData.get('role') as string)?.trim()

  if (!fullName || !role) {
    return { success: false, error: 'Full name and role are required.' }
  }
  if (role !== 'admin' && role !== 'employee') {
    return { success: false, error: 'Role must be admin or employee.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const { data: myEmployee } = await supabase
    .from('employees')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!myEmployee?.company_id || myEmployee.role !== 'admin') {
    return { success: false, error: 'Only admins can update employees.' }
  }

  const { error: updateError } = await supabase
    .from('employees')
    .update({
      full_name: fullName,
      role: role as 'admin' | 'employee',
    })
    .eq('id', employeeId)
    .eq('company_id', myEmployee.company_id)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true }
}

export async function deleteEmployee(employeeId: string): Promise<DeleteEmployeeResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const { data: myEmployee } = await supabase
    .from('employees')
    .select('company_id, role, id')
    .eq('user_id', user.id)
    .single()

  if (!myEmployee?.company_id || myEmployee.role !== 'admin') {
    return { success: false, error: 'Only admins can delete employees.' }
  }

  // Prevent deleting yourself
  if (employeeId === myEmployee.id) {
    return { success: false, error: 'You cannot delete yourself.' }
  }

  const { error: deleteError } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId)
    .eq('company_id', myEmployee.company_id)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  return { success: true }
}

export async function resetEmployeePassword(employeeId: string): Promise<ResetPasswordResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const { data: myEmployee } = await supabase
    .from('employees')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  if (!myEmployee?.company_id || myEmployee.role !== 'admin') {
    return { success: false, error: 'Only admins can reset passwords.' }
  }

  // Get the employee's user_id
  const { data: targetEmployee } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', employeeId)
    .single()

  if (!targetEmployee?.user_id) {
    return { success: false, error: 'Employee not found.' }
  }

  const temporaryPassword = randomPassword()
  const admin = createAdminClient()

  const { error: updateError } = await admin.auth.admin.updateUserById(
    targetEmployee.user_id,
    { password: temporaryPassword }
  )

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  return { success: true, temporaryPassword }
}
