'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getMorningBrief, getNeedsAttention, getConnectedAccounts, getCalendarEvents } from '@/lib/api'
import { MorningBrief, EmailAnalysis, ConnectedAccountInfo, CalendarEvent } from '@/types'
import { TopBar } from '@/components/TopBar'
import { StatCard } from '@/components/ui/StatCard'
import { CategoryBadge, PriorityBadge } from '@/components/ui/Badge'
import { formatReceived, senderName } from '@/lib/format'
import { EVENT_COLORS } from '@/lib/calendar'
import { useIsMobile } from '@/lib/useIsMobile'
import { Users, Receipt, CalendarClock, ListTodo, ShieldAlert, Clock, Mail, ArrowRight, CheckCircle2, Heart, Package, KeyRound, ShieldCheck } from 'lucide-react'

export default function OverviewPage() {
  const [brief, setBrief] = useState<MorningBrief | null>(null)
  const [attention, setAttention] = useState<EmailAnalysis[] | null>(null)
  const [accounts, setAccounts] = useState<ConnectedAccountInfo[] | null>(null)
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hour, setHour] = useState(0)
  const router = useRouter()
  const isMobile = useIsMobile()

  useEffect(() => {
    setHour(new Date().getHours())
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const token = data.session.access_token
      try {
        const [b, needs, accs, events] = await Promise.allSettled([
          getMorningBrief(token),
          getNeedsAttention(token),
          getConnectedAccounts(token),
          // Next confirmed events from now forward.
          getCalendarEvents(token, { status: 'confirmed', from_date: new Date().toISOString() }),
        ])
        if (b.status === 'fulfilled') setBrief(b.value)
        if (needs.status === 'fulfilled') setAttention(needs.value)
        if (accs.status === 'fulfilled') setAccounts(accs.value)
        if (events.status === 'fulfilled') setUpcoming(events.value.slice(0, 3))
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const greeting =
    hour < 12 ? 'Good morning' :
      hour < 17 ? 'Good afternoon' : 'Good evening'

  const noInboxConnected = accounts !== null && !accounts.some(a => a.active)
  // 3 stat cards side by side is unreadable on a phone.
  const gridCols = isMobile ? '1fr' : 'repeat(3, 1fr)'

  const cards = brief ? [
    { label: 'Business Leads', value: brief.business_leads, icon: Users, iconColor: '#22c55e', sub: 'Pending your review', href: '/dashboard/inbox?is_business_lead=true' },
    { label: 'Invoices', value: brief.invoices, icon: Receipt, iconColor: '#f59e0b', sub: 'Require action', href: '/dashboard/inbox?is_invoice=true' },
    { label: 'Orders', value: brief.orders, icon: Package, iconColor: '#06b6d4', sub: 'Shipping & receipts', href: '/dashboard/inbox?is_order=true' },
    { label: 'Meetings Today', value: brief.meetings_today, icon: CalendarClock, iconColor: '#a78bfa', sub: 'In the last 24h', href: '/dashboard/inbox?is_meeting=true' },
    { label: 'Follow-ups', value: brief.follow_ups, icon: ListTodo, iconColor: '#38bdf8', sub: 'Unresolved items', href: '/dashboard/inbox' },
    { label: 'OTPs', value: brief.otps, icon: KeyRound, iconColor: '#8b5cf6', sub: 'Verification codes', href: '/dashboard/inbox?is_otp=true' },
    { label: 'Security Alerts', value: brief.security_alerts, icon: ShieldCheck, iconColor: '#f97316', sub: 'Account activity', href: '/dashboard/inbox?is_security_alert=true' },
    { label: 'Phishing Alerts', value: brief.possible_phishing, icon: ShieldAlert, iconColor: '#ef4444', sub: 'Review carefully', href: '/dashboard/inbox?is_phishing=true' },
    { label: 'Personal', value: brief.personal, icon: Heart, iconColor: '#ec4899', sub: 'Friends & family', href: '/dashboard/inbox?category=personal' },
    { label: 'Time to clear', value: `~${brief.estimated_minutes}m`, icon: Clock, iconColor: '#3b82f6', sub: 'Estimated today', href: '/dashboard/inbox' },
  ] : []

  return (
    <>
      <TopBar title="Overview" />
      <div style={{
        padding: isMobile ? '20px 16px 80px' : '32px 28px',
        display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 28,
      }}>

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
          borderRadius: 12, padding: isMobile ? '20px' : '24px 28px',
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between', gap: 14,
          flexDirection: isMobile ? 'column' : 'row',
        }}>
          <div>
            <h2 style={{ fontSize: isMobile ? 19 : 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 16 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} style={{
                height: 110, borderRadius: 12,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
          </div>
        ) : brief ? (
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 16 }}>
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

        {/* Upcoming events */}
        {!loading && (
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming</h3>
              <a href="/dashboard/calendar" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                View calendar →
              </a>
            </div>
            {upcoming.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No upcoming events.</p>
            ) : upcoming.map(event => (
              <div
                key={event.id}
                onClick={() => router.push('/dashboard/calendar')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: EVENT_COLORS[event.event_type] }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.title}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(event.start_at).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: event.all_day ? undefined : '2-digit',
                      minute: event.all_day ? undefined : '2-digit',
                    })}
                    {event.all_day ? ' · All day' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
