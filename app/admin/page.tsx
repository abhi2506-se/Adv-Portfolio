/**
 * app/admin/page.tsx  ← THIS FILE WAS MISSING — that is the entire 404 bug
 *
 * WHY THIS CAUSES 404:
 * Next.js App Router requires a page.tsx at every route segment that should
 * be navigable. /app/admin/ had only layout.tsx + two sub-directories
 * (login/ and dashboard/). When the admin PWA cold-starts at start_url
 * "/admin", the browser makes a real HTTP GET /admin request. Next.js finds
 * no page.tsx → returns 404. Client-side navigation (clicking a link in a
 * running app) never hits this path because React router handles it in-memory,
 * which is why it "sometimes works in the browser" but always breaks on:
 *   • PWA home-screen launch
 *   • Page refresh
 *   • Direct URL entry
 *   • Deep link open
 *
 * FIX: This server component checks the session cookie and redirects
 * server-side — no flash, no client-side delay, no race condition.
 */
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { CO_ADMIN_SESSION_COOKIE, verifyCoAdminToken } from '@/lib/co-admin-auth'

export const dynamic = 'force-dynamic' // never cache this redirect

export default async function AdminIndexPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get(SESSION_COOKIE)
  const coAdminSession = cookieStore.get(CO_ADMIN_SESSION_COOKIE)

  if (session?.value && verifyToken(session.value)) {
    // Already authenticated as the real admin → go straight to dashboard
    redirect('/admin/dashboard')
  } else if (coAdminSession?.value && verifyCoAdminToken(coAdminSession.value)) {
    // Already authenticated as a co-admin → go straight to dashboard
    redirect('/admin/dashboard')
  } else {
    // Not authenticated → go to login, preserving intended destination
    redirect('/admin/login')
  }
}
