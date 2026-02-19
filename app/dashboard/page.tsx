'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkIn, checkOut } from './actions'
import Navbar from '@/components/navbar'

type TodayRecord = {
  id: string
  check_in_time: string
  check_out_time: string | null
}

function getGeo(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState<TodayRecord | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const status = useMemo(() => {
    if (!today) return 'no-checkin'
    if (today && !today.check_out_time) return 'checked-in'
    return 'checked-out'
  }, [today])

  async function loadToday() {
    setErr(null)
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.replace('/login')
      return
    }

    // get my employee id
    const { data: emp, error: empErr } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (empErr || !emp) {
      setErr(empErr?.message ?? 'Employee not found.')
      setLoading(false)
      return
    }

    // query today's record using UTC day boundaries (matches DB work_date logic)
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    const end = new Date()
    end.setUTCHours(24, 0, 0, 0)

    const { data: rec, error: recErr } = await supabase
      .from('attendance_records')
      .select('id, check_in_time, check_out_time')
      .eq('employee_id', emp.id)
      .gte('check_in_time', start.toISOString())
      .lt('check_in_time', end.toISOString())
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recErr) setErr(recErr.message)
    setToday(rec ?? null)
    setLoading(false)
  }

  useEffect(() => {
    loadToday()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onCheckIn() {
    setErr(null)
    setBusy(true)
    try {
      const geo = await getGeo().catch(() => undefined)
      const res = await checkIn(geo as any)
      if (!res.success) setErr(res.error)
      await loadToday()
    } finally {
      setBusy(false)
    }
  }

  async function onCheckOut() {
    setErr(null)
    setBusy(true)
    try {
      const geo = await getGeo().catch(() => undefined)
      const res = await checkOut(geo as any)
      if (!res.success) setErr(res.error)
      await loadToday()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar />
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Today attendance</p>

        {err && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {err}
          </div>
        )}

        <div className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Status:{' '}
            <b>
              {status === 'no-checkin' && 'Not checked in yet'}
              {status === 'checked-in' && 'Checked in (open)'}
              {status === 'checked-out' && 'Checked out'}
            </b>
          </div>

          {today && (
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              Check-in: {new Date(today.check_in_time).toLocaleString()}
              {today.check_out_time ? (
                <>
                  <br />
                  Check-out: {new Date(today.check_out_time).toLocaleString()}
                </>
              ) : null}
            </div>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={onCheckIn}
              disabled={busy || status !== 'no-checkin'}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Check In
            </button>

            <button
              onClick={onCheckOut}
              disabled={busy || status !== 'checked-in'}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Check Out
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
