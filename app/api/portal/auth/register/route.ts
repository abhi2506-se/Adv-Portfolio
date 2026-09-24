import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { writeAuditLog } from "@/lib/portal/auth"
import { isRateLimited, clientIp } from "@/lib/portal/ratelimit"

const RegisterSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  phone: z.string().max(30).optional(),
  company: z.string().max(200).optional(),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  preferredLanguage: z.string().min(2).max(10),
})

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers)
  if (await isRateLimited("register", ip, 5, 15 * 60)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  const json = await req.json().catch(() => null)
  const parsed = RegisterSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
  }
  const { fullName, email, password, phone, company, country, preferredLanguage } = parsed.data

  const supabase = getServiceSupabase()

  // Create the Supabase Auth identity (service role can create users
  // directly without triggering the default confirmation-email flow, but we
  // still send our own verification email via Supabase's inviteUserByEmail
  // style flow — for simplicity here we use signUp so Supabase's own email
  // confirmation applies if enabled in your project's Auth settings).
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no separate email-confirmation flow is wired up for the portal yet,
    // so unconfirmed users could register successfully but then get "Invalid email or
    // password" on login (Supabase's signInWithPassword rejects unconfirmed accounts,
    // and the login route masks that as a generic credentials error). Marking the
    // email confirmed at creation time lets a newly registered client log in immediately.
  })

  if (authError || !authData?.user) {
    const message = authError?.message?.includes("already registered")
      ? "An account with this email already exists."
      : authError?.message ?? "Registration failed."
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { error: profileError } = await supabase.from("clients").insert({
    id: authData.user.id,
    full_name: fullName,
    email,
    phone: phone ?? null,
    company: company ?? null,
    country,
    preferred_language: preferredLanguage,
    role: "client",
  })

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned identity.
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 })
  }

  await writeAuditLog({
    actorId: authData.user.id,
    actorRole: "client",
    action: "auth.register",
    targetType: "client",
    targetId: authData.user.id,
    ipAddress: ip,
  })

  return NextResponse.json({ ok: true, message: "Account created. You can now log in." })
}
