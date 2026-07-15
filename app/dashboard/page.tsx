'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getMorningBrief, getNeedsAttention, getConnectedAccounts } from '@/lib/api'
import { MorningBrief, EmailAnalysis, ConnectedAccountInfo } from '@/types'
import { TopBar } from '@/components/TopBar'
import { StatCard } from '@/components/ui/StatCard'
import { CategoryBadge, PriorityBadge } from '@/components/ui/Badge'
import { formatReceived, senderName } from '@/lib/format'
import { Users, Receipt, CalendarClock, ListTodo, ShieldAlert, Clock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function OverviewPage() {
  const [brief, setBrief] = useState<MorningBrief | null>(null)
  const [attention, setAttention] = useState<EmailAnalysis[] | null>(null)
  const [accounts, setAccounts] = useState<ConnectedAccountInfo[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [hour, setHour] = useState(0)
  const router = useRouter()

  useEffect(() => {
    setHour(new Date().getHours())
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const token = data.session.access_token
      try {
        const [b, needs, accs] = await Promise.allSettled([
          getMorningBrief(token),
          getNeedsAttention(token),
          getConnectedAccounts(token),
        ])
        if (b.status === 'fulfilled') setBrief(b.value)
        if (needs.status === 'fulfilled') setAttention(needs.value)
        if (accs.status === 'fulfilled') setAccounts(accs.value)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const greeting =
    hour < 12 ? 'Good morning' :
      hour < 17 ? 'Good afternoon' : 'Good evening'

  const noInboxConnected = accounts !== null && !accounts.some(a => a.active)

  const cards = brief ? [
    { label: 'Business Leads', value: brief.business_leads, icon: Users, iconColor: '#22c55e', sub: 'Pending your review', href: '/dashboard/inbox?is_business_lead=true' },
    { label: 'Invoices', value: brief.invoices, icon: Receipt, iconColor: '#f59e0b', sub: 'Require action', href: '/dashboard/inbox?is_invoice=true' },
    { label: 'Meetings Today', value: brief.meetings_today, icon: CalendarClock, iconColor: '#a78bfa', sub: 'In the last 24h', href: '/dashboard/inbox?is_meeting=true' },
    { label: 'Follow-ups', value: brief.follow_ups, icon: ListTodo, iconColor: '#38bdf8', sub: 'Unresolved items', href: '/dashboard/inbox' },
    { label: 'Phishing Alerts', value: brief.possible_phishing, icon: ShieldAlert, iconColor: '#ef4444', sub: 'Review carefully', href: '/dashboard/inbox?is_phishing=true' },
    { label: 'Time to clear', value: `~${brief.estimated_minutes}m`, icon: Clock, iconColor: '#3b82f6', sub: 'Estimated today', href: '/dashboard/inbox' },
  ] : []

  return (
    <>
      <TopBar title="Overview" />
      <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* First-run onboarding — a new account with no inbox has nothing else to do here */}
        {noInboxConnected && (
          <div style={{
            background: 'var(--accent-subtle)', border: '1px solid rgba(59,130,246,0.35)',
            borderRadius: 12, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Mail size={20} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  Connect your Gmail to get started
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Jarvis triages every incoming email — leads, invoices, meetings, and phishing warnings land here automatically.
                </p>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard/settings')} style={{
              display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
              padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
            >
              Connect Gmail <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Morning brief header */}
        <div style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '24px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {greeting}. 👋
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
              {loading
                ? 'Loading your briefing...'
                : `Here's what needs your attention today.`}
            </p>
          </div>
          {brief && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 8,
              background: 'var(--accent-subtle)', border: '1px solid rgba(59,130,246,0.25)',
            }}>
              <Clock size={14} color="var(--accent)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                ~{brief.estimated_minutes} min estimated
              </span>
            </div>
          )}
        </div>

        {/* Stat cards — Bento grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                height: 110, borderRadius: 12,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        ) : brief ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {cards.map(card => (
              <div key={card.label} onClick={() => router.push(card.href)} style={{ cursor: 'pointer' }}>
                <StatCard
                  label={card.label}
                  value={card.value}
                  icon={card.icon}
                  iconColor={card.iconColor}
                  sub={card.sub}
                />
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Could not load briefing. Is the backend running?</p>
        )}

        {/* Needs attention — the actual items behind the counts */}
        {!loading && attention !== null && (
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Needs attention</h3>
            </div>
            {attention.length === 0 ? (
              <div style={{
                padding: '28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <CheckCircle2 size={18} color="#22c55e" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Nothing urgent right now — you're all clear.
                </span>
              </div>
            ) : (
              attention.map(item => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/dashboard/inbox?id=${item.id}`)}
                  style={{
                    padding: '14px 24px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <PriorityBadge priority={item.priority} />
                    <CategoryBadge category={item.category} />
                  </div>
                  <p style={{
                    flex: 1, fontSize: 13, color: 'var(--text-primary)', minWidth: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.sender && (
                      <span style={{ fontWeight: 600 }}>{senderName(item.sender)} — </span>
                    )}
                    {item.subject || item.summary}
                  </p>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {formatReceived(item.received_at ?? item.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </>
  )
}
