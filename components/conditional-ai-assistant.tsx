'use client'

/**
 * ConditionalAIAssistant
 * - Hidden on /admin/* routes (admin panel)
 * - Hidden on /journey route (Instagram-style feed — no chatbot clutter)
 * - Hidden when maintenance mode is active (polled every 5s)
 * - Smooth opacity/scale transition so it never causes layout shift
 */

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { AIAssistant } from '@/components/ai-assistant'

const MAINTENANCE_POLL_MS = 5_000
const ADMIN_COOKIE = 'portfolio_admin_session'

function isAdmin() {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${ADMIN_COOKIE}=`))
}

export function ConditionalAIAssistant() {
  const pathname = usePathname()
  const [maintenanceActive, setMaintenanceActive] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll maintenance state
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        setMaintenanceActive(Boolean(data.active))
      } catch {}
    }
    check()
    timerRef.current = setInterval(check, MAINTENANCE_POLL_MS)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // Conditions to hide chatbot
  const isAdminRoute    = pathname?.startsWith('/admin')
  const isJourneyRoute  = pathname?.startsWith('/journey')
  const isAdminUser     = isAdmin()
  const hideDuringMaint = maintenanceActive && !isAdminUser

  const shouldShow = !isAdminRoute && !isJourneyRoute && !hideDuringMaint

  return (
    // IMPORTANT: Do NOT wrap AIAssistant in any element with CSS transforms
    // (scale, translate, etc.) — transforms create a new containing block which
    // makes position:fixed children position relative to the wrapper instead of
    // the viewport, causing the chatbot window to appear in the wrong position.
    <>
      {shouldShow && <AIAssistant />}
    </>
  )
}
