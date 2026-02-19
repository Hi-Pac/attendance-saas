'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'
import Navbar from '../../../components/navbar'

type Employee = {
  id: string
  full_name: string
  email: string | null
}

type AttendanceRecord = {
  id: string
  employee_id: string
  check_in_time: string
  check_out_time: string | null
  status: 'present' | 'late' | 'absent'
}

type EmployeeStats = {
  employee: Employee
  totalDays: number
  presentDays: number
  lateDays: number
  absentDays: number
  totalHours: number
  avgHoursPerDay: number
}

export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30')
  const [error, setError] = useState<string | null>(null)

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

      const [empList, attList] = await Promise.all([
        supabase
          .from('employees')
          .select('id, full_name, email')
          .eq('company_id', employee.company_id)
          .order('full_name', { ascending: true }),
        supabase
          .from('attendance_records')
          .select('*')
          .order('check_in_time', { ascending: false }),
      ])

      if (empList.error) {
        setError(empList.error.message)
      } else {
        setEmployees(empList.data as Employee[])
      }

      if (attList.error) {
        setError(attList.error.message)
      } else {
        setAttendanceRecords(attList.data as AttendanceRecord[])
      }

      setLoading(false)
    }

    loadData()
  }, [router])

  const filteredRecords = attendanceRecords.filter(record => {
    const recordDate = new Date(record.check_in_time)
    const now = new Date()
    const daysAgo = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24)

    if (dateRange !== 'all' && daysAgo > parseInt(dateRange)) {
      return false
    }

    if (selectedEmployee !== 'all' && record.employee_id !== selectedEmployee) {
      return false
    }

    return true
  })

  const employeeStats: EmployeeStats[] = employees.map(emp => {
    const empRecords = filteredRecords.filter(r => r.employee_id === emp.id)
    const totalDays = empRecords.length
    const presentDays = empRecords.filter(r => r.status === 'present').length
    const lateDays = empRecords.filter(r => r.status === 'late').length
    const absentDays = empRecords.filter(r => r.status === 'absent').length

    let totalHours = 0
    empRecords.forEach(record => {
      if (record.check_out_time) {
        const hours = (new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime()) / (1000 * 60 * 60)
        totalHours += hours
      }
    })

    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0

    return {
      employee: emp,
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      totalHours,
      avgHoursPerDay,
    }
  })

  const overallStats = {
    totalRecords: filteredRecords.length,
    totalPresent: filteredRecords.filter(r => r.status === 'present').length,
    totalLate: filteredRecords.filter(r => r.status === 'late').length,
    totalAbsent: filteredRecords.filter(r => r.status === 'absent').length,
    attendanceRate: filteredRecords.length > 0
      ? ((filteredRecords.filter(r => r.status === 'present' || r.status === 'late').length / filteredRecords.length) * 100).toFixed(1)
      : '0.0',
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function calculateHours(checkIn: string, checkOut: string | null) {
    if (!checkOut) return '—'
    const hours = ((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60)).toFixed(2)
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
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Reports & Analytics
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              View attendance reports and team performance metrics
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

          {/* Filters */}
          <div className="mb-8 flex flex-wrap gap-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="employeeFilter" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Employee
              </label>
              <select
                id="employeeFilter"
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="all">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label htmlFor="dateRange" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Date Range
              </label>
              <select
                id="dateRange"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Total Records
              </p>
              <p className="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
                {overallStats.totalRecords}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Attendance Rate
              </p>
              <p className="mt-2 text-3xl font-semibold text-green-600 dark:text-green-400">
                {overallStats.attendanceRate}%
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Late Arrivals
              </p>
              <p className="mt-2 text-3xl font-semibold text-yellow-600 dark:text-yellow-400">
                {overallStats.totalLate}
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Absences
              </p>
              <p className="mt-2 text-3xl font-semibold text-red-600 dark:text-red-400">
                {overallStats.totalAbsent}
              </p>
            </div>
          </div>

          {/* Employee Stats Table */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Employee Performance
            </h2>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Employee</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Total Days</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Present</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Late</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Absent</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Total Hours</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Avg Hours/Day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeStats.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-zinc-500 dark:text-zinc-400">
                          No employee data available.
                        </td>
                      </tr>
                    ) : (
                      employeeStats.map((stat) => (
                        <tr
                          key={stat.employee.id}
                          className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {stat.employee.full_name}
                            </div>
                            <div className="text-xs text-zinc-500">{stat.employee.email}</div>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                            {stat.totalDays}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {stat.presentDays}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                              {stat.lateDays}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {stat.absentDays}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                            {stat.totalHours.toFixed(1)}h
                          </td>
                          <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                            {stat.avgHoursPerDay.toFixed(1)}h
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div>
            <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Recent Attendance Records
            </h2>
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {filteredRecords.length === 0 ? (
                <div className="px-4 py-12 text-center text-zinc-500 dark:text-zinc-400">
                  <p>No attendance records found for the selected filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Employee</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Date</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Check In</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Check Out</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Duration</th>
                        <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.slice(0, 50).map((record) => {
                        const employee = employees.find(e => e.id === record.employee_id)
                        return (
                          <tr
                            key={record.id}
                            className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                {employee?.full_name || 'Unknown'}
                              </div>
                              <div className="text-xs text-zinc-500">{employee?.email}</div>
                            </td>
                            <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
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
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
