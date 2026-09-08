import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// This file must NEVER import next/headers or anything server-only — it's
// imported directly by client components ("use client"), and Next.js
// bundles this entire file into the browser JS. Keep lib/portal/supabase.ts
// (server/service clients) strictly separate from this one.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function getBrowserSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
}
