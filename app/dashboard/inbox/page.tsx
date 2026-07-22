'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getAnalyses, updateAnalysisStatus, getRawEmail } from '@/lib/api'
import { EmailAnalysis, Category, Priority, RawEmail } from '@/types'
import { TopBar } from '@/components/TopBar'
import { CategoryBadge, PriorityBadge, StatusBadge } from '@/components/ui/Badge'
import { ReplyPanel } from '@/components/ReplyPanel'
import { DecisionCard } from '@/components/DecisionCard'
import { formatReceived, senderName, gmailInboxUrl } from '@/lib/format'
import { useIsMobile } from '@/lib/useIsMobile'
import {
  CheckCheck, EyeOff, RefreshCw, Filter, Paperclip, ExternalLink,
  Inbox, Users, Receipt, CalendarClock, LifeBuoy, ShieldCheck, Newspaper, Ban, Heart, SearchX,
  ChevronDown, ArrowLeft,
  type LucideIcon,
} from 'lucide-react'

const PAGE_SIZE = 50
// Ceiling on what a background poll re-fetches, so someone who has paged deep
// doesn't trigger an ever-growing query every 12 seconds.
const MAX_REFRESH = 200

const CATEGORIES: { value: string; label: string; param: Record<string, string> }[] = [
  { value: '',                  label: 'All',         param: {} },
  { value: 'business_lead',     label: 'Leads',       param: { is_business_lead: 'true' } },
  { value: 'invoice',           label: 'Invoices',    param: { is_invoice: 'true' } },
  { value: 'order',             label: 'Orders',      param: { is_order: 'true' } },
  { value: 'meeting',           label: 'Meetings',    param: { is_meeting: 'true' } },
  { value: 'customer_support',  label: 'Support',     param: { is_customer_support: 'true' } },
  { value: 'otp',               label: 'OTPs',        param: { is_otp: 'true' } },
  { value: 'security_alert',    label: 'Security',    param: { is_security_alert: 'true' } },
  { value: 'phishing',          label: 'Phishing',    param: { is_phishing: 'true' } },
  { value: 'newsletter',        label: 'Newsletters', param: { is_newsletter: 'true' } },
  { value: 'spam',              label: 'Spam',        param: { is_spam: 'true' } },
  { value: 'personal',          label: 'Personal',    param: { category: 'personal' } },
]

// Flag-based tabs are reachable from multiple entry points (URL query, deep links) —
// this finds which tab a given search-params object corresponds to, if any.
function categoryFromSearchParams(sp: URLSearchParams): string {
  for (const c of CATEGORIES) {
    const [key, value] = Object.entries(c.param)[0] ?? []
    if (key && sp.get(key) === value) return c.value
  }
  return ''
}

// Per-tab empty states — an empty Phishing tab is good news and should read like it.
const EMPTY_STATES: Record<string, { icon: LucideIcon; title: string; sub: string; iconColor?: string }> = {
  '':                 { icon: Inbox,         title: 'No emails yet',        sub: 'New mail appears here as soon as it arrives.' },
  business_lead:      { icon: Users,         title: 'No leads right now',   sub: 'Inbound inquiries and referrals will show up here.' },
  invoice:            { icon: Receipt,       title: 'No invoices',          sub: 'Bills and payment requests will appear here.' },
  meeting:            { icon: CalendarClock, title: 'No meetings',          sub: 'Emails proposing or confirming meetings land here.' },
  customer_support:   { icon: LifeBuoy,      title: 'No support requests',  sub: 'Client issues and help requests will show up here.' },
  phishing:           { icon: ShieldCheck,   title: 'No phishing detected', sub: 'Your inbox looks clean.', iconColor: '#22c55e' },
  newsletter:         { icon: Newspaper,     title: 'No newsletters',       sub: 'Digests and mailing-list content lands here.' },
  spam:               { icon: Ban,           title: 'No spam',              sub: 'Nothing junky in sight.' },
  personal:           { icon: Heart,         title: 'No personal emails',   sub: 'Mail from friends and family shows up here.' },
}

function checkSuspiciousUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)

    // IP address as hostname
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true

    // Known URL shorteners
    const shorteners = [
      'bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly',
      'short.link', 'rb.gy', 'cutt.ly', 'is.gd', 'buff.ly'
    ]
    if (shorteners.some(s => hostname === s || hostname.endsWith('.' + s))) return true

    // Suspicious keywords in hostname
    const suspiciousKeywords = [
      'secure-', 'verify-', 'account-', 'login-', 'signin-',
      'update-', 'confirm-', 'banking-', 'paypal-', 'amazon-',
      'microsoft-', 'apple-', 'google-', 'support-'
    ]
    if (suspiciousKeywords.some(k => hostname.includes(k))) return true

    // Example/test domains
    if (hostname.endsWith('.example.com') || hostname === 'example.com') return true

    // Excessive subdomains (more than 3 dots in hostname)
    if ((hostname.match(/\./g) || []).length > 3) return true

    return false
  } catch {
    return false
  }
}

