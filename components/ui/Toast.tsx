'use client'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
type ToastAction = { label: string; onClick: () => void }
type Toast = { id: number; kind: ToastKind; message: string; action?: ToastAction; duration: number }

type ShowOpts = { action?: ToastAction; duration?: number }
type ToastApi = {
  success: (m: string, opts?: ShowOpts) => void
  error: (m: string, opts?: ShowOpts) => void
  info: (m: string, opts?: ShowOpts) => void
}

const ToastContext = createContext<ToastApi | null>(null)

// Safe outside a provider: no-ops rather than throwing, so a stray call can't
// crash a page. Real feedback appears wherever ToastProvider is mounted.
const NOOP: ToastApi = { success: () => {}, error: () => {}, info: () => {} }

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP
}

const KIND_COLOR: Record<ToastKind, string> = {
  success: '#22c55e',
  error: '#ef4444',
  info: 'var(--accent)',
}
const KIND_ICON = { success: CheckCircle2, error: AlertCircle, info: Info }

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  const show = useCallback((kind: ToastKind, message: string, opts?: ShowOpts) => {
    const id = ++idRef.current
    const duration = opts?.duration ?? 4500
    setToasts(t => [...t, { id, kind, message, action: opts?.action, duration }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration)
  }, [])

  const api = useMemo<ToastApi>(() => ({
    success: (m, o) => show('success', m, o),
    error: (m, o) => show('error', m, o),
    info: (m, o) => show('info', m, o),
  }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 100,
        display: 'flex', flexDirection: 'column', gap: 8,
        width: '100%', maxWidth: 380, pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const Icon = KIND_ICON[t.kind]
          const color = KIND_COLOR[t.kind]
          return (
            <div key={t.id} role="status" className="animate-rise" style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 12px 12px 14px', borderRadius: 10,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderLeft: `3px solid ${color}`,
              boxShadow: '0 10px 28px -10px rgba(0,0,0,0.6)',
            }}>
              <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                {t.message}
              </p>
              {t.action && (
                <button
                  onClick={() => { t.action!.onClick(); dismiss(t.id) }}
                  style={{
                    flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                    color, fontSize: 12, fontWeight: 700, padding: '2px 4px',
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                style={{
                  flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', padding: 2,
                }}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
