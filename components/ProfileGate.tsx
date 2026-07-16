'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getProfile } from '@/lib/api'

// Runs after AuthGuard (so a session exists): sends users who haven't finished
// onboarding to /onboarding before they can see the dashboard.
export function ProfileGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok'>('checking')
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return // AuthGuard handles the redirect to /login
      try {
        const profile = await getProfile(data.session.access_token)
        if (cancelled) return
        if (!profile.onboarding_complete) router.replace('/onboarding')
        else setState('ok')
      } catch {
        // If the profile check fails (e.g. backend hiccup), don't lock the user
        // out of their dashboard — fail open.
        if (!cancelled) setState('ok')
      }
    })
    return () => { cancelled = true }
  }, [router])

  if (state === 'checking') {
    return (
      <div style={{
        height: '100vh', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return <>{children}</>
}
