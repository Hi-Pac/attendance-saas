'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/navbar'

type AttendanceRecord = {
  id: string
  check_in_time: string
  check_out_time: string | null
  latitude: number
  longitude: number
  status: 'present' | 'late' | 'absent'
}

export default function HistoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all')

  useEffect(() => {
    async function loadHistory() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: emp, error: empError } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (empError || !emp) {
        setError(empError?.message ?? 'Employee not found.')
        setLoading(false)
        return
      }

      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('employee_id', emp.id)
        .order('check_in_time', { ascending: false })

      if (attendanceError) {
        setError(attendanceError.message)
        setLoading(false)
        return
      }

      setRecords(attendanceData as AttendanceRecord[])
      setLoading(false)
    }

    loadHistory()
  }, [router])

  const filteredRecords = records.filter(record => {
    if (filter === 'all') return true
    return record.status === filter
  })

  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    late: records.filter(r => r.status === 'late').length,
    absent: records.filter(r => r.status === 'absent').length,
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function calculateHours(checkIn: string, checkOut: string | null) {
    if (!checkOut) return '—'
    const start = new Date(checkIn).getTime()
    const end = new Date(checkOut).getTime()
    const hours = ((end - start) / (1000 * 60 * 60)).toFixed(2)
    return `${hours}h`
  }

  function getStatusBadge(status: 'present' | 'late' | 'absent') {
    const styles = {
      present: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      absent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    }

    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
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
              Attendance History
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              View your complete attendance record
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

          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Total Records
              </p>
              <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                {stats.total}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Present
              </p>
              <p className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">
                {stats.present}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Late
              </p>
              <p className="mt-2 text-3xl font-semibold text-yellow-600 dark:text-yellow-400">
                {stats.late}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Absent
              </p>
              <p className="mt-2 text-3xl font-semibold text-red-600 dark:text-red-400">
                {stats.absent}
              </p>
            </div>
          </div>

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
                All
              </button>
              <button
                onClick={() => setFilter('present')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'present'
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                Present
              </button>
              <button
                onClick={() => setFilter('late')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'late'
                    ? 'bg-yellow-600 text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                Late
              </button>
              <button
                onClick={() => setFilter('absent')}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  filter === 'absent'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                Absent
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {filteredRecords.length === 0 ? (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p>No attendance records found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                        Date
                      </th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                        Check In
                      </th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                        Check Out
                      </th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                        Duration
                      </th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">
                          {formatDate(record.check_in_time)}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {formatTime(record.check_in_time)}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {record.check_out_time ? formatTime(record.check_out_time) : '—'}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {calculateHours(record.check_in_time, record.check_out_time)}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(record.status)}
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
