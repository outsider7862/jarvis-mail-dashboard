'use client'
export const dynamic = 'force-dynamic'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { supabase } from '@/lib/supabase'
import { Zap, Mail, Lock, AlertCircle } from 'lucide-react'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode]         = useState<'login' | 'signup'>('login')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef<TurnstileInstance>(null)

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      // Supabase has CAPTCHA protection enabled, so the token is required.
      const options = { captchaToken }
      if (mode === 'signup') {
        const { error: e } = await supabase.auth.signUp({ email, password, options })
        if (e) throw e
      } else {
        const { error: e } = await supabase.auth.signInWithPassword({ email, password, options })
        if (e) throw e
      }
      router.push('/dashboard')
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
      // Turnstile tokens are single-use — a spent token would make the next
      // attempt fail with a confusing captcha error, so get a fresh one.
      turnstileRef.current?.reset()
      setCaptchaToken('')
      setLoading(false)
    }
  }

  function switchMode() {
    setMode(mode === 'login' ? 'signup' : 'login')
    setError('')
    // The token is issued per-attempt; don't carry it across a mode switch.
    turnstileRef.current?.reset()
    setCaptchaToken('')
  }

  const canSubmit = !loading && !!email && !!password && !!captchaToken

  const inputStyle = {
    width: '100%', padding: '10px 12px 10px 36px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 24,
    }}>
      <div style={{
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
              {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Email */}
          <div style={{ position: 'relative' }}>
            <Mail size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="email" placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
              style={inputStyle}
            />
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
              style={inputStyle}
            />
          </div>
        </div>

        {/* CAPTCHA — Supabase rejects auth without a token when protection is on */}
        {TURNSTILE_SITE_KEY ? (
          <Turnstile
            ref={turnstileRef}
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={setCaptchaToken}
            onExpire={() => setCaptchaToken('')}
            onError={() => {
              setCaptchaToken('')
              setError('Captcha failed to load. Refresh and try again.')
            }}
            options={{ theme: 'dark', size: 'flexible' }}
          />
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', borderRadius: 8,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            color: '#f59e0b', fontSize: 12,
          }}>
            <AlertCircle size={14} />
            NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set — sign-in will be rejected.
          </div>
        )}

        {/* Error */}
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

        {/* Submit */}
        <button onClick={handleSubmit} disabled={!canSubmit} style={{
          padding: '11px', borderRadius: 8, border: 'none',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          background: canSubmit ? 'var(--accent)' : 'var(--bg-elevated)',
          color: canSubmit ? '#fff' : 'var(--text-muted)',
          fontSize: 14, fontWeight: 600, transition: 'background 0.15s',
        }}>
          {loading
            ? 'Please wait...'
            : (!captchaToken && email && password)
              ? 'Verifying you’re human...'
              : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        {/* Toggle mode */}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={switchMode} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--accent)', fontWeight: 600, fontSize: 13,
          }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
