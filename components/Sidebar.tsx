'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Mail, Users, Bell, Settings, LogOut, Zap, CalendarDays, ChevronLeft, PenLine } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '/dashboard',                label: 'Overview',  icon: LayoutDashboard },
  { href: '/dashboard/inbox',          label: 'Inbox',     icon: Mail },
  { href: '/dashboard/compose',        label: 'Compose',   icon: PenLine },
  { href: '/dashboard/calendar',       label: 'Calendar',  icon: CalendarDays },
  { href: '/dashboard/leads',          label: 'Leads',     icon: Users },
  { href: '/dashboard/notifications',  label: 'Alerts',    icon: Bell },
  { href: '/dashboard/settings',       label: 'Settings',  icon: Settings },
]

function isActive(href: string, pathname: string) {
  // Exact match for /dashboard to prevent it matching every sub-route
  if (href === '/dashboard') return pathname === '/dashboard'
  // Prefix match for all other routes
  return pathname === href || pathname.startsWith(href + '/')
}

const EXPANDED = 220
const COLLAPSED = 68

export function Sidebar({ mobile = false, onNavigate, collapsed = false, onToggleCollapse }: {
  mobile?: boolean
  onNavigate?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  // A drawer is always full width; collapse only applies to the desktop rail.
  const isCollapsed = collapsed && !mobile

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{
      width: isCollapsed ? COLLAPSED : EXPANDED, flexShrink: 0, overflow: 'hidden',
      background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
      ...(mobile
        ? { position: 'fixed' as const, top: 0, left: 0, bottom: 0, height: '100dvh', zIndex: 60 }
        : { position: 'sticky' as const, top: 0, height: '100vh', minHeight: '100vh' }),
    }}>
      {/* Brand + collapse toggle. Stacks vertically when collapsed so the toggle
          stays reachable in the narrow rail (TechHire-style). */}
      <div style={{
        flexShrink: 0, borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        flexDirection: isCollapsed ? 'column' : 'row',
        gap: isCollapsed ? 12 : 10,
        padding: isCollapsed ? '16px 0' : '0 12px 0 18px',
        height: isCollapsed ? undefined : 60,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, flexShrink: 0,
          background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={17} color="var(--on-accent)" strokeWidth={2.5} />
        </div>
        {!isCollapsed && (
          <span className="animate-fade" style={{
            flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
            letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden',
          }}>
            Jarvis Mail
          </span>
        )}
        {!mobile && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0, cursor: 'pointer',
              background: 'transparent', border: 'none', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            <ChevronLeft size={16} style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.24s ease' }} />
          </button>
        )}
      </div>

      <nav style={{
        flex: 1, padding: isCollapsed ? '14px 10px' : '14px 12px',
        display: 'flex', flexDirection: 'column', gap: 3,
      }}>
        {nav.map(({ href, label: text, icon: Icon }, i) => {
          const active = isActive(href, pathname)
          return (
            <Link
              key={href} href={href} onClick={onNavigate}
              title={isCollapsed ? text : undefined}
              className="animate-slide-in"
              style={{
                position: 'relative',
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '10px 12px', borderRadius: 8, textDecoration: 'none',
                fontSize: 14, fontWeight: active ? 600 : 500,
                color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-subtle)' : 'transparent',
                transition: 'background 0.15s, color 0.15s, transform 0.15s',
                animationDelay: `${i * 45}ms`,
              }}
              onMouseEnter={e => {
                if (!active) { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)' }
                if (!isCollapsed) e.currentTarget.style.transform = 'translateX(2px)'
              }}
              onMouseLeave={e => {
                if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }
                e.currentTarget.style.transform = 'none'
              }}
            >
              {/* Left active bar — TechHire-style indicator */}
              <span style={{
                position: 'absolute', left: 0, top: '50%',
                height: 18, width: 3, borderRadius: '0 3px 3px 0', background: 'var(--accent)',
                transform: `translateY(-50%) translateX(${active ? '-6px' : '-10px'})`,
                opacity: active ? 1 : 0,
                transition: 'opacity 0.2s ease, transform 0.2s ease',
              }} />
              <Icon size={17} strokeWidth={active ? 2.4 : 2} color={active ? 'var(--accent)' : 'currentColor'} style={{ flexShrink: 0 }} />
              {!isCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{text}</span>}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: isCollapsed ? '12px 10px' : '12px 12px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleSignOut} title={isCollapsed ? 'Sign out' : undefined} style={{
          display: 'flex', alignItems: 'center', gap: 11,
          padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
          fontSize: 14, fontWeight: 500, color: 'var(--text-muted)',
          background: 'transparent', border: 'none', width: '100%',
          transition: 'background 0.15s, color 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={17} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
