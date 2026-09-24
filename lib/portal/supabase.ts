import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/**
 * SERVER-ONLY Supabase clients. This file imports next/headers, so it must
 * never be imported from a "use client" component — Next.js will fail the
 * build (client bundles can't include next/headers). Client components
 * needing Supabase should import from ./supabase-browser instead.
 *
 * Two distinct clients, on purpose:
 *
 * 1. getServerSupabase()  — runs with the calling user's JWT (from the
 *    portal-session cookie). All RLS policies apply. Use this for anything
 *    the *client* does, so Postgres itself enforces row ownership (IDOR
 *    protection lives in the database, not just in application code).
 *
 * 2. getServiceSupabase() — uses the SERVICE_ROLE key, bypasses RLS.
 *    ONLY use inside: webhook handlers (no user session exists),
 *    admin-verified routes (after requirePortalAdmin() has already run),
 *    and the public analytics endpoint (which manually whitelists columns).
 *    NEVER expose the service key to the browser.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function getServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("portal_access_token")?.value

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getServiceSupabase(): SupabaseClient {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Required for webhooks/admin routes."
    )
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
