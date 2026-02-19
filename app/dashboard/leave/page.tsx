'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'
import Navbar from '../../../components/navbar'

type LeaveRequest = {
  id: string
  leave_type: 'annual' | 'sick' | 'personal' | 'unpaid'
  start_date: string
  end_date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
}

type Employee = {
  id: string
  full_name: string
}

export default function LeaveRequestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showForm, setShowForm] = useState(false)
  const [newRequest, setNewRequest] = useState({
    leave_type: 'annual' as 'annual' | 'sick' | 'personal' | 'unpaid',
    start_date: '',
    end_date: '',
    reason: '',
  })

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: employee } = await supabase
        .from('employees')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

      if (!employee) {
        router.replace('/login')
        return
      }

      const [requestsData, employeesData] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('*')
          .eq('employee_id', employee.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('employees')
          .select('id, full_name')
          .eq('company_id', employee.company_id)
          .order('full_name', { ascending: true }),
      ])

      if (requestsData.error) {
        setError(requestsData.error.message)
      } else {
        setLeaveRequests(requestsData.data as LeaveRequest[])
      }

      if (employeesData.error) {
        setError(employeesData.error.message)
      } else {
        setEmployees(employeesData.data as Employee[])
      }

      setLoading(false)
    }

    loadData()
  }, [router])

  async function handleSubmitRequest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in')
        setSubmitting(false)
        return
      }

      const { data: employee } = await supabase
        .from('employees')
        .select('id, company_id')
        .eq('user_id', user.id)
        .single()

      if (!employee) {
        setError('Employee not found')
        setSubmitting(false)
        return
      }

      const { error: insertError } = await supabase.from('leave_requests').insert({
        company_id: employee.company_id,
        employee_id: employee.id,
        leave_type: newRequest.leave_type,
        start_date: newRequest.start_date,
        end_date: newRequest.end_date,
        reason: newRequest.reason.trim() || null,
      })

      if (insertError) {
        setError(insertError.message)
        setSubmitting(false)
        return
      }

      setSuccess('Leave request submitted successfully!')
      setShowForm(false)
      setNewRequest({
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        reason: '',
      })

      // Reload requests
      const { data: requestsData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })

      if (requestsData) {
        setLeaveRequests(requestsData as LeaveRequest[])
      }

      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelRequest(requestId: string) {
    if (!confirm('Are you sure you want to cancel this leave request?')) {
      return
    }

    setError(null)
    setSuccess(null)
    setCancelling(requestId)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
        .eq('status', 'pending')

      if (updateError) {
        setError(updateError.message)
        setCancelling(null)
        return
      }

      setSuccess('Leave request cancelled successfully!')
      setLeaveRequests(leaveRequests.map(r =>
        r.id === requestId ? { ...r, status: 'cancelled' as const } : r
      ))
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setCancelling(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function calculateDays(startDate: string, endDate: string) {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  function getStatusBadge(status: 'pending' | 'approved' | 'rejected' | 'cancelled') {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      cancelled: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
    }

    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  function getLeaveTypeBadge(type: 'annual' | 'sick' | 'personal' | 'unpaid') {
    const styles = {
      annual: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      sick: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      personal: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      unpaid: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }

    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[type]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <span className="size-5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
            <span>Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Leave Requests
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Request and manage your leave
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Request
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
            >
              {success}
            </div>
          )}

          {/* Leave Request Form */}
          {showForm && (
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Request Leave
              </h2>
              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div>
                  <label htmlFor="leaveType" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Leave Type
                  </label>
                  <select
                    id="leaveType"
                    value={newRequest.leave_type}
                    onChange={(e) => setNewRequest({ ...newRequest, leave_type: e.target.value as any })}
                    required
                    disabled={submitting}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Start Date
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      value={newRequest.start_date}
                      onChange={(e) => setNewRequest({ ...newRequest, start_date: e.target.value })}
                      required
                      disabled={submitting}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      End Date
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      value={newRequest.end_date}
                      onChange={(e) => setNewRequest({ ...newRequest, end_date: e.target.value })}
                      required
                      disabled={submitting}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="reason" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Reason (optional)
                  </label>
                  <textarea
                    id="reason"
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                    disabled={submitting}
                    rows={3}
                    placeholder="Provide a reason for your leave request..."
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setNewRequest({
                        leave_type: 'annual',
                        start_date: '',
                        end_date: '',
                        reason: '',
                      })
                    }}
                    disabled={submitting}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {submitting ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Leave Requests List */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {leaveRequests.length === 0 ? (
              <div className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400">
                <svg
                  className="mx-auto mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012 2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                <p>No leave requests yet.</p>
                <p className="mt-2 text-sm">Click "New Request" to submit your first leave request.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Type</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Duration</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Reason</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Status</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.map((request) => (
                      <tr
                        key={request.id}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <td className="px-4 py-3">
                          {getLeaveTypeBadge(request.leave_type)}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          <div>{formatDate(request.start_date)}</div>
                          <div className="text-xs text-zinc-500">
                            {calculateDays(request.start_date, request.end_date)} day(s)
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                          {request.reason || '—'}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(request.status)}
                          {request.rejection_reason && request.status === 'rejected' && (
                            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {request.rejection_reason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {request.status === 'pending' && (
                            <button
                              onClick={() => handleCancelRequest(request.id)}
                              disabled={cancelling === request.id}
                              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                            >
                              {cancelling === request.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
