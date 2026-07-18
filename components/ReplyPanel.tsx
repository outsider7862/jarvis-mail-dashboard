'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getQuickActions, draftReply, rewriteDraft, saveReplyFeedback } from '@/lib/api'
import { ChatTurn, EmailAnalysis, ReplyDraft } from '@/types'
import { senderEmail } from '@/lib/format'
import { Sparkles, ArrowLeft, Pencil, ExternalLink, MessageCircle, Copy, Check } from 'lucide-react'

/**
 * JARVIS reply drafting. Four states: closed → quick actions → draft → rewrite.
 *
 * Mount this with key={analysis.id} — remounting on a new email resets every
 * field here, which is more reliable than clearing eleven pieces of state by hand.
 *
 * Nothing here sends mail. The final step opens Gmail's compose window with the
 * draft prefilled; the user reviews and sends it themselves.
 */
export function ReplyPanel({ analysis, sender }: { analysis: EmailAnalysis; sender: string | null }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [quickActions, setQuickActions] = useState<string[]>([])
  const [clarifyingQ, setClarifyingQ] = useState<string | null>(null)
  const [loadingActions, setLoadingActions] = useState(false)
  const [intent, setIntent] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [draft, setDraft] = useState<ReplyDraft | null>(null)
  const [originalDraft, setOriginalDraft] = useState('')   // for the feedback diff
  const [rewriteMode, setRewriteMode] = useState(false)
  const [rewriteInstruction, setRewriteInstruction] = useState('')
  const [history, setHistory] = useState<ChatTurn[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function openReply() {
    setReplyOpen(true)
    setLoadingActions(true)
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const result = await getQuickActions(data.session.access_token, analysis.id)
      setQuickActions(result.actions ?? [])
      setClarifyingQ(result.clarifying_question ?? null)
    } catch {
      setError('Could not load reply suggestions.')
    } finally {
      setLoadingActions(false)
    }
  }

  async function handleDraft() {
    if (!intent.trim()) return
    setDrafting(true)
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const result = await draftReply(
        data.session.access_token,
        analysis.id,
        intent,
        history.length > 0 ? history : undefined,
      )
      if (result.clarifying_question) {
        // JARVIS wants more info — surface the question instead of guessing.
        setClarifyingQ(result.clarifying_question)
        setHistory(prev => [
          ...prev,
          { role: 'user', content: intent },
          { role: 'assistant', content: result.clarifying_question },
        ])
        setIntent('')
      } else {
        setClarifyingQ(null)
        setDraft({ subject: result.subject, body: result.body })
        setOriginalDraft(result.body)
        setHistory(prev => [
          ...prev,
          { role: 'user', content: intent },
          { role: 'assistant', content: result.body },
        ])
      }
    } catch {
      setError('Could not draft a reply. Try again.')
    } finally {
      setDrafting(false)
    }
  }

  async function handleRewrite() {
    if (!rewriteInstruction.trim() || !draft) return
    setDrafting(true)
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const result = await rewriteDraft(
        data.session.access_token,
        analysis.id,
        draft.body,
        rewriteInstruction,
        history,
      )
      setDraft({ subject: result.subject || draft.subject, body: result.body })
      setHistory(prev => [
        ...prev,
        { role: 'user', content: rewriteInstruction },
        { role: 'assistant', content: result.body },
      ])
      setRewriteInstruction('')
      setRewriteMode(false)
    } catch {
      setError('Could not rewrite the draft. Try again.')
    } finally {
      setDrafting(false)
    }
  }

  // Fire-and-forget: the Gmail tab opens regardless, so a failed save must never
  // block the user from sending.
  async function recordFeedback() {
    if (!draft) return
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      await saveReplyFeedback(data.session.access_token, {
        analysis_id: analysis.id,
        intent,
        category: analysis.category,
        original_draft: originalDraft,
        edited_draft: draft.body,
      })
    } catch { /* silent — learning is best-effort */ }
  }

  // Copying is the same signal as opening Gmail — the user has settled on this
  // draft and is taking it elsewhere — so it records feedback too.
  async function copyDraft() {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(draft.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      recordFeedback()
    } catch {
      setError('Could not copy — your browser blocked clipboard access.')
    }
  }

  const gmailUrl = draft
    ? `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${encodeURIComponent(sender ? senderEmail(sender) : '')}&su=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
    : '#'

  // ── State 1: closed ─────────────────────────────────────────────────────────
  if (!replyOpen) {
    return (
      <button onClick={openReply} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: '11px', borderRadius: 8, border: 'none', cursor: 'pointer', width: '100%',
        background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 600,
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
      >
        <Sparkles size={15} /> Reply with JARVIS
      </button>
    )
  }

  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* ── State 3/4: draft ready ── */}
      {draft ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em' }}>
              JARVIS DRAFT
            </span>
            <button
              onClick={() => { setDraft(null); setRewriteMode(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: 12,
              }}
            >
              <ArrowLeft size={12} /> Back
            </button>
          </div>

          <input
            value={draft.subject}
            onChange={e => setDraft(prev => prev ? { ...prev, subject: e.target.value } : null)}
            placeholder="Subject"
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 7,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, outline: 'none',
            }}
          />

          <textarea
            value={draft.body}
            onChange={e => setDraft(prev => prev ? { ...prev, body: e.target.value } : null)}
            rows={10}
            style={{
              width: '100%', padding: '12px', borderRadius: 7, resize: 'vertical',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.6,
              outline: 'none', fontFamily: 'inherit',
            }}
          />

          {!rewriteMode ? (
            <button onClick={() => setRewriteMode(true)} disabled={drafting} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'none', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-secondary)', padding: '8px', fontSize: 12,
              cursor: drafting ? 'not-allowed' : 'pointer',
            }}>
              <Pencil size={12} /> Ask JARVIS to rewrite
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                value={rewriteInstruction}
                onChange={e => setRewriteInstruction(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !drafting) handleRewrite() }}
                placeholder="e.g. make it shorter, be more firm about the price..."
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 7,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                }}
              />
              <button onClick={() => { setRewriteMode(false); setRewriteInstruction('') }} style={{
                padding: '8px 12px', borderRadius: 7, background: 'var(--bg-elevated)',
                border: '1px solid var(--border)', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 12,
              }}>
                Cancel
              </button>
            </div>
          )}

          {drafting && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              JARVIS is rewriting...
            </p>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <a
              href={gmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={recordFeedback}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px', borderRadius: 8, textDecoration: 'none',
                background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 600,
              }}
            >
              Open in Gmail to send <ExternalLink size={13} />
            </a>
            <button
              onClick={copyDraft}
              title="Copy draft to clipboard"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--bg-elevated)',
                border: `1px solid ${copied ? '#22c55e' : 'var(--border)'}`,
                color: copied ? '#22c55e' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
              }}
            >
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            JARVIS never sends emails automatically. You always review first.
          </p>
        </>
      ) : (
        /* ── State 2: choose an intent ── */
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
              REPLY WITH JARVIS
            </span>
            <button onClick={() => setReplyOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 12,
            }}>
              Cancel
            </button>
          </div>

          {clarifyingQ && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              padding: '12px 14px', borderRadius: 8,
              background: 'var(--accent-subtle)', border: '1px solid rgba(59,130,246,0.25)',
            }}>
              <MessageCircle size={14} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: 'var(--accent)', lineHeight: 1.5 }}>{clarifyingQ}</p>
            </div>
          )}

          {loadingActions ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Reading the email...</p>
          ) : (
            quickActions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {quickActions.map(action => (
                  <button
                    key={action}
                    onClick={() => setIntent(action)}
                    style={{
                      padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                      fontSize: 12, fontWeight: 500, transition: 'all 0.12s',
                      border: `1px solid ${intent === action ? 'var(--accent)' : 'var(--border)'}`,
                      background: intent === action ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                      color: intent === action ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            )
          )}

          <textarea
            value={intent}
            onChange={e => setIntent(e.target.value)}
            placeholder={clarifyingQ ? 'Answer the question above...' : 'Or describe what you want to say...'}
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 7, resize: 'vertical',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5,
              outline: 'none', fontFamily: 'inherit',
            }}
          />

          <button
            onClick={handleDraft}
            disabled={!intent.trim() || drafting}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px', borderRadius: 8, border: 'none',
              cursor: (!intent.trim() || drafting) ? 'not-allowed' : 'pointer',
              background: (!intent.trim() || drafting) ? 'var(--bg-elevated)' : 'var(--accent)',
              color: (!intent.trim() || drafting) ? 'var(--text-muted)' : '#fff',
              fontSize: 13, fontWeight: 600,
            }}
          >
            {drafting ? 'JARVIS is writing...' : <><Sparkles size={14} /> Draft reply</>}
          </button>
        </>
      )}

      {error && <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
