import { EventType } from '@/types'

export const EVENT_COLORS: Record<EventType, string> = {
  meeting: '#a78bfa',
  deadline: '#f59e0b',
  order: '#6366f1',
  payment: '#22c55e',
  custom: '#3b82f6',
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  meeting: 'Meeting',
  deadline: 'Deadline',
  order: 'Order',
  payment: 'Payment',
  custom: 'Other',
}

// Local YYYY-MM-DD key for grouping events by day without UTC drift.
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
