'use client'
import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'jm-theme'

// Theme lives on <html data-theme>, set by the no-flash script before hydration.
// useSyncExternalStore reads that external DOM state without a hydration
// mismatch: getServerSnapshot returns 'dark' (the default) to match SSR, then
// it switches to the live attribute on the client.

function subscribe(cb: () => void) {
  window.addEventListener('themechange', cb)
  window.addEventListener('storage', cb) // keep other tabs in sync
  return () => {
    window.removeEventListener('themechange', cb)
    window.removeEventListener('storage', cb)
  }
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

function getServerSnapshot(): Theme {
  return 'dark'
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function toggleTheme() {
  const next: Theme = getSnapshot() === 'light' ? 'dark' : 'light'
  if (next === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else document.documentElement.removeAttribute('data-theme')
  try { localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  window.dispatchEvent(new Event('themechange'))
}
