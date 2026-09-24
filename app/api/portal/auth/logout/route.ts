import { NextRequest, NextResponse } from "next/server"
import { getServerSupabase } from "@/lib/portal/supabase"

export async function POST(_req: NextRequest) {
  const supabase = await getServerSupabase()
  await supabase.auth.signOut()

  const res = NextResponse.json({ ok: true })
  res.cookies.set("portal_access_token", "", { path: "/", maxAge: 0 })
  res.cookies.set("portal_refresh_token", "", { path: "/", maxAge: 0 })
  return res
}
