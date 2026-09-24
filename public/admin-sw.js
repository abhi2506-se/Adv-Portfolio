// ─── Portfolio Admin PWA — Dedicated Service Worker (scope: /admin) ──────────
// VERSION: 4  ← bumped: force refresh so all admin fetches bypass cache
//
// KEY CHANGE: All admin page fetches use network-first with no caching.
// API routes remain network-only (never cached).
// Version bump triggers unregister+reinstall on existing PWA installs.

const CACHE_NAME = 'admin-panel-v4'

const PRECACHE_URLS = [
  '/admin-manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete ALL old caches (including old admin-panel-v2)
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
      // Take control of all open clients immediately
      self.clients.claim(),
    ])
  )
})

// ── Fetch: Network-first for all admin + API routes — NEVER serve stale data ─
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (!url.pathname.startsWith('/admin') && !url.pathname.startsWith('/api/')) return

  // ALL routes within admin scope: pure network-only, no caching.
  // This ensures the admin panel always shows live data (not stale cached state)
  // when opened from the home screen as a PWA.
  event.respondWith(
    fetch(request, { credentials: 'include' }).catch(() =>
      caches.match(request).then((cached) => cached || Response.error())
    )
  )
})

// ── Push ─────────────────────────────────────────────────────────────────────
// iOS 16.4+ and Android Chrome requirements:
//   ✓ event.waitUntil wraps the entire async operation
//   ✓ showNotification is awaited inside waitUntil
//   ✓ No unsupported options (no `actions`, `vibrate`, `requireInteraction`)
//   ✓ renotify:true ensures repeat notifications with same tag still appear
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      // Parse payload — web-push sends JSON, fallback to plain text
      let payload = {}
      try {
        if (event.data) {
          payload = event.data.json()
        }
      } catch {
        try {
          const text = event.data ? event.data.text() : ''
          payload = { title: 'Portfolio Admin', body: text }
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

      // MUST await showNotification — iOS closes the SW event loop otherwise
      await self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        renotify: true,  // Show even if same tag is already displayed
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
        // Focus existing admin window if open
        for (const client of windowClients) {
          if (client.url.includes('/admin') && 'focus' in client) {
            client.navigate(targetUrl)
            client.focus()
            return
          }
        }
        // Open new window
        if (clients.openWindow) return clients.openWindow(targetUrl)
      })
  )
})

// ── Skip-waiting message ──────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
