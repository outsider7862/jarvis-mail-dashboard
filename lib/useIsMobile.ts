'use client'
import { useEffect, useState } from 'react'

export const MOBILE_BREAKPOINT = 768

/**
 * This app styles with inline `style` objects, which can't express media
 * queries — so layout that has to *change shape* on small screens (split pane →
 * single pane, sidebar → drawer) is driven from JS instead.
 *
 * Starts false and resolves after mount: `window` doesn't exist during the
 * server render, and guessing would flash the wrong layout.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return isMobile
}
