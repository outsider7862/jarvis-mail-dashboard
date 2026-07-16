'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getPendingNotifications, markNotified } from '@/lib/api'
import { EmailAnalysis } from '@/types'
import { TopBar } from '@/components/TopBar'
import { CategoryBadge, PriorityBadge } from '@/components/ui/Badge'
import { useIsMobile } from '@/lib/useIsMobile'
import { Bell, ShieldAlert, Users, CalendarClock, X, CheckCheck } from 'lucide-react'

function notifIcon(analysis: EmailAnalysis) {
  if (analysis.is_phishing)      return <ShieldAlert size={16} color="#ef4444" />
  if (analysis.is_business_lead) return <Users size={16} color="#22c55e" />
  if (analysis.is_meeting)       return <CalendarClock size={16} color="#a78bfa" />
  return <Bell size={16} color="var(--accent)" />
}

export default function NotificationsPage() {
  const [items, setItems]     = useState<EmailAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const isMobile = useIsMobile()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      try {
        const results = await getPendingNotifications(data.session.access_token)
        setItems(results)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  // Optimistically remove from the list; the API call finishes in the background.
  async function dismiss(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    try { await markNotified(data.session.access_token, id) } catch { /* silent */ }
  }

  async function clearAll() {
    const ids = items.map(i => i.id)
    setItems([])
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    await Promise.allSettled(ids.map(id => markNotified(data.session!.access_token, id)))
  }

  function openEmail(item: EmailAnalysis) {
    dismiss(item.id)
    router.push(`/dashboard/inbox?id=${item.id}`)
  }

  return (
    <>
      <TopBar title="Alerts" />
      <div style={{ padding: isMobile ? '18px 16px 80px' : '28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Pending alerts
            </h2>
            {items.length > 0 && (
              <span style={{
                padding: '2px 8px', borderRadius: 20,
                background: 'var(--accent-subtle)', border: '1px solid rgba(59,130,246,0.25)',
                fontSize: 12, fontWeight: 700, color: 'var(--accent)',
              }}>{items.length}</span>
            )}
          </div>
          {items.length > 0 && (
            <button onClick={clearAll} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              <CheckCheck size={13} /> Clear all
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{
                height: 72, borderRadius: 10,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          </div>
        ) : items.length === 0 ? (
          <div style={{
            padding: '60px 40px', textAlign: 'center',
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
          }}>
            <Bell size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, marginBottom: 4 }}>All caught up</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              New leads, meetings, and phishing warnings will show up here.
            </p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} onClick={() => openEmail(item)} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '16px 18px', cursor: 'pointer',
              display: 'flex', alignItems: 'flex-start', gap: 14,
              borderLeft: item.is_phishing ? '3px solid #ef4444' : '3px solid var(--accent)',
              transition: 'border-color 0.15s, background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {notifIcon(item)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <CategoryBadge category={item.category} />
                  <PriorityBadge priority={item.priority} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {item.summary}
                </p>
                {item.action_required && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    ↳ {item.action_required}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); dismiss(item.id) }}
                  title="Dismiss alert"
                  style={{
                    width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
                    background: 'none', border: '1px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-muted)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
