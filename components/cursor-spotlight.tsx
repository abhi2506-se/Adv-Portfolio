'use client'

import { useEffect, useRef } from 'react'

export function CursorSpotlight() {
  const spotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = spotRef.current
    if (!el) return

    const move = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`
      el.style.top = `${e.clientY}px`
    }

    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <div
      ref={spotRef}
      className="pointer-events-none fixed z-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] dark:opacity-[0.04]"
      style={{
        background: 'radial-gradient(circle, rgba(37,99,235,1) 0%, rgba(6,182,212,0.5) 40%, transparent 70%)',
        transition: 'left 0.12s ease, top 0.12s ease',
        top: '-200px',
        left: '-200px',
      }}
    />
  )
}
