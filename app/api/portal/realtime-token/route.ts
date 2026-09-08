import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requirePortalUser, PortalAuthError } from "@/lib/portal/auth"

// Realtime (postgres_changes) subscriptions from the browser must present a
// valid Supabase JWT for RLS to apply — otherwise an anon-key-only client
// sees nothing (RLS denies) or, if you were tempted to loosen policies for
// realtime, could see everything (worse). We keep the primary session token
// in an httpOnly cookie for XSS protection, and hand the browser a copy only
// through this authenticated, same-origin endpoint, purely so it can call
// supabase.auth.setSession() before opening a realtime channel.
export async function GET() {
  try {
    await requirePortalUser() // throws if not authenticated
    const cookieStore = await cookies()
    const accessToken = cookieStore.get("portal_access_token")?.value
    const refreshToken = cookieStore.get("portal_refresh_token")?.value
    if (!accessToken || !refreshToken) {
      return NextResponse.json({ error: "No active session." }, { status: 401 })
    }
    return NextResponse.json({ accessToken, refreshToken })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
