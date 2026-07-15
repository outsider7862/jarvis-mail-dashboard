'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAnalyses, updateAnalysisStatus, getRawEmail } from '@/lib/api'
import { EmailAnalysis, Category, Priority, RawEmail } from '@/types'
import { TopBar } from '@/components/TopBar'
import { CategoryBadge, PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { CheckCheck, EyeOff, RefreshCw, Filter } from 'lucide-react'

const CATEGORIES: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'business_lead', label: 'Leads' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'meeting', label: 'Meetings' },
  { value: 'customer_support', label: 'Support' },
  { value: 'phishing', label: 'Phishing' },
  { value: 'newsletter', label: 'Newsletters' },
  { value: 'spam', label: 'Spam' },
  { value: 'personal', label: 'Personal' },
]

function InboxPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [emails, setEmails] = useState<EmailAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState(() => searchParams.get('category') ?? '')
  const [priority, setPriority] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<EmailAnalysis | null>(null)
  const [rawEmail, setRawEmail] = useState<RawEmail | null>(null)
  const [rawEmailLoading, setRawEmailLoading] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    const params: Record<string, string> = {}
    if (category) params.category = category
    if (priority) params.priority = priority
    if (keyword) params.keyword = keyword
    const results = await getAnalyses(data.session.access_token, params)
    setEmails(results)
    // Keep the open detail panel in sync (e.g. status changed elsewhere) without resetting selection.
    setSelected(prev => prev ? results.find((e: EmailAnalysis) => e.id === prev.id) ?? prev : prev)
    if (!silent) setLoading(false)
  }, [category, priority, keyword])

  useEffect(() => { load() }, [load])

  // Auto-refresh the list in the background so new emails show up without a manual reload.
  useEffect(() => {
    const interval = setInterval(() => load(true), 12000)
    return () => clearInterval(interval)
  }, [load])

  // Deep-link support: a notification click navigates here with ?id=<analysisId>.
  useEffect(() => {
    const targetId = searchParams.get('id')
    if (!targetId || emails.length === 0) return
    const match = emails.find(e => e.id === targetId)
    if (match) {
      setSelected(match)
      router.replace(category ? `/dashboard/inbox?category=${category}` : '/dashboard/inbox')
    }
  }, [searchParams, emails, router, category])

  useEffect(() => {
    if (!selected) { setRawEmail(null); return }
    let cancelled = false
    setRawEmail(null)
    setRawEmailLoading(true)
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      try {
        const raw = await getRawEmail(data.session.access_token, selected.id)
        if (!cancelled) setRawEmail(raw)
      } finally {
        if (!cancelled) setRawEmailLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [selected?.id])

  async function markAs(id: string, status: string) {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    await updateAnalysisStatus(data.session.access_token, id, status)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: status as any } : e))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as any } : null)
  }

  const filterTabStyle = (active: boolean) => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    border: '1px solid', transition: 'all 0.15s',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
    background: active ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
  })

  return (
    <>
      <TopBar title="Inbox" />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 60px)' }}>

        {/* Left: list */}
        <div style={{
          width: selected ? 420 : '100%', flexShrink: 0,
          borderRight: selected ? '1px solid var(--border)' : 'none',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          transition: 'width 0.2s',
        }}>
          {/* Filters */}
          <div style={{
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 10,
            background: 'var(--bg-surface)',
          }}>
            {/* Category tabs */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategory(c.value)} style={filterTabStyle(category === c.value)}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search + priority */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                placeholder="Search by keyword..."
                value={keyword} onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load()}
                style={{
                  flex: 1, padding: '7px 12px', borderRadius: 7,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                }}
              />
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{
                padding: '7px 10px', borderRadius: 7,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 13, outline: 'none', cursor: 'pointer',
              }}>
                <option value="">All priorities</option>
                {['low', 'medium', 'high', 'urgent'].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
              <button onClick={() => load()} style={{
                padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
              }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          {/* Email list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} style={{
                    height: 72, borderRadius: 8,
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
              </div>
            ) : emails.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No emails found.
              </div>
            ) : (
              emails.map(email => (
                <div key={email.id} onClick={() => setSelected(email)} style={{
                  padding: '14px 20px', cursor: 'pointer',
                  borderBottom: '1px solid var(--border-subtle)',
                  background: selected?.id === email.id ? 'var(--bg-elevated)' : 'transparent',
                  borderLeft: `3px solid ${email.status === 'new' ? 'var(--accent)' : 'transparent'}`,
                  transition: 'background 0.1s',
                }}
                  onMouseEnter={e => { if (selected?.id !== email.id) e.currentTarget.style.background = 'var(--bg-surface)' }}
                  onMouseLeave={e => { if (selected?.id !== email.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <CategoryBadge category={email.category} />
                      <PriorityBadge priority={email.priority} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(email.received_at ?? email.created_at).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13, color: email.status === 'new' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: email.status === 'new' ? 500 : 400,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {email.summary}
                  </p>
                  {email.action_required && (
                    <p style={{
                      fontSize: 12, color: 'var(--text-muted)', marginTop: 3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      ↳ {email.action_required}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: detail panel */}
        {selected && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <CategoryBadge category={selected.category} />
                <PriorityBadge priority={selected.priority} />
                <StatusBadge status={selected.status} />
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 18, lineHeight: 1,
              }}>✕</button>
            </div>

            {/* Summary card */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>AI SUMMARY</span>
              <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>{selected.summary}</p>
            </div>

            {/* Original email */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ORIGINAL EMAIL</span>
              {rawEmailLoading ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading original email...</p>
              ) : rawEmail ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {rawEmail.subject || '(no subject)'}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      From: {rawEmail.sender || 'Unknown sender'}
                    </span>
                    {rawEmail.received_at && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(rawEmail.received_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
                    whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto',
                  }}>
                    {rawEmail.body_text || '(no body)'}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Could not load the original email.</p>
              )}
            </div>

            {/* Action / deadline */}
            {(selected.action_required || selected.deadline) && (
              <div style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {selected.action_required && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>ACTION REQUIRED</span>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4 }}>{selected.action_required}</p>
                  </div>
                )}
                {selected.deadline && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', letterSpacing: '0.06em' }}>DEADLINE</span>
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', marginTop: 4 }}>{selected.deadline}</p>
                  </div>
                )}
              </div>
            )}

            {/* Confidence */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '14px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>AI Confidence</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 120, height: 6, borderRadius: 3,
                  background: 'var(--bg-elevated)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${Math.round(selected.confidence * 100)}%`,
                    background: selected.confidence > 0.75 ? '#22c55e' : selected.confidence > 0.5 ? '#f59e0b' : '#ef4444',
                  }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {Math.round(selected.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => markAs(selected.id, 'actioned')} style={{
                flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                color: '#22c55e', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <CheckCheck size={14} /> Mark actioned
              </button>
              <button onClick={() => markAs(selected.id, 'dismissed')} style={{
                flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <EyeOff size={14} /> Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={<TopBar title="Inbox" />}>
      <InboxPageInner />
    </Suspense>
  )
}
