import { NextRequest, NextResponse } from "next/server"
import { requirePortalUser, PortalAuthError } from "@/lib/portal/auth"
import { getServerSupabase } from "@/lib/portal/supabase"

export async function GET() {
  try {
    const user = await requirePortalUser()
    const supabase = await getServerSupabase()
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) return NextResponse.json({ error: "Could not load notifications." }, { status: 500 })
    return NextResponse.json({ notifications: data })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requirePortalUser()
    const { ids }: { ids: string[] } = await req.json()
    const supabase = await getServerSupabase()
    await supabase.from("notifications").update({ is_read: true }).eq("client_id", user.id).in("id", ids)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
