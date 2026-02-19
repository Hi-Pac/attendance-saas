'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/navbar'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [companyName, setCompanyName] = useState('')

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: employee, error: empError } = await supabase
        .from('employees')
        .select('full_name, email, role, company_id')
        .eq('user_id', user.id)
        .single()

      if (empError || !employee) {
        setError('Failed to load profile')
        setLoading(false)
        return
      }

      setFullName(employee.full_name || '')
      setEmail(employee.email || user.email || '')
      setRole(employee.role || '')

      // Load company name
      if (employee.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name')
          .eq('id', employee.company_id)
          .single()

        if (company) {
          setCompanyName(company.name || '')
        }
      }

      setLoading(false)
    }

    loadProfile()
  }, [router])

  async function handleUpdateProfile(e: React.FormEvent) {
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

      const { error: updateError } = await supabase
        .from('employees')
        .update({ full_name: fullName.trim() })
        .eq('user_id', user.id)

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }

      setSuccess('Profile updated successfully!')
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setChangingPassword(true)

    try {
      const supabase = createClient()

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setError(updateError.message)
        setChangingPassword(false)
        return
      }

      setSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setChangingPassword(false)
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Profile Settings
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage your account information and security
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

          {/* Profile Information */}
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Profile Information
            </h2>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={saving}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Email cannot be changed. Contact admin if needed.
                </p>
              </div>

              <div>
                <label htmlFor="role" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Role
                </label>
                <input
                  id="role"
                  type="text"
                  value={role.charAt(0).toUpperCase() + role.slice(1)}
                  disabled
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-500 capitalize dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                />
              </div>

              <div>
                <label htmlFor="company" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Company
                </label>
                <input
                  id="company"
                  type="text"
                  value={companyName}
                  disabled
                  className="w-full rounded-lg border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {saving ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-50">
              Change Password
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={changingPassword}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={changingPassword}
                  placeholder="Confirm new password"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {changingPassword ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-zinc-900 dark:border-t-transparent" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
