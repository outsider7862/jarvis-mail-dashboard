'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/Sidebar'
import { useIsMobile } from '@/lib/useIsMobile'

/**
 * Chrome around the dashboard pages. On desktop the sidebar is a permanent
 * column; below the mobile breakpoint it becomes an off-canvas drawer behind a
 * hamburger, so the 220px column doesn't eat half a phone screen.
 */
const COLLAPSE_KEY = 'jm-sidebar-collapsed'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  // Restore the collapsed preference on mount (client-only; localStorage).
  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1')
  }, [])

  function toggleCollapse() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  // Never leave the drawer open behind a route change, or stranded open if the
  // viewport grows back to desktop.
  useEffect(() => { setDrawerOpen(false) }, [pathname])
  useEffect(() => { if (!isMobile) setDrawerOpen(false) }, [isMobile])

  // The page behind a drawer shouldn't scroll.
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [drawerOpen])

  useEffect(() => {
    if (!drawerOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setDrawerOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {!isMobile && <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />}

      {isMobile && drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 55 }}
          />
          <Sidebar mobile onNavigate={() => setDrawerOpen(false)} />
        </>
      )}

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {isMobile && (
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{
              position: 'fixed', bottom: 20, right: 20, zIndex: 50,
              width: 52, height: 52, borderRadius: '50%', cursor: 'pointer',
              background: 'var(--accent)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
            }}
          >
            <Menu size={22} color="#fff" />
          </button>
        )}
        {children}
      </main>
    </div>
  )
}
