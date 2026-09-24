import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { requirePortalAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"

const Schema = z.object({ password: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePortalAdmin()
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Password required." }, { status: 400 })

    // Re-verify the password before allowing 2FA to be turned off — this is
    // a security-sensitive action and shouldn't be doable from a hijacked
    // browser session alone (e.g. an unattended logged-in laptop).
    const authClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { error: pwError } = await authClient.auth.signInWithPassword({
      email: admin.email,
      password: parsed.data.password,
    })
    if (pwError) return NextResponse.json({ error: "Incorrect password." }, { status: 401 })

    const supabase = getServiceSupabase()
    await supabase.from("clients").update({ is_2fa_enabled: false }).eq("id", admin.id)
    await supabase.from("admin_2fa_secrets").delete().eq("client_id", admin.id)

    await writeAuditLog({ actorId: admin.id, actorRole: "admin", action: "auth.2fa_disabled" })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Could not disable 2FA." }, { status: 500 })
  }
}
