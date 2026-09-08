import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { cookies } from "next/headers"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { verifyTotpCode, verifyBackupCode, hashBackupCode } from "@/lib/portal/totp"
import { isRateLimited, clientIp } from "@/lib/portal/ratelimit"
import { writeAuditLog } from "@/lib/portal/auth"

const Schema = z.object({ code: z.string().min(6).max(20) })

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers)
  const cookieStore = await cookies()
  const pendingRaw = cookieStore.get("portal_pending_2fa")?.value
  if (!pendingRaw) {
    return NextResponse.json({ error: "No pending login. Please log in again." }, { status: 401 })
  }

  const parsed = Schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid code." }, { status: 400 })

  let pending: { userId: string; accessToken: string; refreshToken: string; expiresIn: number }
  try {
    pending = JSON.parse(pendingRaw)
  } catch {
    return NextResponse.json({ error: "Invalid session. Please log in again." }, { status: 401 })
  }

  if (await isRateLimited("2fa-verify", `${ip}:${pending.userId}`, 8, 15 * 60)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  const supabase = getServiceSupabase()
  const { data: profile } = await supabase
    .from("clients")
    .select("id, role, email, full_name, is_2fa_enabled")
    .eq("id", pending.userId)
    .single()

  if (!profile || !profile.is_2fa_enabled) {
    return NextResponse.json({ error: "2FA is not properly configured for this account." }, { status: 400 })
  }

  const { data: secretRow } = await supabase
    .from("admin_2fa_secrets")
    .select("totp_secret, totp_backup_codes")
    .eq("client_id", pending.userId)
    .single()

  if (!secretRow?.totp_secret) {
    return NextResponse.json({ error: "2FA is not properly configured for this account." }, { status: 400 })
  }

  const code = parsed.data.code.trim()
  let valid = await verifyTotpCode(code, secretRow.totp_secret)
  let usedBackupHash: string | undefined

  if (!valid && secretRow.totp_backup_codes?.length) {
    const backupResult = verifyBackupCode(code, secretRow.totp_backup_codes)
    valid = backupResult.valid
    usedBackupHash = backupResult.matchedHash
  }

  if (!valid) {
    await writeAuditLog({
      actorId: pending.userId,
      actorRole: "admin",
      action: "auth.2fa_failed",
      ipAddress: ip,
    })
    return NextResponse.json({ error: "Invalid code." }, { status: 401 })
  }

  // A used backup code is burned immediately — one-time use.
  if (usedBackupHash) {
    const remaining = (secretRow.totp_backup_codes ?? []).filter((h: string) => h !== usedBackupHash)
    await supabase.from("admin_2fa_secrets").update({ totp_backup_codes: remaining }).eq("client_id", pending.userId)
  }

  const isProd = process.env.NODE_ENV === "production"
  const res = NextResponse.json({
    ok: true,
    user: { id: profile.id, email: profile.email, role: profile.role },
    backupCodeUsed: Boolean(usedBackupHash),
  })

  res.cookies.set("portal_access_token", pending.accessToken, {
    httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: pending.expiresIn,
  })
  res.cookies.set("portal_refresh_token", pending.refreshToken, {
    httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  })
  res.cookies.set("portal_pending_2fa", "", { path: "/", maxAge: 0 })

  await writeAuditLog({
    actorId: pending.userId,
    actorRole: "admin",
    action: "auth.2fa_success",
    ipAddress: ip,
    metadata: { usedBackupCode: Boolean(usedBackupHash) },
  })

  return res
}