function renderBodyWithLinks(text: string, threadId: string | null) {
  // Regex to find URLs in plain text
  const urlRegex = /(https?:\/\/[^\s\])"]+)/g
  const parts = text.split(urlRegex)

  return parts.map((part, i) => {
    if (!urlRegex.test(part)) {
      // Reset regex lastIndex after test()
      urlRegex.lastIndex = 0
      return <span key={i}>{part}</span>
    }
    urlRegex.lastIndex = 0

    const isSuspicious = checkSuspiciousUrl(part)

    if (isSuspicious) {
      return (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 4, padding: '1px 6px',
            color: '#ef4444', fontSize: 12, fontFamily: 'monospace',
            textDecoration: 'line-through',
          }}>
            {part}
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '1px 6px', borderRadius: 4,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', fontSize: 10, fontWeight: 700,
          }}>
            ⚠ SUSPICIOUS
          </span>
        </span>
      )
    }

    return (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{
        color: 'var(--accent)', fontSize: 13, wordBreak: 'break-all',
      }}>
        {part}
      </a>
    )
  })
}

function InboxPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const [emails, setEmails] = useState<EmailAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState(() => categoryFromSearchParams(searchParams))
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<EmailAnalysis | null>(null)
  const [rawEmail, setRawEmail] = useState<RawEmail | null>(null)
  const [rawEmailLoading, setRawEmailLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [showOriginal, setShowOriginal] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const loadedCountRef = useRef(PAGE_SIZE)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  const buildParams = useCallback(() => {
    const activeCategory = CATEGORIES.find(c => c.value === category)
    const params: Record<string, string> = { ...activeCategory?.param }
    if (priority) params.priority = priority
    if (status) params.status = status
    if (keyword) params.keyword = keyword
    return params
  }, [category, priority, status, keyword])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    // A background poll re-fetches everything currently on screen, so new mail
    // shows up without collapsing pages the user already loaded. A fresh load
    // (filter change) resets to a single page.
    const limit = silent
      ? Math.min(Math.max(loadedCountRef.current, PAGE_SIZE), MAX_REFRESH)
      : PAGE_SIZE
    const results = await getAnalyses(data.session.access_token, {
      ...buildParams(), limit: String(limit), offset: '0',
    })
    setEmails(results)
    loadedCountRef.current = results.length
    setHasMore(results.length >= limit)
    // Keep the open detail panel in sync (e.g. status changed elsewhere) without resetting selection.
    setSelected(prev => prev ? results.find((e: EmailAnalysis) => e.id === prev.id) ?? prev : prev)
    if (!silent) setLoading(false)
  }, [buildParams])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const results = await getAnalyses(data.session.access_token, {
        ...buildParams(), limit: String(PAGE_SIZE), offset: String(emails.length),
      })
      setEmails(prev => {
        // A poll may have refreshed the list mid-request — drop any overlap
        // rather than rendering the same email twice.
        const seen = new Set(prev.map(e => e.id))
        const merged = [...prev, ...results.filter((e: EmailAnalysis) => !seen.has(e.id))]
        loadedCountRef.current = merged.length
        return merged
      })
      setHasMore(results.length >= PAGE_SIZE)
    } finally {
      setLoadingMore(false)
    }
  }

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
      openEmail(match)
      const activeCategory = CATEGORIES.find(c => c.value === category)
      const qs = new URLSearchParams(activeCategory?.param).toString()
      router.replace(qs ? `/dashboard/inbox?${qs}` : '/dashboard/inbox')
    }
  }, [searchParams, emails, router, category])

  useEffect(() => {
    // Collapse the raw email again when moving to a different one.
    setShowOriginal(false)
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

  async function markAs(id: string, newStatus: string) {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    await updateAnalysisStatus(data.session.access_token, id, newStatus)
    setEmails(prev => prev.map(e => e.id === id ? { ...e, status: newStatus as any } : e))
    setSelected(prev => prev && prev.id === id ? { ...prev, status: newStatus as any } : prev)
    if (newStatus === 'actioned') showToast('Marked as actioned')
    if (newStatus === 'dismissed') showToast('Email dismissed')
  }

  function openEmail(email: EmailAnalysis) {
    setSelected(email)
    if (email.status === 'new') markAs(email.id, 'read')
  }

  // ↑/↓ moves the selection, Esc closes the detail panel. Skipped while typing.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') { setSelected(null); return }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      if (emails.length === 0) return
      e.preventDefault()
      const idx = selected ? emails.findIndex(em => em.id === selected.id) : -1
      const next = e.key === 'ArrowDown'
        ? emails[Math.min(idx + 1, emails.length - 1)]
        : emails[Math.max(idx - 1, 0)]
      if (next && next.id !== selected?.id) openEmail(next)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [emails, selected])

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
      {/* Fixed to exactly the viewport minus the 60px top bar. No `flex: 1`:
          combined with the calc height it can grow past the viewport, which
          makes the whole page scroll — that's what pushed the filter bar and
          the detail-panel top out of view when opening an email from the
          bottom of the list. The two panels scroll internally instead. */}
      <div style={{ display: 'flex', overflow: 'hidden', height: 'calc(100vh - 60px)' }}>

        {/* Left: list — on mobile the list and detail are separate full-width
            views rather than a split pane; 420px of detail next to a list
            doesn't fit a phone. */}
        <div style={{
          width: isMobile ? '100%' : (selected ? 420 : '100%'),
          flexShrink: 0, height: '100%', minHeight: 0,
          display: isMobile && selected ? 'none' : 'flex',
          borderRight: !isMobile && selected ? '1px solid var(--border)' : 'none',
          flexDirection: 'column', overflow: 'hidden',
          transition: isMobile ? 'none' : 'width 0.2s',
        }}>
          {/* Filters — fixed header, never scrolls */}
          <div style={{
            flexShrink: 0,
            padding: '14px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 10,
            background: 'var(--bg-surface)',
          }}>
            {/* Category tabs — 12 of these don't fit the 420px panel, so scroll
                horizontally in one row rather than wrapping to several. */}
            <div style={{
              display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2,
              scrollbarWidth: 'thin',
            }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  style={{ ...filterTabStyle(category === c.value), flexShrink: 0, whiteSpace: 'nowrap' }}
                >
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
              <select value={status} onChange={e => setStatus(e.target.value)} style={{
                padding: '7px 10px', borderRadius: 7,
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 13, outline: 'none', cursor: 'pointer',
              }}>
                <option value="">All statuses</option>
                {['new', 'read', 'actioned', 'dismissed'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
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

          {/* Email list — the only thing that scrolls in the left panel */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
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
              (keyword || priority) ? (
                <div style={{
                  padding: '48px 24px', textAlign: 'center',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                }}>
                  <SearchX size={28} color="var(--text-muted)" />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {keyword ? `No results for “${keyword}”` : 'No emails match your filters'}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Try a different search, or clear the filters below.
                  </p>
                  <button onClick={() => { setKeyword(''); setPriority('') }} style={{
                    marginTop: 4, padding: '7px 16px', borderRadius: 7, cursor: 'pointer',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontSize: 13,
                  }}>
                    Clear filters
                  </button>
                </div>
              ) : (() => {
                const es = EMPTY_STATES[category] ?? EMPTY_STATES['']
                return (
                  <div style={{
                    padding: '48px 24px', textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  }}>
                    <es.icon size={28} color={es.iconColor ?? 'var(--text-muted)'} />
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{es.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{es.sub}</p>
                  </div>
                )
              })()
            ) : (
              emails.map(email => (
                <div key={email.id} onClick={() => openEmail(email)} style={{
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
                    <span
                      title={new Date(email.received_at ?? email.created_at).toLocaleString()}
                      style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}
                    >
                      {formatReceived(email.received_at ?? email.created_at)}
                    </span>
                  </div>
                  {(email.sender || email.subject) && (
                    <p style={{
                      fontSize: 13, color: 'var(--text-primary)',
                      fontWeight: email.status === 'new' ? 600 : 500,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: 2,
                    }}>
                      {email.sender ? senderName(email.sender) : ''}
                      {email.sender && email.subject ? ' — ' : ''}
                      {email.subject ?? ''}
                    </p>
                  )}
                  <p style={{
                    fontSize: email.sender || email.subject ? 12 : 13,
                    color: email.status === 'new' ? 'var(--text-secondary)' : 'var(--text-muted)',
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

            {/* Load more — deliberately a button, not infinite scroll: the list
                auto-refreshes every 12s and would shift under an infinite scroll. */}
            {!loading && hasMore && (
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'center' }}>
                <button onClick={loadMore} disabled={loadingMore} style={{
                  padding: '8px 18px', borderRadius: 8,
                  cursor: loadingMore ? 'not-allowed' : 'pointer',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { if (!loadingMore) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: detail panel — keyed on the email id so React mounts a fresh
            scroll container per email. A reused div keeps its old scrollTop, so
            opening an email from the bottom of the list left the panel scrolled
            down; a new element always starts at the top. */}
        {selected && (
          <div key={selected.id} style={{
            flex: 1, overflowY: 'auto', minHeight: 0, height: '100%',
            padding: isMobile ? '16px 16px 32px' : '24px 28px',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            {isMobile && (
              <button onClick={() => setSelected(null)} style={{
                display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500,
              }}>
                <ArrowLeft size={14} /> Back to inbox
              </button>
            )}
            {/* Header — the email's subject is the panel's title, so you know
                what you're looking at before reading the AI's take on it. */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <h2 style={{
                  fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                  lineHeight: 1.35, letterSpacing: '-0.01em',
                }}>
                  {selected.subject || rawEmail?.subject || '(no subject)'}
                </h2>
                {!isMobile && (
                  <button onClick={() => setSelected(null)} title="Close (Esc)" style={{
                    background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
                    color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 2,
                  }}>✕</button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {selected.sender && (
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {senderName(selected.sender)}
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {formatReceived(selected.received_at ?? selected.created_at)}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <CategoryBadge category={selected.category} />
                <PriorityBadge priority={selected.priority} />
                <StatusBadge status={selected.status} />
              </div>
            </div>

            {/* AI summary — the primary content of this panel, so it gets the
                accent edge and larger type; the raw email is secondary. */}
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
              borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em' }}>AI SUMMARY</span>
              <p style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.65 }}>{selected.summary}</p>
            </div>

            {/* Original email — collapsed by default so a long thread doesn't
                bury the action/deadline cards below it. */}
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <button
                onClick={() => setShowOriginal(o => !o)}
                aria-expanded={showOriginal}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  ORIGINAL EMAIL
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                  {showOriginal ? 'Hide' : 'Show'}
                  <ChevronDown size={14} style={{
                    transform: showOriginal ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
                  }} />
                </span>
              </button>

              {showOriginal && (rawEmailLoading ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading original email...</p>
              ) : rawEmail ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {rawEmail.subject || '(no subject)'}
                      </span>
                      {(rawEmail.message_id || rawEmail.thread_id) && (
                        <a
                          href={gmailInboxUrl(rawEmail.message_id, rawEmail.thread_id, rawEmail.connected_email)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                            fontSize: 12, color: 'var(--accent)', textDecoration: 'none',
                          }}
                        >
                          Open in Gmail <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
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

                  {/* Attachments */}
                  {rawEmail.attachments && rawEmail.attachments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                        ATTACHMENTS
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {rawEmail.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={gmailInboxUrl(rawEmail.message_id, rawEmail.thread_id, rawEmail.connected_email)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '8px 12px', borderRadius: 8, textDecoration: 'none',
                              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                              color: 'var(--text-secondary)', fontSize: 12,
                              transition: 'border-color 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                          >
                            <Paperclip size={13} color="var(--text-muted)" />
                            <span>{att.name ?? 'Attachment'}</span>
                            {att.size && (
                              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                ({Math.round(att.size / 1024)}KB)
                              </span>
                            )}
                            <ExternalLink size={11} color="var(--text-muted)" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{
                    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontFamily: 'inherit', maxHeight: 320, overflowY: 'auto',
                  }}>
                    {rawEmail.body_text ? renderBodyWithLinks(rawEmail.body_text, rawEmail.thread_id) : '(no body)'}
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Could not load the original email.</p>
              ))}
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
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
              {selected.confidence_explanation && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>
                  {selected.confidence_explanation}
                </p>
              )}
            </div>

            {/* Decision assistance — collapsed + lazy; keyed so it resets per email. */}
            <DecisionCard key={`decision-${selected.id}`} analysisId={selected.id} />

            {/* Reply — keyed on the email id so every field resets when you
                move to a different email. */}
            <ReplyPanel
              key={selected.id}
              analysis={selected}
              sender={selected.sender ?? rawEmail?.sender ?? null}
              connectedEmail={rawEmail?.connected_email ?? null}
            />

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

      {/* Toast confirmation */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 60,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 10,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          color: 'var(--text-primary)', fontSize: 13, fontWeight: 500,
        }}>
          <CheckCheck size={14} color="#22c55e" />
          {toast}
        </div>
      )}
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
