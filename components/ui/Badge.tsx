'use client'
import { useTheme } from '@/lib/theme'

const categoryConfig: Record<string, { label: string; color: string }> = {
  business_lead:    { label: 'Lead',           color: '#22c55e' },
  invoice:          { label: 'Invoice',        color: '#f59e0b' },
  meeting:          { label: 'Meeting',        color: '#a78bfa' },
  customer_support: { label: 'Support',        color: '#38bdf8' },
  newsletter:       { label: 'Newsletter',     color: '#fb923c' },
  spam:             { label: 'Spam',           color: '#71717a' },
  phishing:         { label: 'Phishing',       color: '#ef4444' },
  personal:         { label: 'Personal',       color: '#ec4899' },
  order:            { label: 'Order',          color: '#06b6d4' },
  otp:              { label: 'OTP',            color: '#8b5cf6' },
  security_alert:   { label: 'Security Alert', color: '#f97316' },
  other:            { label: 'Other',          color: '#71717a' },
}

const priorityConfig: Record<string, { label: string; color: string }> = {
  low:    { label: 'Low',    color: '#71717a' },
  medium: { label: 'Medium', color: '#f59e0b' },
  high:   { label: 'High',   color: '#ef4444' },
  urgent: { label: 'Urgent', color: '#ef4444' },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  new:       { label: 'New',       color: '#3b82f6' },
  read:      { label: 'Read',      color: '#71717a' },
  actioned:  { label: 'Actioned',  color: '#22c55e' },
  dismissed: { label: 'Dismissed', color: '#71717a' },
  pending:   { label: 'Pending',   color: '#f59e0b' },
  confirmed: { label: 'Confirmed', color: '#22c55e' },
  rejected:  { label: 'Rejected',  color: '#ef4444' },
}

function Pill({ label, color }: { label: string; color: string }) {
  const theme = useTheme()
  // The palette is tuned for dark surfaces; on white these vivid colors are too
  // light to read as text, so darken them toward the foreground in light mode.
  // The tinted background stays pale, giving readable dark-on-pale chips.
  const textColor = theme === 'light' ? `color-mix(in srgb, ${color}, #18181b 42%)` : color
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      background: `${color}18`, color: textColor, border: `1px solid ${color}30`,
    }}>
      {label.toUpperCase()}
    </span>
  )
}

export function CategoryBadge({ category }: { category: string }) {
  const cfg = categoryConfig[category] ?? categoryConfig.other
  return <Pill label={cfg.label} color={cfg.color} />
}

export function PriorityBadge({ priority }: { priority: string }) {
  const cfg = priorityConfig[priority] ?? priorityConfig.low
  return <Pill label={cfg.label} color={cfg.color} />
}

export function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.read
  return <Pill label={cfg.label} color={cfg.color} />
}
