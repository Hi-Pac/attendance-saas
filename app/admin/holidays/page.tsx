'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/navbar'

type Holiday = {
  id: string
  name: string
  date: string
  is_recurring: boolean
}

export default function HolidaysPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', is_recurring: false })

  useEffect(() => {
    async function loadHolidays() {
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

      const { data: holidaysData, error: holidaysError } = await supabase
        .from('holidays')
        .select('*')
        .eq('company_id', employee.company_id)
        .order('date', { ascending: true })

      if (holidaysError) {
        setError(holidaysError.message)
      } else {
        setHolidays(holidaysData as Holiday[])
      }

      setLoading(false)
    }

    loadHolidays()
  }, [router])

  async function handleAddHoliday(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('You must be logged in')
        setSaving(false)
        return
      }

      const { data: employee } = await supabase
        .from('employees')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      if (!employee?.company_id) {
        setError('Company not found')
        setSaving(false)
        return
      }

      const { error: insertError } = await supabase.from('holidays').insert({
        company_id: employee.company_id,
        name: newHoliday.name.trim(),
        date: newHoliday.date,
        is_recurring: newHoliday.is_recurring,
      })

      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }

      setSuccess('Holiday added successfully!')
      setShowAddForm(false)
      setNewHoliday({ name: '', date: '', is_recurring: false })

      // Reload holidays
      const { data: holidaysData } = await supabase
        .from('holidays')
        .select('*')
        .eq('company_id', employee.company_id)
        .order('date', { ascending: true })

      if (holidaysData) {
        setHolidays(holidaysData as Holiday[])
      }

      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteHoliday(holidayId: string) {
    if (!confirm('Are you sure you want to delete this holiday?')) {
      return
    }

    setError(null)
    setSuccess(null)
    setDeleting(holidayId)

    try {
      const supabase = createClient()
      const { error: deleteError } = await supabase
        .from('holidays')
        .delete()
        .eq('id', holidayId)

      if (deleteError) {
        setError(deleteError.message)
        setDeleting(null)
        return
      }

      setSuccess('Holiday deleted successfully!')
      setHolidays(holidays.filter(h => h.id !== holidayId))
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setDeleting(null)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function isUpcoming(dateString: string) {
    const holidayDate = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return holidayDate >= today
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
                Holidays
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Manage company holidays and non-working days
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Holiday
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

          {/* Add Holiday Form */}
          {showAddForm && (
            <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Add New Holiday
              </h2>
              <form onSubmit={handleAddHoliday} className="space-y-4">
                <div>
                  <label htmlFor="holidayName" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Holiday Name
                  </label>
                  <input
                    id="holidayName"
                    type="text"
                    value={newHoliday.name}
                    onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                    required
                    disabled={saving}
                    placeholder="e.g., New Year's Day"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                  />
                </div>

                <div>
                  <label htmlFor="holidayDate" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Date
                  </label>
                  <input
                    id="holidayDate"
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                    required
                    disabled={saving}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="isRecurring"
                    type="checkbox"
                    checked={newHoliday.is_recurring}
                    onChange={(e) => setNewHoliday({ ...newHoliday, is_recurring: e.target.checked })}
                    disabled={saving}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Recurring (repeats every year)
                  </label>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setNewHoliday({ name: '', date: '', is_recurring: false })
                    }}
                    disabled={saving}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {saving ? (
                      <>
                        <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent" />
                        Adding...
                      </>
                    ) : (
                      'Add Holiday'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Holidays List */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            {holidays.length === 0 ? (
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p>No holidays added yet.</p>
                <p className="mt-2 text-sm">Click "Add Holiday" to create your first holiday.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Holiday Name</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Date</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Type</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Status</th>
                      <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((holiday) => (
                      <tr
                        key={holiday.id}
                        className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100">
                            {holiday.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                          {formatDate(holiday.date)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                            {holiday.is_recurring ? 'Recurring' : 'One-time'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isUpcoming(holiday.date) ? (
                            <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                              Upcoming
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              Past
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDeleteHoliday(holiday.id)}
                            disabled={deleting === holiday.id}
                            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            {deleting === holiday.id ? 'Deleting...' : 'Delete'}
                          </button>
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
