'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getLeads, updateLeadStatus } from '@/lib/api'
import { Lead } from '@/types'
import { TopBar } from '@/components/TopBar'
import { StatusBadge } from '@/components/ui/Badge'
import { formatReceived } from '@/lib/format'
import { useIsMobile } from '@/lib/useIsMobile'
import { CheckCircle, XCircle, Building2, Mail, DollarSign, Briefcase, Clock, ArrowUpRight } from 'lucide-react'

export default function LeadsPage() {
  const [leads, setLeads]     = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')
  const router = useRouter()
  const isMobile = useIsMobile()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const results = await getLeads(data.session.access_token, filter || undefined)
      setLeads(results)
      setLoading(false)
    }
    load()
  }, [filter])

  async function handleUpdate(id: string, status: 'confirmed' | 'rejected') {
    const { data } = await supabase.auth.getSession()
    if (!data.session) return
    await updateLeadStatus(data.session.access_token, id, status)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const filterStyle = (active: boolean) => ({
    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer',
    border: '1px solid', transition: 'all 0.15s',
    borderColor: active ? 'var(--accent)' : 'var(--border)',
    background: active ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
  })

  return (
    <>
      <TopBar title="Leads" />
      <div style={{ padding: isMobile ? '18px 16px 80px' : '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ v: '', l: 'All' }, { v: 'pending', l: 'Pending' }, { v: 'confirmed', l: 'Confirmed' }, { v: 'rejected', l: 'Rejected' }]
            .map(({ v, l }) => (
              <button key={v} onClick={() => setFilter(v)} style={filterStyle(filter === v)}>{l}</button>
            ))}
        </div>

        {/* Leads grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                height: 200, borderRadius: 12,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          </div>
        ) : leads.length === 0 ? (
          <div style={{
            padding: 60, textAlign: 'center',
            color: 'var(--text-muted)', fontSize: 14,
            background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
          }}>
            No leads yet — they'll appear here when emails are classified as business leads.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {leads.map(lead => (
              <div key={lead.id} style={{
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '20px',
                display: 'flex', flexDirection: 'column', gap: 14,
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {lead.client_name ?? 'Unknown'}
                    </p>
                    {lead.client_company && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <Building2 size={12} color="var(--text-muted)" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.client_company}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                    <StatusBadge status={lead.status} />
                    <span
                      title={new Date(lead.created_at).toLocaleString()}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}
                    >
                      <Clock size={11} />
                      {formatReceived(lead.created_at)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {lead.contact_email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Mail size={13} color="var(--text-muted)" />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lead.contact_email}</span>
                    </div>
                  )}
                  {lead.service_requested && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Briefcase size={13} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lead.service_requested}</span>
                    </div>
                  )}
                  {lead.budget_mentioned && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <DollarSign size={13} color="#22c55e" />
                      <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>{lead.budget_mentioned}</span>
                    </div>
                  )}
                </div>

                {/* Actions — only show for pending leads */}
                {lead.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={() => handleUpdate(lead.id, 'confirmed')} style={{
                      flex: 1, padding: '8px', borderRadius: 7, cursor: 'pointer',
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                      color: '#22c55e', fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}>
                      <CheckCircle size={13} /> Confirm
                    </button>
                    <button onClick={() => handleUpdate(lead.id, 'rejected')} style={{
                      flex: 1, padding: '8px', borderRadius: 7, cursor: 'pointer',
                      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                      color: '#ef4444', fontSize: 12, fontWeight: 600,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}>
                      <XCircle size={13} /> Reject
                    </button>
                  </div>
                )}

                {/* Jump to the email this lead was extracted from — the card is a
                    summary, the source thread is where the actual context lives. */}
                <button
                  onClick={() => router.push(`/dashboard/inbox?id=${lead.email_analysis_id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '7px', borderRadius: 7, cursor: 'pointer', width: '100%',
                    background: 'transparent', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontSize: 12, fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  View email <ArrowUpRight size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
