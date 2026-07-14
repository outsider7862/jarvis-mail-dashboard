'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getConnectedAccounts, startGmailConnection, createTrigger } from '@/lib/api'
import { ConnectedAccountInfo } from '@/types'
import { TopBar } from '@/components/TopBar'
import { Mail, CheckCircle2, Loader2 } from 'lucide-react'

function SettingsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [accounts, setAccounts] = useState<ConnectedAccountInfo[] | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [finishingConnection, setFinishingConnection] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      try {
        setAccounts(await getConnectedAccounts(data.session.access_token))
      } catch {
        setError('Could not load connected inboxes.')
      }
    })
  }, [])

  // Coming back from the Google OAuth consent screen via Composio.
  useEffect(() => {
    if (searchParams.get('connected') !== 'true') return
    setFinishingConnection(true)
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      try {
        await createTrigger(data.session.access_token)
        setAccounts(await getConnectedAccounts(data.session.access_token))
      } catch {
        setError('Gmail authorization succeeded, but finishing the connection failed. Try again.')
      } finally {
        setFinishingConnection(false)
        router.replace('/dashboard/settings')
      }
    })
  }, [searchParams, router])

  async function connectGmail() {
    setError('')
    setConnecting(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const { redirect_url } = await startGmailConnection(data.session.access_token)
      window.location.href = redirect_url
    } catch {
      setError('Could not start the Gmail connection. Try again.')
      setConnecting(false)
    }
  }

  const gmailAccount = accounts?.find(a => a.provider === 'gmail' && a.active) ?? null

  return (
    <>
      <TopBar title="Settings" />
      <div style={{ padding: '28px', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Account info */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Account</h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#fff',
            }}>
              {email ? email[0].toUpperCase() : '?'}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {email || 'Loading...'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Supabase Auth</p>
            </div>
          </div>
        </div>

        {/* Connected inboxes */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Connected Inboxes</h3>

          {finishingConnection ? (
            <div style={{
              padding: '20px', textAlign: 'center', borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            }}>
              <Loader2 size={20} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite' }} />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Finishing Gmail connection...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          ) : accounts === null ? (
            <div style={{
              padding: '20px', textAlign: 'center', borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
            }}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>
            </div>
          ) : gmailAccount ? (
            <div style={{
              padding: '16px 20px', borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <CheckCircle2 size={20} color="#22c55e" />
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Gmail connected
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gmailAccount.email_address}</p>
              </div>
            </div>
          ) : (
            <div style={{
              padding: '20px', textAlign: 'center', borderRadius: 8,
              background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <Mail size={24} color="var(--text-muted)" />
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No inbox connected</p>
              <button onClick={connectGmail} disabled={connecting} style={{
                padding: '9px 16px', borderRadius: 8, border: 'none',
                cursor: connecting ? 'not-allowed' : 'pointer',
                background: connecting ? 'var(--bg-elevated)' : 'var(--accent)',
                color: connecting ? 'var(--text-muted)' : '#fff',
                fontSize: 13, fontWeight: 600,
              }}>
                {connecting ? 'Redirecting...' : 'Connect Gmail'}
              </button>
            </div>
          )}

          {error && (
            <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>
          )}
        </div>
      </div>
    </>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<TopBar title="Settings" />}>
      <SettingsPageInner />
    </Suspense>
  )
}
