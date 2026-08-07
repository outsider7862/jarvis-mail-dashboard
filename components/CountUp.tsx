'use client'
import { useEffect, useRef } from 'react'

/**
 * Animates a number from 0 up to `value` on mount (ease-out), writing straight
 * to the DOM node so there's no per-frame React churn. Jumps to the final value
 * for reduced-motion users.
 */
export function CountUp({ value, durationMs = 900, style }: {
  value: number
  durationMs?: number
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || value === 0) {
      el.textContent = String(value)
      return
    }

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
      el.textContent = String(Math.round(value * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])

  return <span ref={ref} style={style}>0</span>
}
