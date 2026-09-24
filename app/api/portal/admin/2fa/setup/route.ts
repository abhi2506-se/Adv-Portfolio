import { NextResponse } from "next/server"
import { requirePortalAdmin, PortalAuthError } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { generateTotpSecret, generateQrCodeDataUrl } from "@/lib/portal/totp"

export async function POST() {
  try {
    const admin = await requirePortalAdmin()
    const secret = generateTotpSecret()
    const qrCodeDataUrl = await generateQrCodeDataUrl(admin.email, secret)

    // Store the secret now but leave is_2fa_enabled=false until the admin
    // proves they scanned it correctly via /enable — otherwise a
    // half-finished setup could lock them out silently.
    const supabase = getServiceSupabase()
    await supabase
      .from("admin_2fa_secrets")
      .upsert({ client_id: admin.id, totp_secret: secret, updated_at: new Date().toISOString() })

    return NextResponse.json({ secret, qrCodeDataUrl })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Could not start 2FA setup." }, { status: 500 })
  }
}
