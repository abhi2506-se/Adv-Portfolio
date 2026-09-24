/**
 * next.config.mjs — Updated with critical PWA/SW headers
 *
 * CHANGES:
 * 1. Cache-Control: no-cache on SW files — without this, the browser caches
 *    the old service worker indefinitely and your code fixes never reach devices.
 * 2. Service-Worker-Allowed header — explicitly declares the allowed scope for
 *    each SW file. Required for admin-sw.js registering with scope '/admin'.
 * 3. Content-Type for SW — prevents browser refusing to install SW due to
 *    wrong MIME type (some Vercel edge cases).
 * 4. Manifest Cache-Control — manifests should be fresh so PWA install prompt
 *    and start_url always reflect the latest config.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Performance: enable compression and optimized bundling
  compress: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },

  async headers() {
    return [
      // ── Main service worker ───────────────────────────────────────────────
      {
        source: '/sw.js',
        headers: [
          // CRITICAL: SW files must never be cached by browser/CDN
          // If the old SW is cached, code fixes never reach the device
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          // Explicitly allow this SW to control the root scope
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },

      // ── Admin-specific service worker ─────────────────────────────────────
      {
        source: '/admin-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          // REQUIRED: admin-sw.js is at root "/" but registers with scope "/admin"
          // Without this header, browser refuses the narrower-than-default scope
          // registration (though technically allowed, explicit is safer on iOS)
          { key: 'Service-Worker-Allowed', value: '/admin' },
        ],
      },

      // ── Manifests — should always be fresh ───────────────────────────────
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
        ],
      },
      {
        source: '/admin-manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
        ],
      },
    ]
  },
}

export default nextConfig
