'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getDecisionAssistance } from '@/lib/api'
import { DecisionAssistance } from '@/types'
import { Brain, ChevronDown } from 'lucide-react'

/**
 * Collapsible decision-support card. Collapsed by default and lazy — the OpenAI
 * call only fires the first time it's expanded, so opening an email doesn't cost
 * a request unless the user actually wants the help.
 *
 * Mount with key={analysis.id} so it resets per email.
 */
export function DecisionCard({ analysisId }: { analysisId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [decision, setDecision] = useState<DecisionAssistance | null>(null)
  const [error, setError] = useState('')

  async function toggle() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (decision || loading) return  // already loaded, or in flight
    setLoading(true)
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      setDecision(await getDecisionAssistance(data.session.access_token, analysisId))
    } catch {
      setError('Could not analyze this email. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <button
        onClick={toggle}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={15} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Decision Assistance</span>
        </span>
        <ChevronDown size={15} color="var(--text-muted)" style={{
          transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
        }} />
      </button>

      {open && (
        <div style={{
          padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 16,
          borderTop: '1px solid var(--border)',
        }}>
          {loading ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', paddingTop: 16 }}>Analyzing...</p>
          ) : error ? (
            <div style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
              <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>
              <button onClick={toggle} style={{
                fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                Retry
              </button>
            </div>
          ) : decision ? (
            <>
              <div style={{ paddingTop: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  WHAT THEY WANT
                </span>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4, lineHeight: 1.5 }}>
                  {decision.what_sender_wants}
                </p>
              </div>

              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  YOUR OPTIONS
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                  {decision.available_options.map((opt, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', borderRadius: 7,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                        background: 'var(--bg-overlay)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                      }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{opt}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                padding: '14px', borderRadius: 8,
                background: 'var(--accent-subtle)', border: '1px solid rgba(59,130,246,0.25)',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em' }}>
                  JARVIS RECOMMENDS
                </span>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4, fontWeight: 500 }}>
                  {decision.recommendation}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                  {decision.reasoning}
                </p>
              </div>

              {decision.risks && decision.risks.length > 0 && (
                <div style={{
                  padding: '12px 14px', borderRadius: 8,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', letterSpacing: '0.06em' }}>
                    RISKS TO CONSIDER
                  </span>
                  <ul style={{ margin: '6px 0 0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {decision.risks.map((risk, i) => (
                      <li key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
