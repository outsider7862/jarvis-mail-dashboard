'use client'
import { Sun, Moon } from 'lucide-react'
import { useTheme, toggleTheme } from '@/lib/theme'

export function ThemeToggle() {
  const theme = useTheme()
  const isDark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        width: 36, height: 36, borderRadius: 8, cursor: 'pointer',
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.15s, color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
