'use client'
/**
 * VisitorNotifications
 *
 * Shows a subtle notification opt-in prompt to site visitors.
 * Stores subscription in the visitor_push_subscriptions DB table.
 * Receives push notifications whenever the admin broadcasts an update,
 * publishes a new blog post, or updates the portfolio.
 *
 * This component is included in app/layout.tsx (root layout)
 * so it runs on all public pages but NOT on /admin routes.
 */

import { useEffect, useState, useCallback } from 'react'

const VAPID_PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

// Convert VAPID public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

async function getFingerprint(): Promise<string> {
  try {
    const stored = localStorage.getItem('__fp_id')
    if (stored && stored.length > 10) return stored
  } catch {}
  return ''
}

async function getUserProfile(): Promise<{ user_name: string; user_email: string }> {
  try {
    const stored = localStorage.getItem('portfolio_visitor_profile')
    if (stored) {
      const p = JSON.parse(stored)
      return {
        user_name:  [p.first_name, p.last_name].filter(Boolean).join(' '),
        user_email: p.email || '',
      }
    }
  } catch {}
  return { user_name: '', user_email: '' }
}

export function VisitorNotifications() {
  const [show, setShow]         = useState(false)
  const [status, setStatus]     = useState<'idle' | 'loading' | 'done' | 'denied'>('idle')
  const [subscribed, setSubscribed] = useState(false)

  // Only show on public pages, never on /admin
  const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')

  useEffect(() => {
    if (isAdmin) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!VAPID_PUB) return

    // If already granted + subscribed, silently re-register (keeps subscription fresh)
    if (Notification.permission === 'granted') {
      silentSubscribe()
      return
    }

    // If explicitly denied, never show the prompt again
    if (Notification.permission === 'denied') return

    // Show prompt after 8 seconds on first visit only
    const dismissed = localStorage.getItem('__visitor_notif_dismissed')
    if (dismissed) return

    const t = setTimeout(() => setShow(true), 8_000)
    return () => clearTimeout(t)
  }, [isAdmin])

  const silentSubscribe = useCallback(async () => {
    try {
      if (!VAPID_PUB) return
      const reg = await navigator.serviceWorker.ready
      let sub   = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUB),
        })
      }
      const key  = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      if (!key || !auth) return

      const [fp, profile] = await Promise.all([getFingerprint(), getUserProfile()])

      await fetch('/api/visitor-push-subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint:    sub.endpoint,
          p256dh:      btoa(String.fromCharCode(...new Uint8Array(key))),
          auth:        btoa(String.fromCharCode(...new Uint8Array(auth))),
          fingerprint: fp,
          ...profile,
        }),
      })
      setSubscribed(true)
    } catch {}
  }, [])

  const handleEnable = async () => {
    setStatus('loading')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setStatus('denied')
        localStorage.setItem('__visitor_notif_dismissed', '1')
        setTimeout(() => setShow(false), 2000)
        return
      }
      await silentSubscribe()
      setStatus('done')
      localStorage.setItem('__visitor_notif_dismissed', '1')
      setTimeout(() => setShow(false), 2500)
    } catch {
      setStatus('idle')
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('__visitor_notif_dismissed', '1')
    setShow(false)
  }

  if (!show || isAdmin) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9000] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        {/* Top accent line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent" />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0 text-xl">
              🔔
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Stay Updated</p>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Get notified when Abhishek publishes new projects, blogs, or updates.
              </p>
            </div>
            <button onClick={handleDismiss} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 text-lg leading-none mt-0.5">×</button>
          </div>

          {status === 'done' ? (
            <div className="mt-3 flex items-center gap-2 text-green-400 text-sm font-medium">
              <span>✅</span> You're subscribed! Updates will appear on your device.
            </div>
          ) : status === 'denied' ? (
            <div className="mt-3 text-slate-400 text-xs">
              Notifications blocked. Enable them in browser settings to subscribe.
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleEnable}
                disabled={status === 'loading'}
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/60 text-white text-xs font-semibold transition-all"
              >
                {status === 'loading' ? '⏳ Enabling…' : '🔔 Enable Notifications'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-all"
              >
                Not now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
