'use client'

/**
 * AdminDarkLock.tsx
 *
 * Forces the admin panel to always render in dark mode, completely isolated
 * from next-themes. No matter what theme the public portfolio is set to
 * (light / dark / system), the admin panel always stays dark.
 *
 * How it works:
 *  1. On mount  — saves the original <html> classList + next-themes localStorage
 *                 value, then forcibly pins `dark` on <html> and overrides the
 *                 localStorage key so next-themes can't re-apply a light class.
 *  2. MutationObserver — watches for any external code (next-themes hydration,
 *                 theme toggle on another tab, etc.) trying to remove `dark`
 *                 from <html> and immediately re-adds it.
 *  3. On unmount — removes the MutationObserver and restores the original theme
 *                 class + localStorage value so the public site is unaffected.
 */

import { useEffect, useRef } from 'react'

const NEXT_THEMES_KEY = 'theme'   // localStorage key next-themes uses by default

export function AdminDarkLock({ children }: { children: React.ReactNode }) {
  const savedClassRef     = useRef<string[]>([])
  const savedStorageRef   = useRef<string | null>(null)
  const observerRef       = useRef<MutationObserver | null>(null)

  useEffect(() => {
    const html = document.documentElement

    // ── 1. Save originals ───────────────────────────────────────────────────
    savedClassRef.current   = Array.from(html.classList)
    savedStorageRef.current = localStorage.getItem(NEXT_THEMES_KEY)

    // ── 2. Apply dark, remove light ─────────────────────────────────────────
    const applyDark = () => {
      if (!html.classList.contains('dark')) {
        html.classList.add('dark')
      }
      // Also remove 'light' if next-themes wrote it
      if (html.classList.contains('light')) {
        html.classList.remove('light')
      }
      // Override localStorage so next-themes won't re-apply light on the next
      // paint / hydration cycle
      localStorage.setItem(NEXT_THEMES_KEY, 'dark')
    }

    applyDark()

    // ── 3. Watch for any external removal of 'dark' ─────────────────────────
    observerRef.current = new MutationObserver(() => {
      applyDark()
    })
    observerRef.current.observe(html, {
      attributes:      true,
      attributeFilter: ['class'],
    })

    // ── 4. Restore on unmount (navigating away from /admin/*) ───────────────
    return () => {
      observerRef.current?.disconnect()
      observerRef.current = null

      // Restore original class list
      html.classList.remove('dark', 'light')
      savedClassRef.current.forEach(cls => html.classList.add(cls))

      // Restore original localStorage value (or remove if it wasn't set)
      if (savedStorageRef.current !== null) {
        localStorage.setItem(NEXT_THEMES_KEY, savedStorageRef.current)
      } else {
        localStorage.removeItem(NEXT_THEMES_KEY)
      }
    }
  }, [])

  // Render children as-is — the lock is purely DOM-level
  return <>{children}</>
}
