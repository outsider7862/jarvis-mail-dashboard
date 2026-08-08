'use client'
export const dynamic = 'force-dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  getCalendarEvents, getPendingCalendarEvents, createCalendarEvent,
  updateCalendarEvent, deleteCalendarEvent,
} from '@/lib/api'
import { CalendarEvent, EventType } from '@/types'
import { TopBar } from '@/components/TopBar'
import { EVENT_COLORS, EVENT_TYPE_LABELS, dayKey } from '@/lib/calendar'
import { useIsMobile } from '@/lib/useIsMobile'
import { useToast } from '@/components/ui/Toast'
import {
  ChevronLeft, ChevronRight, Plus, Check, X, Trash2, Pencil, Mail, Sparkles, CalendarDays,
} from 'lucide-react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function eventTime(e: CalendarEvent): string {
  if (e.all_day) return 'All day'
  return new Date(e.start_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function CalendarPage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const toast = useToast()
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [pending, setPending] = useState<CalendarEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<CalendarEvent | null>(null)
  const [loaded, setLoaded] = useState(false)

  const token = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  const loadEvents = useCallback(async () => {
    const t = await token()
    if (!t) return
    // Fetch a wide window around the visible month so adjacent-month cells and
    // the Upcoming logic have data.
    const from = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
    const to = new Date(monthDate.getFullYear(), monthDate.getMonth() + 2, 0, 23, 59, 59)
    const [all, pend] = await Promise.all([
      getCalendarEvents(t, { from_date: from.toISOString(), to_date: to.toISOString() }),
      getPendingCalendarEvents(t),
    ])
    setEvents(all)
    setPending(pend)
    setLoaded(true)
  }, [monthDate, token])

  useEffect(() => { loadEvents() }, [loadEvents])

  // Confirmed events (the ones on the grid) grouped by local day.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of events) {
      if (e.status !== 'confirmed') continue
      const key = dayKey(new Date(e.start_at))
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    return map
  }, [events])

  // 6-week grid starting on the Sunday on/before the 1st.
  const grid = useMemo(() => {
    const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
    const start = new Date(first)
    start.setDate(first.getDate() - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [monthDate])

  const todayKey = dayKey(new Date())
  const dayEvents = selectedDay ? (byDay.get(selectedDay) ?? []) : []

  async function confirmPending(id: string) {
    const t = await token(); if (!t) return
    setPending(prev => prev.filter(e => e.id !== id))
    await updateCalendarEvent(t, id, { status: 'confirmed' })
    toast.success('Added to calendar')
    loadEvents()
  }
  async function rejectPending(id: string) {
    const t = await token(); if (!t) return
    setPending(prev => prev.filter(e => e.id !== id))
    await updateCalendarEvent(t, id, { status: 'rejected' })
    toast.info('Suggestion dismissed')
  }

  // Deferred delete: pull the event from view immediately and offer Undo, but
  // hold the actual DELETE until the toast expires — so Undo just cancels the
  // timer and restores the row, no re-create round trip.
  function removeEvent(event: CalendarEvent) {
    setEvents(prev => prev.filter(e => e.id !== event.id))
    const timer = setTimeout(async () => {
      const t = await token(); if (!t) return
      try { await deleteCalendarEvent(t, event.id) } catch { loadEvents() }
    }, 5000)
    toast.error(`Deleted "${event.title.slice(0, 40)}"`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => { clearTimeout(timer); setEvents(prev => [...prev, event]) },
      },
    })
  }

  return (
    <>
      <TopBar title="Calendar" />
      <div style={{
        padding: isMobile ? '18px 16px 80px' : '24px 28px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>

        {/* Pending AI-detected events */}
        {pending.length > 0 && (
          <div className="animate-rise" style={{
            background: 'var(--accent-subtle)', border: '1px solid rgba(59,130,246,0.35)',
            borderRadius: 12, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} color="var(--accent)" />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                JARVIS detected {pending.length} event{pending.length > 1 ? 's' : ''} from your emails — review {pending.length > 1 ? 'them' : 'it'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pending.map(e => (
                <div key={e.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 8,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: EVENT_COLORS[e.event_type] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(e.start_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {!e.all_day && ` · ${eventTime(e)}`}
                    </p>
                  </div>
                  <button onClick={() => confirmPending(e.id)} title="Confirm" style={pillBtn('#22c55e')}>
                    <Check size={13} /> Confirm
                  </button>
                  <button onClick={() => rejectPending(e.id)} title="Reject" style={pillBtn('#ef4444', true)}>
                    <X size={13} /> Reject
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Month header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
            </h2>
            <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} style={iconBtn}><ChevronLeft size={16} /></button>
            <button onClick={() => setMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} style={iconBtn}><ChevronRight size={16} /></button>
            <button onClick={() => { const d = new Date(); setMonthDate(new Date(d.getFullYear(), d.getMonth(), 1)) }} style={{
              padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)',
            }}>Today</button>
          </div>
          <button onClick={() => setShowAdd(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 13, fontWeight: 600,
          }}>
            <Plus size={15} /> Add event
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, flexDirection: isMobile ? 'column' : 'row' }}>
          {/* Month grid */}
          <div className="animate-rise" style={{ flex: 1, minWidth: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {WEEKDAYS.map(w => (
                <div key={w} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                  {w}
                </div>
              ))}
              {!loaded ? Array.from({ length: 42 }).map((_, i) => (
                <div key={`sk-${i}`} className="shimmer" style={{
                  minHeight: isMobile ? 56 : 92, background: 'var(--bg-elevated)',
                  borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)',
                }} />
              )) : grid.map((d, i) => {
                const key = dayKey(d)
                const inMonth = d.getMonth() === monthDate.getMonth()
                const dayEvts = byDay.get(key) ?? []
                const isToday = key === todayKey
                const isSelected = key === selectedDay
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(key)}
                    style={{
                      minHeight: isMobile ? 56 : 92, padding: '6px', textAlign: 'left', cursor: 'pointer',
                      background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                      border: 'none', borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex', flexDirection: 'column', gap: 4, opacity: inMonth ? 1 : 0.4,
                    }}
                  >
                    <span style={{
                      fontSize: 12, fontWeight: isToday ? 700 : 500, alignSelf: 'flex-start',
                      color: isToday ? 'var(--on-accent)' : 'var(--text-secondary)',
                      background: isToday ? 'var(--accent)' : 'transparent',
                      borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {d.getDate()}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                      {dayEvts.slice(0, isMobile ? 2 : 3).map(e => (
                        <span key={e.id} style={{
                          display: 'flex', alignItems: 'center', gap: 4, minWidth: 0,
                          fontSize: 10, color: 'var(--text-secondary)',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: EVENT_COLORS[e.event_type] }} />
                          {!isMobile && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</span>}
                        </span>
                      ))}
                      {dayEvts.length > (isMobile ? 2 : 3) && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{dayEvts.length - (isMobile ? 2 : 3)} more</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Day detail */}
          {selectedDay && (
            <div key={selectedDay} className="animate-slide-in" style={{
              width: isMobile ? '100%' : 320, flexShrink: 0,
              background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {new Date(selectedDay + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <button onClick={() => setSelectedDay(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={16} />
                </button>
              </div>

              {dayEvents.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No events this day.</p>
              ) : (
                dayEvents.map(e => (
                  <div key={e.id} style={{
                    padding: '12px 14px', borderRadius: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                    borderLeft: `3px solid ${EVENT_COLORS[e.event_type]}`,
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{e.title}</span>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button onClick={() => setEditing(e)} title="Edit" style={miniBtn}><Pencil size={12} /></button>
                        <button onClick={() => removeEvent(e)} title="Delete" style={miniBtn}><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{eventTime(e)} · {EVENT_TYPE_LABELS[e.event_type]}</span>
                    {e.description && <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{e.description}</span>}
                    {e.email_analysis_id ? (
                      <button
                        onClick={() => router.push(`/dashboard/inbox?id=${e.email_analysis_id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, padding: 0 }}
                      >
                        <Mail size={11} /> From email
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Added manually</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {(showAdd || editing) && (
        <EventModal
          existing={editing}
          defaultDate={selectedDay}
          onClose={() => { setShowAdd(false); setEditing(null) }}
          onSaved={() => { toast.success(editing ? 'Event updated' : 'Event added'); setShowAdd(false); setEditing(null); loadEvents() }}
        />
      )}
    </>
  )
}

// ─── Add / edit modal ─────────────────────────────────────────────────────────

function EventModal({ existing, defaultDate, onClose, onSaved }: {
  existing: CalendarEvent | null
  defaultDate: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const initial = existing ? new Date(existing.start_at) : null
  const [title, setTitle] = useState(existing?.title ?? '')
  const [eventType, setEventType] = useState<EventType>(existing?.event_type ?? 'custom')
  const [date, setDate] = useState(
    existing ? dayKey(new Date(existing.start_at)) : (defaultDate ?? dayKey(new Date()))
  )
  const [allDay, setAllDay] = useState(existing?.all_day ?? false)
  const [time, setTime] = useState(
    initial && !existing?.all_day
      ? `${String(initial.getHours()).padStart(2, '0')}:${String(initial.getMinutes()).padStart(2, '0')}`
      : '09:00'
  )
  const [description, setDescription] = useState(existing?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError('')
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return
      // Build a local datetime so the event lands on the day the user picked.
      const startAt = allDay
        ? new Date(`${date}T00:00:00`).toISOString()
        : new Date(`${date}T${time}:00`).toISOString()
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        event_type: eventType,
        start_at: startAt,
        all_day: allDay,
      }
      if (existing) {
        await updateCalendarEvent(data.session.access_token, existing.id, payload)
      } else {
        await createCalendarEvent(data.session.access_token, payload)
      }
      onSaved()
    } catch {
      setError('Could not save the event. Try again.')
      setSaving(false)
    }
  }

  return (
    <>
      <div onClick={onClose} className="animate-fade" style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 60, backdropFilter: 'blur(2px)' }} />
      {/* Flex-centering wrapper: the panel is centered here rather than with a
          translate, so animate-rise's own transform doesn't fight the centering. */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 61, padding: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div className="animate-rise" style={{
          pointerEvents: 'auto',
          width: '100%', maxWidth: 440,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14,
          padding: 28, display: 'flex', flexDirection: 'column', gap: 16,
          maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarDays size={16} color="var(--accent)" />
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            {existing ? 'Edit event' : 'Add event'}
          </h3>
        </div>

        <Field label="Title">
          <input value={title} onChange={e => setTitle(e.target.value)} autoFocus placeholder="Event title" style={inputStyle} />
        </Field>

        <Field label="Type">
          <select value={eventType} onChange={e => setEventType(e.target.value as EventType)} style={inputStyle}>
            {(['meeting', 'deadline', 'order', 'payment', 'custom'] as EventType[]).map(t => (
              <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>

        <div style={{ display: 'flex', gap: 12 }}>
          <Field label="Date" style={{ flex: 1 }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
          </Field>
          {!allDay && (
            <Field label="Time" style={{ width: 120 }}>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
            </Field>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
          All day
        </label>

        <Field label="Description (optional)">
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Notes..." style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
        </Field>

        {error && <p style={{ fontSize: 12, color: '#ef4444' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 8, cursor: 'pointer', background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={save} disabled={saving} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Saving...' : existing ? 'Save' : 'Add event'}
          </button>
        </div>
        </div>
      </div>
    </>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 7,
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
}

const iconBtn: React.CSSProperties = {
  width: 30, height: 30, borderRadius: 7, cursor: 'pointer',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const miniBtn: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
  background: 'var(--bg-surface)', border: '1px solid var(--border)',
  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

function pillBtn(color: string, subtle = false): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
    padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
    background: subtle ? 'transparent' : `${color}1a`,
    border: `1px solid ${color}40`, color,
  }
}
