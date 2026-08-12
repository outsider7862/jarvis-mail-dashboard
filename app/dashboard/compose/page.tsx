'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { composeDraft, composeRewrite, getConnectedAccounts } from '@/lib/api'
import { ChatTurn } from '@/types'
import { TopBar } from '@/components/TopBar'
import { gmailComposeUrl } from '@/lib/format'
import { useIsMobile } from '@/lib/useIsMobile'
import { useToast } from '@/components/ui/Toast'
import {
  Sparkles, PenLine, Copy, Check, ExternalLink, Pencil,
  RotateCcw, ArrowLeft, MessageCircle,
} from 'lucide-react'

const EXAMPLES = [
  'Follow up on an unpaid invoice, politely but firmly',
  'Politely decline a meeting request and suggest email instead',
  'Introduce myself to a new client and outline next steps',
  'Ask a supplier for a delivery status update',
  'Thank a customer for their order and confirm the details',
]

/**
 * Free-form email composer. The user describes the email they want; JARVIS
 * writes it. Nothing is ever sent — the draft is fully editable, can be
 * rewritten or re-prompted, copied, or opened in Gmail for the user to send.
 */
export default function ComposePage() {
  const isMobile = useIsMobile()
  const toast    = useToast()

  const [prompt, setPrompt]         = useState('')
  const [recipient, setRecipient]   = useState('')
  const [lastPrompt, setLastPrompt] = useState('')
  const [drafting, setDrafting]     = useState(false)
  const [draft, setDraft]           = useState<{ subject: string; body: string } | null>(null)
  const [clarifyingQ, setClarifyingQ] = useState<string | null>(null)
  const [history, setHistory]       = useState<ChatTurn[]>([])
  const [rewriteMode, setRewriteMode] = useState(false)
  const [rewriteInstruction, setRewriteInstruction] = useState('')
  const [error, setError]           = useState('')
  const [copied, setCopied]         = useState(false)
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null)

  // Compose from the connected Gmail account when we have one.
  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      try {
        const accounts = await getConnectedAccounts(data.session.access_token)
        const active = accounts.find((a: { email_address: string; active: boolean }) => a.active) ?? accounts[0]
        if (active) setConnectedEmail(active.email_address)
      } catch { /* no connected account — Gmail link just falls back to /u/0 */ }
    }
    load()
  }, [])

  async function draftFrom(text: string, fresh = false) {
    const t = text.trim()
    if (!t) return
    setDrafting(true)
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      const hist = fresh || history.length === 0 ? undefined : history
      const result = await composeDraft(data.session.access_token, t, recipient, hist)

      if (result.clarifying_question) {
        // JARVIS needs more detail — surface the question, keep the thread going.
        setDraft(null)
        setClarifyingQ(result.clarifying_question)
        setHistory(prev => (fresh ? [] : prev).concat(
          { role: 'user', content: t },
          { role: 'assistant', content: result.clarifying_question },
        ))
        setPrompt('')
      } else {
        setLastPrompt(t)
        setClarifyingQ(null)
        setDraft({ subject: result.subject, body: result.body })
        setHistory(prev => (fresh ? [] : prev).concat(
          { role: 'user', content: t },
          { role: 'assistant', content: result.body },
        ))
      }
    } catch {
      setError('Could not draft the email. Try again.')
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
      const result = await composeRewrite(
        data.session.access_token,
        draft.body, draft.subject, rewriteInstruction, history,
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

  function editPrompt() {
    setDraft(null)
    setRewriteMode(false)
    setClarifyingQ(null)
    setHistory([])
    if (lastPrompt) setPrompt(lastPrompt)
  }

  async function copyDraft() {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(draft.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Copied to clipboard')
    } catch {
      setError('Could not copy — your browser blocked clipboard access.')
    }
  }

  const gmailUrl = draft
    ? gmailComposeUrl(recipient.trim(), draft.subject, draft.body, connectedEmail)
    : '#'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
  }

  return (
    <>
      <TopBar title="Compose" />
      <div style={{ padding: isMobile ? '18px 16px 80px' : '28px', display: 'flex', justifyContent: 'center' }}>
        <div className="animate-rise" style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Intro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PenLine size={17} color="var(--accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Write an email with JARVIS</h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                Describe what you want to say — JARVIS drafts it, you edit and send.
              </p>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: isMobile ? '16px' : '20px 22px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {draft ? (
              /* ── Draft ready: fully editable ── */
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em' }}>
                    JARVIS DRAFT
                  </span>
                  <button onClick={editPrompt} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 12,
                  }}>
                    <ArrowLeft size={12} /> New draft
                  </button>
                </div>

                <input
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder="To (recipient email — optional)"
                  style={inputStyle}
                />
                <input
                  value={draft.subject}
                  onChange={e => setDraft(prev => prev ? { ...prev, subject: e.target.value } : null)}
                  placeholder="Subject"
                  style={{ ...inputStyle, fontWeight: 500 }}
                />
                <textarea
                  value={draft.body}
                  onChange={e => setDraft(prev => prev ? { ...prev, body: e.target.value } : null)}
                  rows={12}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />

                {/* Rewrite / reprompt */}
                {!rewriteMode ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setRewriteMode(true)} disabled={drafting} style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                      color: 'var(--text-secondary)', padding: '9px', fontSize: 12,
                      cursor: drafting ? 'not-allowed' : 'pointer',
                    }}>
                      <Pencil size={12} /> Ask JARVIS to rewrite
                    </button>
                    <button onClick={() => draftFrom(lastPrompt, true)} disabled={drafting || !lastPrompt} title="Regenerate from your prompt" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                      color: 'var(--text-secondary)', padding: '9px 14px', fontSize: 12,
                      cursor: (drafting || !lastPrompt) ? 'not-allowed' : 'pointer',
                    }}>
                      <RotateCcw size={12} /> Regenerate
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      autoFocus
                      value={rewriteInstruction}
                      onChange={e => setRewriteInstruction(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !drafting) handleRewrite() }}
                      placeholder="e.g. make it shorter, warmer tone, add a deadline..."
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <button onClick={handleRewrite} disabled={drafting || !rewriteInstruction.trim()} style={{
                      padding: '9px 14px', borderRadius: 8, border: 'none',
                      background: (drafting || !rewriteInstruction.trim()) ? 'var(--bg-elevated)' : 'var(--accent)',
                      color: (drafting || !rewriteInstruction.trim()) ? 'var(--text-muted)' : 'var(--on-accent)',
                      cursor: (drafting || !rewriteInstruction.trim()) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600,
                    }}>
                      Rewrite
                    </button>
                    <button onClick={() => { setRewriteMode(false); setRewriteInstruction('') }} style={{
                      padding: '9px 12px', borderRadius: 8, background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)', color: 'var(--text-secondary)',
                      cursor: 'pointer', fontSize: 12,
                    }}>
                      Cancel
                    </button>
                  </div>
                )}

                {drafting && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>JARVIS is writing...</p>
                )}

                {/* Send / copy */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '11px', borderRadius: 8, textDecoration: 'none',
                      background: '#22c55e', color: '#052e16', fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Open in Gmail to send <ExternalLink size={13} />
                  </a>
                  <button onClick={copyDraft} title="Copy draft to clipboard" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '11px 16px', borderRadius: 8, cursor: 'pointer',
                    background: 'var(--bg-elevated)',
                    border: `1px solid ${copied ? '#22c55e' : 'var(--border)'}`,
                    color: copied ? '#22c55e' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                  }}>
                    {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                  </button>
                </div>

                <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                  JARVIS never sends emails automatically. You always review first.
                </p>
              </>
            ) : (
              /* ── Prompt: describe the email ── */
              <>
                {clarifyingQ && (
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 8,
                    padding: '12px 14px', borderRadius: 8,
                    background: 'var(--accent-subtle)', border: '1px solid var(--border)',
                  }}>
                    <MessageCircle size={14} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: 'var(--accent)', lineHeight: 1.5 }}>{clarifyingQ}</p>
                  </div>
                )}

                <input
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder="To (recipient email — optional)"
                  style={inputStyle}
                />

                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !drafting) draftFrom(prompt) }}
                  placeholder={clarifyingQ ? 'Answer the question above...' : 'Describe the email you want written — the purpose, key points, and tone...'}
                  rows={5}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }}
                />

                {!clarifyingQ && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {EXAMPLES.map(ex => (
                      <button key={ex} onClick={() => setPrompt(ex)} style={{
                        padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                        fontSize: 12, fontWeight: 500, transition: 'all 0.12s',
                        border: '1px solid var(--border)',
                        background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => draftFrom(prompt)}
                  disabled={!prompt.trim() || drafting}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '11px', borderRadius: 8, border: 'none',
                    cursor: (!prompt.trim() || drafting) ? 'not-allowed' : 'pointer',
                    background: (!prompt.trim() || drafting) ? 'var(--bg-elevated)' : 'var(--accent)',
                    color: (!prompt.trim() || drafting) ? 'var(--text-muted)' : 'var(--on-accent)',
                    fontSize: 13, fontWeight: 600,
                  }}
                >
                  {drafting ? 'JARVIS is writing...' : <><Sparkles size={14} /> Draft with JARVIS</>}
                </button>
              </>
            )}

            {error && <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}
          </div>
        </div>
      </div>
    </>
  )
}
