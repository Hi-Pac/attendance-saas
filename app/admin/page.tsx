'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'
import { addEmployee, updateEmployee, deleteEmployee, resetEmployeePassword, type AddEmployeeResult, type UpdateEmployeeResult, type DeleteEmployeeResult, type ResetPasswordResult } from './actions'
import Navbar from '../../components/navbar'

type EmployeeRow = {
  id: string
  full_name: string
  email: string | null
  role: string
}

export default function AdminPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  type AttendanceRow = {
    id: string
    full_name: string
    email: string | null
    check_in_time: string
    check_out_time: string | null
    status: string
  }
  
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<{ message: string; tempPassword?: string } | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null)
  const [showResetPassword, setShowResetPassword] = useState<EmployeeRow | null>(null)
  const [resetPasswordResult, setResetPasswordResult] = useState<{ success: boolean; message: string; tempPassword?: string } | null>(null)
  const [myEmployeeId, setMyEmployeeId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: myEmployee } = await supabase
        .from('employees')
        .select('company_id, role, id')
        .eq('user_id', user.id)
        .single()

      if (!myEmployee?.company_id || myEmployee.role !== 'admin') {
        router.replace('/dashboard')
        return
      }

      setCompanyId(myEmployee.company_id)
      setMyEmployeeId(myEmployee.id)

      const { data: list } = await supabase
        .from('employees')
        .select('id, full_name, email, role')
        .eq('company_id', myEmployee.company_id)
        .order('created_at', { ascending: true })

      const employeeList = (list as EmployeeRow[]) ?? []
      setEmployees(employeeList)

      // Load attendance: query by employee_id only (no join) then merge employee names from list
      const companyEmployeeIds = employeeList.map((e) => e.id)
      const employeeById = new Map(employeeList.map((e) => [e.id, e]))

      if (companyEmployeeIds.length === 0) {
        setAttendance([])
      } else {
        const { data: attendanceList, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('id, employee_id, check_in_time, check_out_time, status')
          .in('employee_id', companyEmployeeIds)
          .order('check_in_time', { ascending: false })

        if (attendanceError) {
          console.error('Attendance fetch error:', attendanceError)
        }

        setAttendance(
          (attendanceList ?? []).map((rec) => {
            const emp = employeeById.get(rec.employee_id)
            return {
              id: rec.id,
              full_name: emp?.full_name ?? 'Unknown',
              email: emp?.email ?? null,
              check_in_time: rec.check_in_time,
              check_out_time: rec.check_out_time,
              status: rec.status,
            }
          })
        )
      }

      setLoading(false)
    }
    load()
  }, [router])

  async function handleAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setFormSuccess(null)
    setFormLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)
    const result: AddEmployeeResult = await addEmployee(formData)

    setFormLoading(false)
    if (result.success) {
      setFormSuccess({
        message: 'Employee added. Share this temporary password (they can change it later):',
        tempPassword: result.temporaryPassword,
      })
      form.reset()
      const supabase = createClient()
      if (companyId) {
        const { data: list } = await supabase
          .from('employees')
          .select('id, full_name, email, role')
          .eq('company_id', companyId)
          .order('created_at', { ascending: true })
        setEmployees((list as EmployeeRow[]) ?? [])
      }
    } else {
      setFormError(result.error)
    }
  }

  async function handleUpdateEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editingEmployee) return

    setFormError(null)
    setFormSuccess(null)
    setFormLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)
    const result: UpdateEmployeeResult = await updateEmployee(editingEmployee.id, formData)

    setFormLoading(false)
    if (result.success) {
      setFormSuccess({ message: 'Employee updated successfully!' })
      setEditingEmployee(null)
      const supabase = createClient()
      if (companyId) {
        const { data: list } = await supabase
          .from('employees')
          .select('id, full_name, email, role')
          .eq('company_id', companyId)
          .order('created_at', { ascending: true })
        setEmployees((list as EmployeeRow[]) ?? [])
      }
    } else {
      setFormError(result.error)
    }
  }

  async function handleDeleteEmployee(employeeId: string) {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return
    }

    setFormError(null)
    setFormSuccess(null)

    const result: DeleteEmployeeResult = await deleteEmployee(employeeId)

    if (result.success) {
      setFormSuccess({ message: 'Employee deleted successfully!' })
      const supabase = createClient()
      if (companyId) {
        const { data: list } = await supabase
          .from('employees')
          .select('id, full_name, email, role')
          .eq('company_id', companyId)
          .order('created_at', { ascending: true })
        setEmployees((list as EmployeeRow[]) ?? [])
      }
    } else {
      setFormError(result.error)
    }
  }

  async function handleResetPassword(employeeId: string) {
    setFormError(null)
    setFormSuccess(null)
    setResetPasswordResult(null)

    const result: ResetPasswordResult = await resetEmployeePassword(employeeId)

    if (result.success) {
      setResetPasswordResult({
        success: true,
        message: 'Password reset successfully! Share this temporary password:',
        tempPassword: result.temporaryPassword,
      })
    } else {
      setResetPasswordResult({
        success: false,
        message: result.error,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
          <span className="size-5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Admin</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">Manage your company employees.</p>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Employees</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Full name</th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Email</th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Role</th>
                  <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                      No employees yet. Add one below.
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                    >
                      <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{emp.full_name}</td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{emp.email ?? '—'}</td>
                       <td className="px-4 py-3">
                         <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
                           {emp.role}
                         </span>
                       </td>
                       <td className="px-4 py-3">
                         <div className="flex items-center gap-2">
                           <button
                             onClick={() => setEditingEmployee(emp)}
                             className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                             disabled={emp.id === myEmployeeId}
                           >
                            Edit
                           </button>
                           <button
                             onClick={() => setShowResetPassword(emp)}
                             className="rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                             disabled={emp.id === myEmployeeId}
                           >
                            Reset Password
                           </button>
                           <button
                             onClick={() => handleDeleteEmployee(emp.id)}
                             className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                             disabled={emp.id === myEmployeeId}
                           >
                            Delete
                           </button>
                         </div>
                       </td>
                     </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Add employee</h2>
          <form
            onSubmit={handleAddEmployee}
            className="mt-3 flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-md"
          >
            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              >
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                <p>{formSuccess.message}</p>
                {formSuccess.tempPassword && (
                  <p className="mt-1 font-mono text-green-900 dark:text-green-100">
                    {formSuccess.tempPassword}
                  </p>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="employee@company.com"
                disabled={formLoading}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Full name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                placeholder="Jane Doe"
                disabled={formLoading}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Role
              </label>
              <select
                id="role"
                name="role"
                required
                disabled={formLoading}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={formLoading}
              className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {formLoading ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent" />
                  Adding…
                </>
              ) : (
                'Add employee'
              )}
            </button>
          </form>
        </section>

        {/* Edit Employee Modal */}
        {editingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Edit Employee
              </h3>
              <form onSubmit={handleUpdateEmployee} className="space-y-4">
                <div>
                  <label htmlFor="editFullName" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Full Name
                  </label>
                  <input
                    id="editFullName"
                    name="fullName"
                    type="text"
                    defaultValue={editingEmployee.full_name}
                    required
                    disabled={formLoading}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </div>
                <div>
                  <label htmlFor="editRole" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Role
                  </label>
                  <select
                    id="editRole"
                    name="role"
                    defaultValue={editingEmployee.role}
                    required
                    disabled={formLoading}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEmployee(null)}
                    disabled={formLoading}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {formLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {showResetPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Reset Password
              </h3>
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                Reset password for <strong>{showResetPassword.full_name}</strong> ({showResetPassword.email})
              </p>
              {resetPasswordResult ? (
                <div className="space-y-4">
                  <div className={`rounded-lg px-4 py-3 text-sm ${
                    resetPasswordResult.success
                      ? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200'
                      : 'border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    <p>{resetPasswordResult.message}</p>
                    {resetPasswordResult.tempPassword && (
                      <p className="mt-2 font-mono text-green-900 dark:text-green-100">
                        {resetPasswordResult.tempPassword}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowResetPassword(null)
                      setResetPasswordResult(null)
                    }}
                    className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    A new temporary password will be generated. Share it with the employee securely.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowResetPassword(null)}
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleResetPassword(showResetPassword.id)}
                      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Reset Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <section className="mt-12">
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
            Attendance
          </h2>

          <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Check in</th>
                  <th className="px-4 py-3">Check out</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                      No attendance records yet.
                    </td>
                  </tr>
                ) : (
                  attendance.map((rec) => (
                    <tr key={rec.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        {rec.full_name}
                        <div className="text-xs text-zinc-500">{rec.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(rec.check_in_time).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {rec.check_out_time
                          ? new Date(rec.check_out_time).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs">
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        </div>
      </div>
    </div>
  )
}
