'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Zap, Lock, AlertCircle, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState(false)
  // Supabase parses the recovery token out of the URL hash on mount, so we
  // can't know whether the link was valid until that resolves.
  const [linkState, setLinkState] = useState<'checking' | 'valid' | 'invalid'>('checking')

  useEffect(() => {
    let settled = false

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        settled = true
        setLinkState('valid')
      }
    })

    // The event may have already fired before this component mounted.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        settled = true
        setLinkState('valid')
      }
    })

    // No session shortly after mount means the link was expired, already used,
    // or the page was opened directly — say so instead of failing later with an
    // opaque error when they try to submit.
    const timer = setTimeout(() => {
      if (!settled) setLinkState('invalid')
    }, 2500)

    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleReset() {
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const { error: e } = await supabase.auth.updateUser({ password })
      if (e) throw e
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px 10px 36px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
  }

  const canSubmit = !loading && !!password && !!confirm && linkState === 'valid'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 24,
    }}>
      <div className="animate-rise" style={{
        width: '100%', maxWidth: 400,
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 36,
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Jarvis Mail
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Set a new password
            </div>
          </div>
        </div>

        {success ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: '20px', textAlign: 'center',
          }}>
            <CheckCircle size={40} color="#22c55e" />
            <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
              Password updated successfully
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Redirecting you to the dashboard...
            </p>
          </div>
        ) : linkState === 'invalid' ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            padding: '12px 0', textAlign: 'center',
          }}>
            <AlertCircle size={36} color="#ef4444" />
            <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
              This reset link is invalid or has expired
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>
              Reset links can only be used once. Request a new one to continue.
            </p>
            <button onClick={() => router.push('/login')} style={{
              marginTop: 4, padding: '10px 18px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}>
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{
                  position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                }} />
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{
                  position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                }} />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canSubmit && handleReset()}
                  style={inputStyle}
                />
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444', fontSize: 13,
              }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              onClick={handleReset}
              disabled={!canSubmit}
              style={{
                padding: '11px', borderRadius: 8, border: 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                background: canSubmit ? 'var(--accent)' : 'var(--bg-elevated)',
                color: canSubmit ? '#fff' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 600,
              }}
            >
              {loading ? 'Updating...'
                : linkState === 'checking' ? 'Verifying reset link...'
                  : 'Set new password'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
