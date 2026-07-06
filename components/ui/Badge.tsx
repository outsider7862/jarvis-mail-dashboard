import { Category, Priority } from '@/types'

const categoryConfig: Record<string, { label: string; color: string }> = {
  business_lead:    { label: 'Lead',       color: '#22c55e' },
  invoice:          { label: 'Invoice',    color: '#f59e0b' },
  meeting:          { label: 'Meeting',    color: '#a78bfa' },
  customer_support: { label: 'Support',   color: '#38bdf8' },
  newsletter:       { label: 'Newsletter', color: '#fb923c' },
  spam:             { label: 'Spam',       color: '#71717a' },
  phishing:         { label: 'Phishing',   color: '#ef4444' },
  other:            { label: 'Other',      color: '#71717a' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#71717a' },
  medium: { label: 'Medium', color: '#f59e0b' },
  high:   { label: 'High',   color: '#ef4444' },
  urgent: { label: 'Urgent', color: '#ef4444' },
}

export function CategoryBadge({ category }: { category: string }) {
  const cfg = categoryConfig[category] ?? categoryConfig.other
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priorityConfig[priority] ?? priorityConfig.low
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    new:       { label: 'New',       color: '#3b82f6' },
    read:      { label: 'Read',      color: '#71717a' },
    actioned:  { label: 'Actioned',  color: '#22c55e' },
    dismissed: { label: 'Dismissed', color: '#71717a' },
    pending:   { label: 'Pending',   color: '#f59e0b' },
    confirmed: { label: 'Confirmed', color: '#22c55e' },
    rejected:  { label: 'Rejected',  color: '#ef4444' },
  }
  const cfg = map[status] ?? map.read
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  )
}
