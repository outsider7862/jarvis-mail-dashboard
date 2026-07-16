'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Mail, Users, Bell, Settings, LogOut, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '/dashboard',                label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/inbox',          label: 'Inbox',    icon: Mail },
  { href: '/dashboard/leads',          label: 'Leads',    icon: Users },
  { href: '/dashboard/notifications',  label: 'Alerts',   icon: Bell },
  { href: '/dashboard/settings',       label: 'Settings', icon: Settings },
]

function isActive(href: string, pathname: string) {
  // Exact match for /dashboard to prevent it matching every sub-route
  if (href === '/dashboard') return pathname === '/dashboard'
  // Prefix match for all other routes
  return pathname === href || pathname.startsWith(href + '/')
}

export function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      // As a drawer it's fixed and floats above the content; on desktop it's a
      // sticky column in normal flow.
      ...(mobile
        ? { position: 'fixed' as const, top: 0, left: 0, bottom: 0, height: '100dvh', zIndex: 60 }
        : { position: 'sticky' as const, top: 0, height: '100vh', minHeight: '100vh' }),
    }}>
      <div style={{
        padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={18} color="#fff" strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Jarvis Mail
        </span>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href, pathname)
          return (
            <Link key={href} href={href} onClick={onNavigate} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: mobile ? '12px' : '9px 12px', borderRadius: 8, textDecoration: 'none',
              fontSize: 14, fontWeight: active ? 600 : 400,
              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: active ? 'var(--bg-elevated)' : 'transparent',
              transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-elevated)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
              {active && (
                <span style={{
                  marginLeft: 'auto', width: 6, height: 6,
                  borderRadius: '50%', background: 'var(--accent)',
                }} />
              )}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleSignOut} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
          fontSize: 14, fontWeight: 400, color: 'var(--text-muted)',
          background: 'transparent', border: 'none', width: '100%',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  )
}