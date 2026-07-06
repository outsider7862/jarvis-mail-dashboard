'use client'
import { useEffect, useState } from 'react'
import { Bell, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function TopBar({ title }: { title: string }) {
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email)
    })
  }, [])

  const initials = email ? email[0].toUpperCase() : '?'

  return (
    <header style={{
      height: 60, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 28px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-surface)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search hint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 8,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer',
          transition: 'border-color 0.15s',
        }}>
          <Search size={14} />
          <span>Search...</span>
          <span style={{
            padding: '1px 6px', borderRadius: 4, fontSize: 11,
            background: 'var(--bg-overlay)', border: '1px solid var(--border)',
          }}>⌘K</span>
        </div>

        {/* Notification bell */}
        <button style={{
          width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-secondary)', transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <Bell size={16} />
        </button>

        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff',
          cursor: 'pointer', flexShrink: 0,
        }} title={email}>
          {initials}
        </div>
      </div>
    </header>
  )
}
