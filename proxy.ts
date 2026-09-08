/**
 * proxy.ts  (Next.js 16+ — replaces middleware.ts)
 *
 * Two responsibilities:
 *   1. Protect /admin/dashboard and /admin/settings — redirect to login if no
 *      valid session cookie.
 *   2. During maintenance mode, redirect /journey and /projects to / so
 *      MaintenanceGuard overlay handles the UI (non-admin visitors only).
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE   = 'portfolio_admin_session'
const PROTECTED_PATHS  = ['/admin/dashboard', '/admin/settings']
const BYPASS_PREFIXES  = [
  '/admin',
  '/api/maintenance',
  '/api/admin',
  '/api/favicon',
  '/_next',
  '/favicon',
]

// ─── Token verification ───────────────────────────────────────────────────────
function verifyToken(token: string): boolean {
  if (!token?.trim()) return false
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
    if (!decoded.username || !decoded.ts) return false
    if (Date.now() - decoded.ts > 24 * 60 * 60 * 1000) return false
    const adminUsername = process.env.ADMIN_USERNAME
    if (!adminUsername || typeof adminUsername !== 'string') return false
    return decoded.username === adminUsername
  } catch {
    return false
  }
}

// ─── Maintenance state fetch ──────────────────────────────────────────────────
// Calls the internal /api/maintenance endpoint with a short timeout.
// Returns false on any network / DB error — never blocks the site.
async function isMaintenanceActive(req: NextRequest): Promise<boolean> {
  try {
    const url = new URL('/api/maintenance', req.url)
    const res = await fetch(url.toString(), {
      headers: { 'x-internal': '1' },
      signal:  AbortSignal.timeout(2000),
    })
    if (!res.ok) return false
    const data = await res.json()
    return Boolean(data.active)
  } catch {
    return false
  }
}

// ─── Proxy handler (formerly "middleware") ────────────────────────────────────
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Admin route protection ─────────────────────────────────────────────
  const isProtected = PROTECTED_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )
  if (isProtected) {
    const sessionCookie = req.cookies.get(SESSION_COOKIE)
    if (!sessionCookie?.value) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (!verifyToken(sessionCookie.value)) {
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('redirect', pathname)
      loginUrl.searchParams.set('reason', 'session_expired')
      const response = NextResponse.redirect(loginUrl)
      response.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
      return response
    }
    return NextResponse.next()
  }

  // ── 2. Maintenance mode — block public pages for non-admin visitors ────────
  const isBypass      = BYPASS_PREFIXES.some(b => pathname.startsWith(b))
  const isPublicRoute = pathname.startsWith('/journey') || pathname.startsWith('/projects')

  if (!isBypass && isPublicRoute) {
    const sessionCookie = req.cookies.get(SESSION_COOKIE)
    const adminLoggedIn = sessionCookie?.value && verifyToken(sessionCookie.value)

    if (!adminLoggedIn) {
      const active = await isMaintenanceActive(req)
      if (active) {
        // Redirect to home — the MaintenanceGuard component takes over there
        return NextResponse.redirect(new URL('/', req.url))
      }
    }
  }

  return NextResponse.next()
}

// ─── Route matcher ────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    '/admin/dashboard',
    '/admin/dashboard/:path*',
    '/admin/settings',
    '/admin/settings/:path*',
    '/journey',
    '/journey/:path*',
    '/projects/:path*',
  ],
}
