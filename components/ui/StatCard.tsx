import { LucideIcon } from 'lucide-react'
import { CountUp } from '@/components/CountUp'

interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  iconColor?: string
  sub?: string
}

export function StatCard({ label, value, icon: Icon, iconColor = '#3b82f6', sub }: StatCardProps) {
  return (
    <div className="hover-lift" style={{
      height: '100%',
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>{label}</span>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${iconColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={iconColor} strokeWidth={2} />
        </div>
      </div>
      <div>
        {typeof value === 'number' ? (
          <CountUp value={value} style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }} />
        ) : (
          <span style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {value}
          </span>
        )}
        {sub && <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{sub}</p>}
      </div>
    </div>
  )
}
