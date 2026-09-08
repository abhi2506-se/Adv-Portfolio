// ─── Portfolio PWA — Main Service Worker (scope: /) ──────────────────────────
// VERSION: 4  ← bumped: fixed push notification handling
const CACHE_NAME = 'abhishek-portfolio-v4'

const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  )
  self.skipWaiting()
})

// ── Activate: clean ALL stale caches ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: smart caching strategy ────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // API routes → Network-ONLY
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Admin routes → Network-first
  if (url.pathname.startsWith('/admin')) {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(request).then((cached) => cached || Response.error())
      )
    )
    return
  }

  // Static assets → Stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone())
          return res
        })
        return cached || networkFetch
      })
    )
  )
})

// ── Push: fallback handler for main SW ───────────────────────────────────────
// Admin push is handled by admin-sw.js (scope /admin).
// This is a fallback in case admin-sw.js isn't installed yet.
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload = {}
      try {
        if (event.data) payload = event.data.json()
      } catch {
        try {
          payload = { title: 'Portfolio Admin', body: event.data ? event.data.text() : 'New notification' }
        } catch {
          payload = { title: 'Portfolio Admin', body: 'New notification' }
        }
      }

      const {
        title = 'Portfolio Admin',
        body  = 'You have a new notification',
        icon  = '/icons/icon-192x192.png',
        badge = '/icons/icon-192x192.png',
        tag   = 'admin-notification',
        url   = '/admin/dashboard',
      } = payload

      await self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        renotify: true,
        data: { url },
      })
    })()
  )
})

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url || '/admin/dashboard'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes('/admin') && 'focus' in client) {
            client.navigate(targetUrl)
            client.focus()
            return
          }
        }
        if (clients.openWindow) return clients.openWindow(targetUrl)
      })
  )
})

// ── Skip-waiting ──────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
