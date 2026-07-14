'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getMorningBrief } from '@/lib/api'
import { MorningBrief } from '@/types'
import { TopBar } from '@/components/TopBar'
import { StatCard } from '@/components/ui/StatCard'
import { Users, Receipt, CalendarClock, ListTodo, ShieldAlert, Clock } from 'lucide-react'

export default function OverviewPage() {
  const [brief, setBrief] = useState<MorningBrief | null>(null)
  const [loading, setLoading] = useState(true)
  const [hour, setHour] = useState(0)
  const router = useRouter()

  useEffect(() => {
    setHour(new Date().getHours())
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      try {
        const b = await getMorningBrief(data.session.access_token)
        setBrief(b)
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const greeting =
    hour < 12 ? 'Good morning' :
      hour < 17 ? 'Good afternoon' : 'Good evening'

  const cards = brief ? [
    { label: 'Business Leads', value: brief.business_leads, icon: Users, iconColor: '#22c55e', sub: 'Pending your review', href: '/dashboard/inbox?category=business_lead' },
    { label: 'Invoices', value: brief.invoices, icon: Receipt, iconColor: '#f59e0b', sub: 'Require action', href: '/dashboard/inbox?category=invoice' },
    { label: 'Meetings Today', value: brief.meetings_today, icon: CalendarClock, iconColor: '#a78bfa', sub: 'In the last 24h', href: '/dashboard/inbox?category=meeting' },
    { label: 'Follow-ups', value: brief.follow_ups, icon: ListTodo, iconColor: '#38bdf8', sub: 'Unresolved items', href: '/dashboard/inbox' },
    { label: 'Phishing Alerts', value: brief.possible_phishing, icon: ShieldAlert, iconColor: '#ef4444', sub: 'Review carefully', href: '/dashboard/inbox?category=phishing' },
    { label: 'Time to clear', value: `~${brief.estimated_minutes}m`, icon: Clock, iconColor: '#3b82f6', sub: 'Estimated today', href: '/dashboard/inbox' },
  ] : []

  return (
    <>
      <TopBar title="Overview" />
      <div style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 28 }}>

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
              {loading ? 'Loading your briefing...' : `Here's what needs your attention today.`}
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
      </div>
    </>
  )
}