'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../lib/supabase/client'
import Navbar from '../../../components/navbar'

type CompanySettings = {
  id: string
  name: string
  work_start_time: string
  work_end_time: string
  allowed_latitude: number | null
  allowed_longitude: number | null
  allowed_radius_meters: number
  late_threshold_minutes: number
}

export default function CompanySettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [useGeofencing, setUseGeofencing] = useState(false)

  useEffect(() => {
    async function loadSettings() {
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

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', employee.company_id)
        .single()

      if (companyError || !company) {
        setError(companyError?.message ?? 'Failed to load company settings.')
        setLoading(false)
        return
      }

      setSettings(company as CompanySettings)
      setUseGeofencing(!!company.allowed_latitude && !!company.allowed_longitude)
      setLoading(false)
    }

    loadSettings()
  }, [router])

  async function handleSaveSettings(e: React.FormEvent) {
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

      const updateData: Partial<CompanySettings> = {
        name: settings?.name || '',
        work_start_time: settings?.work_start_time || '09:00:00',
        work_end_time: settings?.work_end_time || '17:00:00',
        late_threshold_minutes: settings?.late_threshold_minutes || 15,
      }

      if (useGeofencing && settings?.allowed_latitude && settings?.allowed_longitude) {
        updateData.allowed_latitude = settings.allowed_latitude
        updateData.allowed_longitude = settings.allowed_longitude
        updateData.allowed_radius_meters = settings.allowed_radius_meters || 100
      } else {
        updateData.allowed_latitude = null
        updateData.allowed_longitude = null
        updateData.allowed_radius_meters = 100
      }

      const { error: updateError } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', employee.company_id)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }

      setSuccess('Company settings updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function getCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000 }
        )
      })

      setSettings(prev => prev ? {
        ...prev,
        allowed_latitude: position.coords.latitude,
        allowed_longitude: position.coords.longitude,
      } : null)
      setUseGeofencing(true)
    } catch (err) {
      setError('Failed to get current location. Please try again.')
    }
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

  if (!settings) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Navbar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <p className="text-zinc-600 dark:text-zinc-400">Company settings not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Company Settings
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Configure your company's attendance policies and settings
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

          <form onSubmit={handleSaveSettings} className="space-y-8">
            {/* Basic Information */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Basic Information
              </h2>

              <div>
                <label htmlFor="companyName" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                  required
                  disabled={saving}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>
            </div>

            {/* Working Hours */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
                Working Hours
              </h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="workStartTime" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Work Start Time
                  </label>
                  <input
                    id="workStartTime"
                    type="time"
                    value={settings.work_start_time}
                    onChange={(e) => setSettings({ ...settings, work_start_time: e.target.value })}
                    required
                    disabled={saving}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Employees are expected to check in by this time
                  </p>
                </div>

                <div>
                  <label htmlFor="workEndTime" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Work End Time
                  </label>
                  <input
                    id="workEndTime"
                    type="time"
                    value={settings.work_end_time}
                    onChange={(e) => setSettings({ ...settings, work_end_time: e.target.value })}
                    required
                    disabled={saving}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Employees are expected to check out by this time
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="lateThreshold" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Late Threshold (minutes)
                </label>
                <input
                  id="lateThreshold"
                  type="number"
                  min="1"
                  max="60"
                  value={settings.late_threshold_minutes}
                  onChange={(e) => setSettings({ ...settings, late_threshold_minutes: parseInt(e.target.value) || 15 })}
                  required
                  disabled={saving}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Employees checking in after this threshold will be marked as late
                </p>
              </div>
            </div>

            {/* Geofencing */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                  Geofencing
                </h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useGeofencing}
                    onChange={(e) => setUseGeofencing(e.target.checked)}
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-zinc-300 dark:peer-focus:ring-zinc-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100"></div>
                </label>
              </div>

              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                Restrict check-in/check-out to a specific location
              </p>

              {useGeofencing && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="latitude" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Latitude
                    </label>
                    <input
                      id="latitude"
                      type="number"
                      step="any"
                      value={settings.allowed_latitude || ''}
                      onChange={(e) => setSettings({ ...settings, allowed_latitude: parseFloat(e.target.value) || null })}
                      required={useGeofencing}
                      disabled={saving}
                      placeholder="e.g., 30.0444"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="longitude" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Longitude
                    </label>
                    <input
                      id="longitude"
                      type="number"
                      step="any"
                      value={settings.allowed_longitude || ''}
                      onChange={(e) => setSettings({ ...settings, allowed_longitude: parseFloat(e.target.value) || null })}
                      required={useGeofencing}
                      disabled={saving}
                      placeholder="e.g., 31.2357"
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="radius" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Allowed Radius (meters)
                    </label>
                    <input
                      id="radius"
                      type="number"
                      min="10"
                      max="1000"
                      value={settings.allowed_radius_meters}
                      onChange={(e) => setSettings({ ...settings, allowed_radius_meters: parseInt(e.target.value) || 100 })}
                      required={useGeofencing}
                      disabled={saving}
                      className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                    />
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Employees must be within this radius to check in
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Use Current Location
                  </button>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {saving ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
