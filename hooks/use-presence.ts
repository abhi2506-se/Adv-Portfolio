'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type PresenceStatus = 'online' | 'away' | 'offline'
export interface PresenceInfo { status: PresenceStatus; awaySeconds: number; lastActiveAt?: number | null }
export type PresenceMap = { user: PresenceInfo; admin: PresenceInfo }

const HEARTBEAT_MS = 10_000
// How long a visible+focused tab is still considered "active" without any
// physical interaction (mouse/key/touch). Chat presence should reflect
// "the chat is open in front of them", the same way WhatsApp Web shows you
// online while the tab is open even if you're just reading, not typing —
// it should NOT flip to Away just because someone stopped moving the mouse
// for a few seconds while reading a message. This was previously 15s,
// which caused "Online" to flicker to "Away"/"Offline" mid-conversation
// even while the person was actively present and reading. 5 minutes is a
// generous grace period that only kicks in for genuinely unattended tabs.
const INACTIVITY_MS = 5 * 60_000

/**
 * Drives Online / Away / Offline for a Live Chat participant.
 *
 * - Online: tab visible, focused, and there's been recent user interaction.
 * - Away: tab hidden/blurred/minimized OR idle -> starts a live "Away · Xm" timer.
 * - Offline: computed server-side once Away has lasted 5 minutes.
 *
 * Call this from BOTH the user widget and the admin chat panel — it posts
 * a heartbeat to /api/live-chat/presence and returns the live presence map
 * for both sides (kept in sync via the realtime channel + polling fallback).
 */
export function usePresence(chatId: string | null, role: 'user' | 'admin', isAdminAuthed = false) {
  const [presence, setPresence] = useState<PresenceMap>({
    user: { status: 'offline', awaySeconds: 0 },
    admin: { status: 'offline', awaySeconds: 0 },
  })
  const lastActivityRef = useRef(Date.now())
  const activeRef = useRef(true)

  const computeActive = useCallback(() => {
    const visible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true
    const focused = typeof document !== 'undefined' ? document.hasFocus() : true
    const recentlyActive = Date.now() - lastActivityRef.current < INACTIVITY_MS
    return visible && focused && recentlyActive
  }, [])

  const sendHeartbeat = useCallback(async (activeOverride?: boolean) => {
    if (!chatId) return
    const active = activeOverride ?? computeActive()
    activeRef.current = active
    try {
      const res = await fetch('/api/live-chat/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chatId, active }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.presence) setPresence(data.presence)
      } else {
        console.error('[live-chat] presence heartbeat failed', res.status, await res.text().catch(() => ''))
      }
    } catch (err) {
      console.error('[live-chat] presence heartbeat error', err)
    }
  }, [chatId, computeActive])

  // Mark activity on any user interaction.
  useEffect(() => {
    const bump = () => { lastActivityRef.current = Date.now() }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(ev => window.addEventListener(ev, bump, { passive: true }))
    return () => events.forEach(ev => window.removeEventListener(ev, bump))
  }, [])

  // Instant "Away" the moment the tab/window/app is actually closing.
  // A normal fetch() can get cancelled mid-flight when the page unloads, so
  // for the close/hide cases we use navigator.sendBeacon, which is designed
  // to reliably deliver a small POST even as the page is torn down — this
  // is what makes "user suddenly closed the site" show up on the admin side
  // immediately instead of waiting for the away timeout to elapse.
  const sendAwayBeacon = useCallback(() => {
    if (!chatId) return
    activeRef.current = false
    try {
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ chatId, active: false })], { type: 'application/json' })
        const ok = navigator.sendBeacon('/api/live-chat/presence', blob)
        if (ok) return
      }
    } catch {}
    // Fallback for browsers without sendBeacon support.
    sendHeartbeat(false)
  }, [chatId, sendHeartbeat])

  // Immediate heartbeat on visibility/focus change (so status flips instantly).
  useEffect(() => {
    if (!chatId) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') sendAwayBeacon()
      else sendHeartbeat()
    }
    const onFocus = () => sendHeartbeat(true)
    const onBlur = () => sendHeartbeat(false)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    window.addEventListener('pagehide', sendAwayBeacon)
    window.addEventListener('beforeunload', sendAwayBeacon)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('pagehide', sendAwayBeacon)
      window.removeEventListener('beforeunload', sendAwayBeacon)
    }
  }, [chatId, sendHeartbeat, sendAwayBeacon])

  // Regular heartbeat loop.
  useEffect(() => {
    if (!chatId) return
    sendHeartbeat()
    const interval = setInterval(() => sendHeartbeat(), HEARTBEAT_MS)
    return () => clearInterval(interval)
  }, [chatId, sendHeartbeat])

  // Polling fallback (also keeps the "Away · Xm" ticker updating live).
  useEffect(() => {
    if (!chatId) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/live-chat/presence?chatId=${encodeURIComponent(chatId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.presence) setPresence(data.presence)
        } else {
          console.error('[live-chat] presence poll failed', res.status)
        }
      } catch (err) {
        console.error('[live-chat] presence poll error', err)
      }
    }
    poll()
    const interval = setInterval(poll, 5_000)
    return () => clearInterval(interval)
  }, [chatId])

  // Lets a caller apply an instantly-received realtime `presence` broadcast
  // (see hooks/use-live-chat-realtime.ts onPresence) without waiting for the
  // next 5s poll tick — this is what makes Online/Away/Offline and "last
  // seen" flip immediately instead of lagging behind by up to 5s.
  const setPresenceFromBroadcast = useCallback((role: 'user' | 'admin', info: { status: PresenceStatus; awaySeconds: number; lastActiveAt?: number | null }) => {
    setPresence(prev => ({ ...prev, [role]: { status: info.status, awaySeconds: info.awaySeconds, lastActiveAt: info.lastActiveAt ?? prev[role].lastActiveAt } }))
  }, [])

  return { presence, isActive: activeRef.current, setPresenceFromBroadcast }
}

export function formatAway(seconds: number): string {
  if (seconds < 60) return `Away · ${seconds}s`
  const m = Math.floor(seconds / 60)
  return `Away · ${m}m`
}

/** WhatsApp-style "last seen" text from a last-active timestamp. */
export function formatLastSeen(lastActiveAt: number | null | undefined): string {
  if (!lastActiveAt) return 'last seen a while ago'
  const now = Date.now()
  const diffMs = now - lastActiveAt
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'last seen just now'
  if (diffMin < 60) return `last seen ${diffMin} min ago`

  const d = new Date(lastActiveAt)
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  const dayKey = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const todayKey = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const yesterdayKey = new Date(now - 86_400_000).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  if (dayKey === todayKey) return `last seen today at ${time}`
  if (dayKey === yesterdayKey) return `last seen yesterday at ${time}`
  const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' })
  return `last seen ${dateStr} at ${time}`
}
