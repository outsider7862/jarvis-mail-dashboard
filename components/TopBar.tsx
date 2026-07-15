'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, X, Mail, Users, CalendarClock, ShieldAlert, LogOut, User, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getPendingNotifications, markNotified } from '@/lib/api'
import { formatReceived } from '@/lib/format'
import { EmailAnalysis } from '@/types'

// ─── Command palette ──────────────────────────────────────────────────────────

const COMMANDS = [
  { label: 'Go to Overview',       icon: Mail,          href: '/dashboard' },
  { label: 'Go to Inbox',          icon: Mail,          href: '/dashboard/inbox' },
  { label: 'Go to Leads',          icon: Users,         href: '/dashboard/leads' },
  { label: 'Go to Alerts',         icon: Bell,          href: '/dashboard/notifications' },
  { label: 'Go to Settings',       icon: Settings,      href: '/dashboard/settings' },
  { label: 'Filter: Leads',        icon: Users,         href: '/dashboard/inbox?is_business_lead=true' },
  { label: 'Filter: Invoices',     icon: Mail,          href: '/dashboard/inbox?is_invoice=true' },
  { label: 'Filter: Meetings',     icon: CalendarClock, href: '/dashboard/inbox?is_meeting=true' },
  { label: 'Filter: Phishing',     icon: ShieldAlert,   href: '/dashboard/inbox?is_phishing=true' },
]

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [idx, setIdx]     = useState(0)
  const router            = useRouter()
  const inputRef          = useRef<HTMLInputElement>(null)

  const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setIdx(0) }, [query])

  function go(href: string) { router.push(href); onClose() }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && filtered[idx]) go(filtered[idx].href)
    if (e.key === 'Escape') onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 50, backdropFilter: 'blur(2px)',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 520, zIndex: 51,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            ref={inputRef}
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search commands..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 15,
            }}
          />
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', padding: 0,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px' }}>
          {filtered.length === 0 ? (
            <p style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No commands found
            </p>
          ) : filtered.map((cmd, i) => (
            <button key={cmd.href} onClick={() => go(cmd.href)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: i === idx ? 'var(--bg-overlay)' : 'transparent',
              color: i === idx ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: 14, textAlign: 'left', transition: 'background 0.1s',
            }}
              onMouseEnter={() => setIdx(i)}
            >
              <cmd.icon size={15} />
              {cmd.label}
            </button>
          ))}
        </div>

        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 16,
        }}>
          {[['↑↓', 'navigate'], ['↵', 'select'], ['esc', 'close']].map(([key, desc]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)' }}>
              <kbd style={{
                padding: '1px 6px', borderRadius: 4, fontSize: 11,
                background: 'var(--bg-overlay)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}>{key}</kbd>
              {desc}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Notification dropdown ────────────────────────────────────────────────────

function NotificationDropdown({ onClose, onItemOpen, onClearAll, onLoaded }: {
  onClose: () => void
  onItemOpen: (id: string) => void
  onClearAll: (ids: string[]) => void
  onLoaded: (count: number) => void
}) {
  const [items, setItems]     = useState<EmailAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const ref                   = useRef<HTMLDivElement>(null)
  const router                = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      try {
        const results = await getPendingNotifications(data.session.access_token)
        setItems(results)
        onLoaded(results.length)
      }
      finally { setLoading(false) }
    })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      width: 340, background: 'var(--bg-elevated)',
      border: '1px solid var(--border)', borderRadius: 12,
      boxShadow: '0 16px 32px rgba(0,0,0,0.4)', zIndex: 40, overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Alerts</span>
          {items.length > 0 && (
            <span style={{
              padding: '1px 7px', borderRadius: 20,
              background: 'var(--accent-subtle)', border: '1px solid rgba(59,130,246,0.25)',
              fontSize: 11, fontWeight: 700, color: 'var(--accent)',
            }}>{items.length}</span>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={() => { onClearAll(items.map(i => i.id)); setItems([]) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 12, color: 'var(--text-muted)', transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Clear all
          </button>
        )}
      </div>

      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No pending alerts
          </div>
        ) : items.map(item => (
          <div
            key={item.id}
            onClick={() => { onItemOpen(item.id); router.push(`/dashboard/inbox?id=${item.id}`); onClose() }}
            style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
              borderLeft: item.is_phishing ? '3px solid #ef4444' : '3px solid var(--accent)',
              cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {item.is_phishing && <ShieldAlert size={12} color="#ef4444" />}
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                color: item.is_phishing ? '#ef4444' : 'var(--accent)',
              }}>
                {item.category.replace('_', ' ').toUpperCase()}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>
                {formatReceived(item.received_at ?? item.created_at)}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {item.summary.length > 80 ? item.summary.slice(0, 80) + '...' : item.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Profile dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({ email, onClose }: { email: string; onClose: () => void }) {
  const router = useRouter()
  const ref    = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div ref={ref} style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      width: 220, background: 'var(--bg-elevated)',
      border: '1px solid var(--border)', borderRadius: 12,
      boxShadow: '0 16px 32px rgba(0,0,0,0.4)', zIndex: 40, overflow: 'hidden',
    }}>
      {/* User info */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--accent)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {email ? email[0].toUpperCase() : '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Free plan</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div style={{ padding: '6px' }}>
        {[
          { icon: User,     label: 'Profile',  action: () => { router.push('/dashboard/settings'); onClose() } },
          { icon: Settings, label: 'Settings', action: () => { router.push('/dashboard/settings'); onClose() } },
        ].map(({ icon: Icon, label, action }) => (
          <button key={label} onClick={action} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: 'transparent', color: 'var(--text-secondary)',
            fontSize: 13, textAlign: 'left', transition: 'all 0.1s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-overlay)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}

        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

        <button onClick={signOut} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
          background: 'transparent', color: '#ef4444',
          fontSize: 13, textAlign: 'left', transition: 'all 0.1s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  )
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

export function TopBar({ title }: { title: string }) {
  const [email, setEmail]               = useState('')
  const [showPalette, setShowPalette]   = useState(false)
  const [showNotifs, setShowNotifs]     = useState(false)
  const [showProfile, setShowProfile]   = useState(false)
  const [notifCount, setNotifCount]     = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
    // Load unread count for the badge
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      try {
        const items = await getPendingNotifications(data.session.access_token)
        setNotifCount(items.length)
      } catch { /* silent */ }
    })
  }, [])

  // Mark alerts as seen (the badge counts pending ones — clearing them is what
  // makes the count go down). API calls live here, not in the dropdown, so they
  // survive the dropdown closing/unmounting mid-flight.
  async function clearNotification(id: string) {
    setNotifCount(c => Math.max(0, c - 1))
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    try { await markNotified(data.session.access_token, id) } catch { /* silent */ }
  }

  async function clearAllNotifications(ids: string[]) {
    setNotifCount(0)
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    await Promise.allSettled(ids.map(id => markNotified(data.session!.access_token, id)))
  }

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowPalette(p => !p)
      }
      if (e.key === 'Escape') {
        setShowPalette(false)
        setShowNotifs(false)
        setShowProfile(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const initials = email ? email[0].toUpperCase() : '?'

  return (
    <>
      <header style={{
        height: 60, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 28px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* Search / Command palette trigger */}
          <button onClick={() => setShowPalette(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 12px', borderRadius: 8,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <Search size={14} />
            <span>Search...</span>
            <span style={{
              padding: '1px 6px', borderRadius: 4, fontSize: 11,
              background: 'var(--bg-overlay)', border: '1px solid var(--border)',
            }}>⌘K</span>
          </button>

          {/* Notification bell */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowNotifs(p => !p); setShowProfile(false) }} style={{
              width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
              background: showNotifs ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
              border: `1px solid ${showNotifs ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: showNotifs ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'all 0.15s', position: 'relative',
            }}>
              <Bell size={16} />
              {notifCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#ef4444', border: '2px solid var(--bg-surface)',
                  fontSize: 9, fontWeight: 700, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            {showNotifs && (
              <NotificationDropdown
                onClose={() => setShowNotifs(false)}
                onItemOpen={clearNotification}
                onClearAll={clearAllNotifications}
                onLoaded={setNotifCount}
              />
            )}
          </div>

          {/* Avatar / Profile */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setShowProfile(p => !p); setShowNotifs(false) }} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
              cursor: 'pointer', border: showProfile ? '2px solid rgba(255,255,255,0.4)' : '2px solid transparent',
              transition: 'border-color 0.15s',
            }}>
              {initials}
            </button>
            {showProfile && <ProfileDropdown email={email} onClose={() => setShowProfile(false)} />}
          </div>
        </div>
      </header>

      {/* Command palette rendered outside header so it's not clipped */}
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
    </>
  )
}
