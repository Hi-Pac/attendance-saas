'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/navbar'

type LeaveRequest = {
  id: string
  employee_id: string
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
  email: string | null
}

export default function AdminLeaveRequestsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

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
        .select('company_id, role')
        .eq('user_id', user.id)
        .single()

      if (!employee?.company_id || employee.role !== 'admin') {
        router.replace('/dashboard')
        return
      }

      const [requestsData, employeesData] = await Promise.all([
        supabase
          .from('leave_requests')
          .select('*')
          .eq('company_id', employee.company_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('employees')
          .select('id, full_name, email')
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

  async function handleApprove(requestId: string) {
    setError(null)
    setSuccess(null)
    setProcessing(requestId)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in')
        setProcessing(null)
        return
      }

      const { data: adminEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!adminEmployee) {
        setError('Admin not found')
        setProcessing(null)
        return
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: adminEmployee.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending')

      if (updateError) {
        setError(updateError.message)
        setProcessing(null)
        return
      }

      setSuccess('Leave request approved successfully!')
      setLeaveRequests(leaveRequests.map(r =>
        r.id === requestId ? { ...r, status: 'approved' as const, approved_by: adminEmployee.id, approved_at: new Date().toISOString() } : r
      ))
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(requestId: string) {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }

    setError(null)
    setSuccess(null)
    setProcessing(requestId)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in')
        setProcessing(null)
        return
      }

      const { data: adminEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!adminEmployee) {
        setError('Admin not found')
        setProcessing(null)
        return
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: adminEmployee.id,
          rejection_reason: rejectionReason.trim(),
        })
        .eq('id', requestId)
        .eq('status', 'pending')

      if (updateError) {
        setError(updateError.message)
        setProcessing(null)
        return
      }

      setSuccess('Leave request rejected successfully!')
      setShowRejectModal(null)
      setRejectionReason('')
      setLeaveRequests(leaveRequests.map(r =>
        r.id === requestId ? { ...r, status: 'rejected' as const, approved_by: adminEmployee.id, rejection_reason: rejectionReason.trim() } : r
      ))
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setProcessing(null)
    }
  }

  const filteredRequests = leaveRequests.filter(request => {
    if (filter === 'all') return true
    return request.status === filter
  })

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
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Leave Requests Management
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Review and manage employee leave requests
            </p>
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

          {/* Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                All ({leaveRequests.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                Pending ({leaveRequests.filter(r => r.status === 'pending').length})
              </button>
              <button
                onClick={() => setFilter('approved')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'approved'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                Approved ({leaveRequests.filter(r => r.status === 'approved').length})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                Rejected ({leaveRequests.filter(r => r.status === 'rejected').length})
              </button>
            </div>
          </div>

          {/* Leave Requests Table */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {filteredRequests.length === 0 ? (
              <div className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400">
                <p>No leave requests found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Employee</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Type</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Duration</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Reason</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Status</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => {
                      const employee = employees.find(e => e.id === request.employee_id)
                      return (
                        <tr
                          key={request.id}
                          className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {employee?.full_name || 'Unknown'}
                            </div>
                            <div className="text-xs text-zinc-500">{employee?.email}</div>
                          </td>
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
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(request.id)}
                                  disabled={processing === request.id}
                                  className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 disabled:opacity-60 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                                >
                                  {processing === request.id ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => setShowRejectModal(request.id)}
                                  disabled={processing === request.id}
                                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Reject Leave Request
            </h3>
            <div className="mb-4">
              <label htmlFor="rejectionReason" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Rejection Reason
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                required
                placeholder="Provide a reason for rejecting this leave request..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(null)
                  setRejectionReason('')
                }}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
