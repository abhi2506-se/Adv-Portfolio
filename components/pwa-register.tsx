'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    if (Notification.permission !== 'granted') return false

    const res = await fetch('/api/admin/push-subscribe')
    if (!res.ok) return false
    const { publicKey } = await res.json()
    if (!publicKey) return false

    // Always get a fresh subscription — don't reuse potentially stale ones
    // that may have been created against the wrong service worker scope
    const existing = await registration.pushManager.getSubscription()

    const syncSub = async (sub: PushSubscription) => {
      const json = sub.toJSON()
      await fetch('/api/admin/push-subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:    JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      }).catch(() => {})
    }

    if (existing) {
      await syncSub(existing)
      return true
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    await syncSub(subscription)
    console.log('[PWA] Admin push subscription activated ✓', registration.scope)
    return true
  } catch (err) {
    console.warn('[PWA] Push subscription failed:', err)
    return false
  }
}

// ── Register a SW and attach the update listener ──────────────────────────────
async function registerSW(
  scriptUrl: string,
  scope: string
): Promise<ServiceWorkerRegistration | null> {
  try {
    const reg = await navigator.serviceWorker.register(scriptUrl, { scope })
    console.log('[PWA] SW registered scope:', scope)

    reg.addEventListener('updatefound', () => {
      const nw = reg.installing
      if (!nw) return
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          nw.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    })

    return reg
  } catch (err) {
    console.warn('[PWA] SW registration failed for scope', scope, ':', err)
    return null
  }
}

export function PwaRegister() {
  const pathname = usePathname()
  const isAdmin  = pathname?.startsWith('/admin') ?? false

  // ── Register service workers ───────────────────────────────────────────────
  // Architecture:
  //   • sw.js       scope "/"       — main portfolio PWA
  //   • admin-sw.js scope "/admin"  — admin PWA (iOS push requires separate scope)
  //
  // On /admin/* pages, the "/admin" scope takes precedence over "/" for:
  //   • navigator.serviceWorker.controller  (controls this page)
  //   • navigator.serviceWorker.ready       (push subscription target)
  // This ensures push subscriptions are tied to the admin PWA context on iOS.
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let cleanupReload: (() => void) | null = null

    const run = async () => {
      // Always register the main SW
      const mainReg = await registerSW('/sw.js', '/')
      // Trigger update check immediately so new SW versions are installed fast
      mainReg?.update().catch(() => {})

      // Register admin SW only when on admin pages
      if (isAdmin) {
        const adminReg = await registerSW('/admin-sw.js', '/admin')
        adminReg?.update().catch(() => {})
      }
    }

    const onControllerChange = () => window.location.reload()
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    cleanupReload = () =>
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)

    if (document.readyState === 'complete') {
      run()
    } else {
      window.addEventListener('load', run)
    }

    return () => {
      cleanupReload?.()
    }
  }, [isAdmin])

  // ── Subscribe / re-subscribe to push when admin pages are active ──────────
  useEffect(() => {
    if (
      !isAdmin ||
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) return

    const attemptSubscribe = () => {
      // On /admin/* pages, navigator.serviceWorker.ready returns admin-sw.js
      // (the scope "/admin" SW) — so the push subscription is correctly bound
      // to the admin PWA context that iOS uses for push delivery.
      navigator.serviceWorker.ready
        .then((reg) => subscribeToPush(reg))
        .catch(() => {})
    }

    attemptSubscribe()

    const onVisible = () => {
      if (document.visibilityState === 'visible') attemptSubscribe()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [isAdmin])

  return null
}
