'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getProfile, updateProfile } from '@/lib/api'
import { Zap, Shield, Eye, Bot, Trash2, Unplug, ArrowRight, ArrowLeft, Check } from 'lucide-react'

type OptionStep = {
  key: 'work_type' | 'email_use' | 'preferred_tone'
  kind: 'options'
  question: string
  options: { value: string; label: string }[]
}
type TextStep = {
  key: 'display_name' | 'custom_instructions'
  kind: 'text'
  question: string
  placeholder: string
  multiline?: boolean
  optional?: boolean
}
type Step = OptionStep | TextStep

// Privacy notice is a gate before the 5 questions — not counted in "Step X of 5".
const PRIVACY_POINTS = [
  { icon: Shield, text: 'Your emails are processed only to provide AI features.' },
  { icon: Eye, text: 'We do not manually read your emails — ever.' },
  { icon: Bot, text: 'AI analysis is performed automatically and privately.' },
  { icon: Trash2, text: 'All email data is automatically deleted after 30 days.' },
  { icon: Unplug, text: 'You can disconnect Gmail at any time from Settings.' },
]

const STEPS: Step[] = [
  { key: 'display_name', kind: 'text', question: 'What should JARVIS call you?', placeholder: 'Your name' },
  {
    key: 'work_type', kind: 'options', question: 'What kind of work do you do?',
    options: [
      { value: 'agency', label: 'Agency' },
      { value: 'freelancer', label: 'Freelancer' },
      { value: 'contractor', label: 'Contractor' },
      { value: 'consultant', label: 'Consultant' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'email_use', kind: 'options', question: 'What do you mainly use email for?',
    options: [
      { value: 'client communication', label: 'Client Communication' },
      { value: 'sales & leads', label: 'Sales & Leads' },
      { value: 'project management', label: 'Project Management' },
      { value: 'customer support', label: 'Customer Support' },
      { value: 'mixed', label: 'Mixed' },
    ],
  },
  {
    key: 'preferred_tone', kind: 'options', question: 'Preferred email tone?',
    options: [
      { value: 'formal', label: 'Formal' },
      { value: 'friendly', label: 'Friendly' },
      { value: 'concise', label: 'Concise' },
      { value: 'professional', label: 'Professional' },
    ],
  },
  {
    key: 'custom_instructions', kind: 'text', multiline: true, optional: true,
    question: 'Anything JARVIS should know about how you like your emails?',
    placeholder: 'e.g. I run a design studio, most emails are project updates. Flag anything about invoices as urgent.',
  },
]

const CARD_MAX = 480

export default function OnboardingPage() {
  const router = useRouter()
  // -1 = privacy notice; 0..STEPS.length-1 = questions.
  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      // Already onboarded? Straight to the dashboard.
      try {
        const p = await getProfile(data.session.access_token)
        if (p.onboarding_complete) { router.replace('/dashboard'); return }
        // Prefill anything already saved (e.g. an interrupted run).
        setAnswers({
          display_name: p.display_name ?? '',
          work_type: p.work_type ?? '',
          email_use: p.email_use ?? '',
          preferred_tone: p.preferred_tone ?? '',
          custom_instructions: p.custom_instructions ?? '',
        })
      } catch { /* start fresh */ }
      setReady(true)
    })
  }, [router])

  function set(key: string, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  async function finish() {
    setError('')
    setSaving(true)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.replace('/login'); return }
      await updateProfile(data.session.access_token, {
        display_name: answers.display_name || null,
        work_type: answers.work_type || null,
        email_use: answers.email_use || null,
        preferred_tone: answers.preferred_tone || null,
        custom_instructions: answers.custom_instructions || null,
        onboarding_complete: true,
      })
      router.replace('/dashboard')
    } catch {
      setError('Could not save your profile. Try again.')
      setSaving(false)
    }
  }

  function next() {
    if (step === STEPS.length - 1) finish()
    else setStep(s => s + 1)
  }

  function back() {
    setStep(s => s - 1)
  }

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: '2px solid var(--border)', borderTopColor: 'var(--accent)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: CARD_MAX,
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 36,
        display: 'flex', flexDirection: 'column', gap: 24,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Jarvis Mail
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {step === -1 ? 'Before we begin' : `Step ${step + 1} of ${STEPS.length}`}
            </div>
          </div>
        </div>

        {/* Progress bar (question steps only) */}
        {step >= 0 && (
          <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2, background: 'var(--accent)',
              width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.25s',
            }} />
          </div>
        )}

        {step === -1 ? (
          <PrivacyNotice onContinue={() => setStep(0)} />
        ) : (
          <StepBody
            step={STEPS[step]}
            value={answers[STEPS[step].key] ?? ''}
            onChange={v => set(STEPS[step].key, v)}
            onNext={next}
            onBack={step > 0 ? back : undefined}
            isLast={step === STEPS.length - 1}
            saving={saving}
          />
        )}

        {error && <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}
      </div>
    </div>
  )
}

function PrivacyNotice({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          Before you connect your Gmail
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Here's what you should know:
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PRIVACY_POINTS.map(({ icon: Icon, text }, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={15} color="var(--accent)" />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: 6 }}>
              {text}
            </p>
          </div>
        ))}
      </div>
      <button onClick={onContinue} style={primaryBtn}>
        Got it, let's continue <ArrowRight size={15} />
      </button>
    </div>
  )
}

function StepBody({ step, value, onChange, onNext, onBack, isLast, saving }: {
  step: Step
  value: string
  onChange: (v: string) => void
  onNext: () => void
  onBack?: () => void
  isLast: boolean
  saving: boolean
}) {
  const isOptional = step.kind === 'text' && step.optional
  const canProceed = step.kind === 'options'
    ? !!value
    : (step.optional || value.trim().length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
        {step.question}
      </h2>

      {step.kind === 'text' ? (
        step.multiline ? (
          <textarea
            autoFocus
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={step.placeholder}
            rows={4}
            style={{
              width: '100%', padding: '12px 14px', resize: 'vertical',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              fontFamily: 'inherit', lineHeight: 1.5,
            }}
          />
        ) : (
          <input
            autoFocus
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canProceed && onNext()}
            placeholder={step.placeholder}
            style={{
              width: '100%', padding: '12px 14px',
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text-primary)', fontSize: 15, outline: 'none',
            }}
          />
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {step.options.map(opt => {
            const active = value === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  fontSize: 14, fontWeight: 500, transition: 'all 0.12s',
                  border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                  color: active ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {opt.label}
                {active && <Check size={16} />}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {onBack && (
          <button onClick={onBack} style={secondaryBtn}>
            <ArrowLeft size={15} /> Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canProceed || saving}
          style={{
            ...primaryBtn, flex: 1,
            opacity: (!canProceed || saving) ? 0.5 : 1,
            cursor: (!canProceed || saving) ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : isLast ? 'Finish' : (isOptional && !value.trim() ? 'Skip' : 'Continue')}
          {!saving && <ArrowRight size={15} />}
        </button>
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: '12px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600,
}

const secondaryBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500,
}
