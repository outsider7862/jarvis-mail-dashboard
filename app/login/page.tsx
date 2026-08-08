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
  const [mode, setMode]         = useState<'login' | 'signup' | 'forgot'>('login')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [sentReset, setSentReset] = useState(false)
  const [captchaToken, setCaptchaToken] = useState('')
  const turnstileRef = useRef<TurnstileInstance>(null)

  // A spent Turnstile token makes the next attempt fail with a confusing
  // captcha error, so every failure/mode change gets a fresh one.
  function resetCaptcha() {
    turnstileRef.current?.reset()
    setCaptchaToken('')
  }

  async function handleSubmit() {
    if (mode === 'forgot') return handleForgotPassword()
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
      resetCaptcha()
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    setError('')
    setLoading(true)
    try {
      // CAPTCHA protection covers password resets too, not just sign-in/sign-up
      // — without the token Supabase rejects the request.
      const { error: e } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken,
      })
      if (e) throw e
      setSentReset(true)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
      resetCaptcha()
    } finally {
      setLoading(false)
    }
  }

  function goToMode(next: 'login' | 'signup' | 'forgot') {
    setMode(next)
    setError('')
    setSentReset(false)
    resetCaptcha()
  }

  function switchMode() {
    goToMode(mode === 'login' ? 'signup' : 'login')
  }

  const canSubmit = !loading && !!email && !!captchaToken && (mode === 'forgot' || !!password)

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
            <Zap size={20} color="var(--on-accent)" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Jarvis Mail
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {mode === 'login' ? 'Sign in to your account'
                : mode === 'signup' ? 'Create your account'
                  : 'Reset your password'}
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

          {/* Password — not needed when requesting a reset link */}
          {mode !== 'forgot' && (
            <>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password" placeholder="Password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canSubmit && handleSubmit()}
                  style={inputStyle}
                />
              </div>
              {mode === 'login' && (
                <button
                  onClick={() => goToMode('forgot')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 12,
                    textAlign: 'right', width: '100%', marginTop: -4, padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              )}
            </>
          )}
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

        {/* Reset link sent */}
        {sentReset && (
          <div style={{
            padding: '16px', borderRadius: 8, textAlign: 'center',
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            color: '#22c55e', fontSize: 13,
          }}>
            Check your email — we sent a password reset link.
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
          color: canSubmit ? 'var(--on-accent)' : 'var(--text-muted)',
          fontSize: 14, fontWeight: 600, transition: 'background 0.15s',
        }}>
          {loading
            ? 'Please wait...'
            : (!captchaToken && email && (mode === 'forgot' || password))
              ? 'Verifying you’re human...'
              : mode === 'login' ? 'Sign in'
                : mode === 'signup' ? 'Create account'
                  : 'Send reset link'}
        </button>

        {/* Toggle mode */}
        {mode === 'forgot' ? (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            <button onClick={() => goToMode('login')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent)', fontWeight: 600, fontSize: 13,
            }}>
              ← Back to sign in
            </button>
          </p>
        ) : (
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={switchMode} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--accent)', fontWeight: 600, fontSize: 13,
          }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
        )}
      </div>
    </div>
  )
}
