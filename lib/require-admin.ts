/**
 * lib/require-admin.ts
 * ─────────────────────────────────────────────────────────────────────────
 * NOTE — bug found while building this feature: several existing routes
 * (app/api/schedule/route.ts, app/api/schedule/[id]/route.ts) gate admin
 * actions with a helper that does:
 *
 *   const r = await fetch('/api/admin/session-check', {...})
 *   return r.ok
 *
 * But /api/admin/session-check always responds with HTTP 200 and a JSON
 * body like { valid: false }. fetch().ok only checks the HTTP status code,
 * not the response body — so that check returns true for literally any
 * request, logged in or not. Worth fixing those too; flagged separately.
 *
 * This helper checks the session cookie directly (verifyToken is a pure,
 * synchronous signature check — no network round-trip, no body-vs-status
 * footgun).
 */
import { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifyToken } from './admin-auth'

export function requireAdmin(req: NextRequest): boolean {
  const cookie = req.cookies.get(SESSION_COOKIE)
  return !!cookie?.value && verifyToken(cookie.value)
}
