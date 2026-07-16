'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getConnectedAccounts, startGmailConnection, createTrigger, disconnectGmail, getProfile, updateProfile } from '@/lib/api'
import { ConnectedAccountInfo, UserProfile } from '@/types'
import { TopBar } from '@/components/TopBar'
import { useIsMobile } from '@/lib/useIsMobile'
import { Mail, CheckCircle2, Loader2, Shield, Eye, Bot, Trash2, Unplug, Check } from 'lucide-react'

const WORK_TYPES = [
  { value: 'agency', label: 'Agency' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
]
const EMAIL_USES = [
  { value: 'client communication', label: 'Client Communication' },
  { value: 'sales & leads', label: 'Sales & Leads' },
  { value: 'project management', label: 'Project Management' },
  { value: 'customer support', label: 'Customer Support' },
  { value: 'mixed', label: 'Mixed' },
]
const TONES = [
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'concise', label: 'Concise' },
  { value: 'professional', label: 'Professional' },
]
const PRIVACY_POINTS = [
  { icon: Shield, text: 'Your emails are processed only to provide AI features.' },
  { icon: Eye, text: 'We do not manually read your emails — ever.' },
  { icon: Bot, text: 'AI analysis is performed automatically and privately.' },
  { icon: Trash2, text: 'All email data is automatically deleted after 30 days.' },
  { icon: Unplug, text: 'You can disconnect Gmail at any time from Settings.' },
]

function SettingsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [email, setEmail] = useState('')
  const [accounts, setAccounts] = useState<ConnectedAccountInfo[] | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [finishingConnection, setFinishingConnection] = useState(false)
  const [disconnectStep, setDisconnectStep] = useState<'idle' | 'confirm' | 'busy'>('idle')
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      try {
        setProfile(await getProfile(data.session.access_token))
      } catch { /* leave null; section shows a loader */ }
    })
  }, [])

  function setField(key: keyof UserProfile, value: string) {
    setProfile(prev => prev ? { ...prev, [key]: value } : prev)
    setProfileSaved(false)
  }

  async function saveProfile() {
    if (!profile) return
    setError('')
    setSavingProfile(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const updated = await updateProfile(data.session.access_token, {
        display_name: profile.display_name || null,
        work_type: profile.work_type || null,
        email_use: profile.email_use || null,
        preferred_tone: profile.preferred_tone || null,
        custom_instructions: profile.custom_instructions || null,
      })
      setProfile(updated)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch {
      setError('Could not save your profile. Try again.')
    } finally {
      setSavingProfile(false)
    }
  }

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

  async function handleDisconnect() {
    setError('')
    setDisconnectStep('busy')
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      await disconnectGmail(data.session.access_token)
      setAccounts(await getConnectedAccounts(data.session.access_token))
    } catch {
      setError('Could not disconnect. Try again.')
    } finally {
      setDisconnectStep('idle')
    }
  }

  const gmailAccount = accounts?.find(a => a.provider === 'gmail' && a.active) ?? null

  return (
    <>
      <TopBar title="Settings" />
      <div style={{
        padding: isMobile ? '18px 16px 80px' : '28px',
        maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20,
      }}>

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

        {/* Profile — feeds the AI's summaries */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Profile</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              JARVIS uses this to tailor how it summarizes your email.
            </p>
          </div>

          {profile === null ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading...</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={fieldLabel}>Display name</label>
                <input
                  value={profile.display_name ?? ''}
                  onChange={e => setField('display_name', e.target.value)}
                  placeholder="Your name"
                  style={fieldInput}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={fieldLabel}>Work type</label>
                <select value={profile.work_type ?? ''} onChange={e => setField('work_type', e.target.value)} style={fieldInput}>
                  <option value="">Not set</option>
                  {WORK_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={fieldLabel}>Email use</label>
                <select value={profile.email_use ?? ''} onChange={e => setField('email_use', e.target.value)} style={fieldInput}>
                  <option value="">Not set</option>
                  {EMAIL_USES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={fieldLabel}>Preferred tone</label>
                <select value={profile.preferred_tone ?? ''} onChange={e => setField('preferred_tone', e.target.value)} style={fieldInput}>
                  <option value="">Not set</option>
                  {TONES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={fieldLabel}>Custom instructions</label>
                <textarea
                  value={profile.custom_instructions ?? ''}
                  onChange={e => setField('custom_instructions', e.target.value)}
                  placeholder="Anything JARVIS should know about how you like your emails?"
                  rows={3}
                  style={{ ...fieldInput, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={saveProfile} disabled={savingProfile} style={{
                  padding: '9px 18px', borderRadius: 8, border: 'none',
                  cursor: savingProfile ? 'not-allowed' : 'pointer',
                  background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
                  opacity: savingProfile ? 0.6 : 1,
                }}>
                  {savingProfile ? 'Saving...' : 'Save profile'}
                </button>
                {profileSaved && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#22c55e' }}>
                    <Check size={14} /> Saved
                  </span>
                )}
              </div>
            </>
          )}
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Gmail connected
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{gmailAccount.email_address}</p>
              </div>
              {disconnectStep === 'confirm' ? (
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={handleDisconnect} style={{
                    padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', fontSize: 12, fontWeight: 600,
                  }}>
                    Confirm disconnect
                  </button>
                  <button onClick={() => setDisconnectStep('idle')} style={{
                    padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontSize: 12,
                  }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDisconnectStep('confirm')}
                  disabled={disconnectStep === 'busy'}
                  style={{
                    padding: '6px 12px', borderRadius: 7, flexShrink: 0,
                    cursor: disconnectStep === 'busy' ? 'not-allowed' : 'pointer',
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: 12, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; e.currentTarget.style.color = '#ef4444' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  {disconnectStep === 'busy' ? 'Disconnecting...' : 'Disconnect'}
                </button>
              )}
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

        {/* Privacy — persistent reminder of what was shown at onboarding */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Privacy</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRIVACY_POINTS.map(({ icon: Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Icon size={14} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

const fieldLabel: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)',
}

const fieldInput: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 7,
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<TopBar title="Settings" />}>
      <SettingsPageInner />
    </Suspense>
  )
}
