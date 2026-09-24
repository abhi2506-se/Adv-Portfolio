'use client'

import { useEffect } from 'react'

export function CodeProtection() {
  useEffect(() => {
    // ── Console warning ──────────────────────────────────────────────────────
    const css = 'font-size:20px;font-weight:bold;color:#3b82f6;'
    console.log('%c⚠ Stop!', css)
    console.log(
      '%cThis is Abhishek Singh\'s portfolio. Source code is proprietary and protected. Unauthorized use is not permitted.',
      'font-size:13px;color:#94a3b8;'
    )

    // ── Disable right-click ──────────────────────────────────────────────────
    const noContextMenu = (e: MouseEvent) => e.preventDefault()
    document.addEventListener('contextmenu', noContextMenu)

    // ── Disable common inspect shortcuts ─────────────────────────────────────
    const noShortcuts = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U'))
      ) {
        e.preventDefault()
        return false
      }
    }
    document.addEventListener('keydown', noShortcuts)

    return () => {
      document.removeEventListener('contextmenu', noContextMenu)
      document.removeEventListener('keydown', noShortcuts)
    }
  }, [])

  return null
}
