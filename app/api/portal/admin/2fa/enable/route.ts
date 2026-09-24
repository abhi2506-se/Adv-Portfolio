import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { verifyTotpCode, generateBackupCodes, hashBackupCode } from "@/lib/portal/totp"

const Schema = z.object({ code: z.string().min(6).max(10) })

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePortalAdmin()
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid code." }, { status: 400 })

    const supabase = getServiceSupabase()
    const { data: secretRow } = await supabase
      .from("admin_2fa_secrets")
      .select("totp_secret")
      .eq("client_id", admin.id)
      .single()
    if (!secretRow?.totp_secret) {
      return NextResponse.json({ error: "Start 2FA setup first." }, { status: 400 })
    }

    if (!(await verifyTotpCode(parsed.data.code, secretRow.totp_secret))) {
      return NextResponse.json({ error: "That code didn't match. Try the current code from your app." }, { status: 400 })
    }

    const backupCodes = generateBackupCodes(8)
    const hashedCodes = backupCodes.map(hashBackupCode)

    await supabase
      .from("admin_2fa_secrets")
      .update({ totp_backup_codes: hashedCodes, updated_at: new Date().toISOString() })
      .eq("client_id", admin.id)
    await supabase.from("clients").update({ is_2fa_enabled: true }).eq("id", admin.id)

    await writeAuditLog({ actorId: admin.id, actorRole: "admin", action: "auth.2fa_enabled" })

    // Backup codes are returned exactly once, in plaintext, right now — they
    // are never retrievable again after this response (only their hashes
    // are stored).
    return NextResponse.json({ ok: true, backupCodes })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Could not enable 2FA." }, { status: 500 })
  }
}
