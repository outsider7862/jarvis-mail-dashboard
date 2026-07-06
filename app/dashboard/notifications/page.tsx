'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getPendingNotifications } from '@/lib/api'
import { EmailAnalysis } from '@/types'
import { TopBar } from '@/components/TopBar'
import { CategoryBadge, PriorityBadge } from '@/components/ui/Badge'
import { Bell, ShieldAlert, Users, CalendarClock } from 'lucide-react'

function notifIcon(analysis: EmailAnalysis) {
  if (analysis.is_phishing)      return <ShieldAlert size={16} color="#ef4444" />
  if (analysis.is_business_lead) return <Users size={16} color="#22c55e" />
  if (analysis.is_meeting)       return <CalendarClock size={16} color="#a78bfa" />
  return <Bell size={16} color="var(--accent)" />
}

export default function NotificationsPage() {
  const [items, setItems]     = useState<EmailAnalysis[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <>
      <TopBar title="Alerts" />
      <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

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
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No pending alerts.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '16px 18px',
              display: 'flex', alignItems: 'flex-start', gap: 14,
              borderLeft: item.is_phishing ? '3px solid #ef4444' : '3px solid var(--accent)',
              transition: 'border-color 0.15s',
            }}>
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
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  )
}
