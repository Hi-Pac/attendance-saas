'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase/client'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    async function logout() {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    }

    logout()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <span className="size-5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
        <span>Logging out...</span>
      </div>
    </div>
  )
}
