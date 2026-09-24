import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { isRateLimited, clientIp } from "@/lib/portal/ratelimit"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers)
  const json = await req.json().catch(() => null)
  const parsed = LoginSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }
  const { email, password } = parsed.data

  if (await isRateLimited("login", `${ip}:${email}`, 8, 15 * 60)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("clients")
    .select("id, role, full_name, is_2fa_enabled")
    .eq("id", data.user.id)
    .single()

  const isProd = process.env.NODE_ENV === "production"

  // Admins with 2FA enabled don't get a full session yet — only a short-lived
  // "pending" cookie holding the tokens Supabase already issued. The real
  // session cookies are set only after /api/portal/auth/2fa/verify succeeds.
  // This means password + 2FA are both required before any authenticated
  // API route becomes reachable, not just before the UI shows admin pages.
  if (profile?.role === "admin" && profile.is_2fa_enabled) {
    const res = NextResponse.json({ ok: true, requires2fa: true, userId: data.user.id })
    res.cookies.set(
      "portal_pending_2fa",
      JSON.stringify({
        userId: data.user.id,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      }),
      { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", maxAge: 5 * 60 }
    )
    return res
  }

  const res = NextResponse.json({
    ok: true,
    requires2fa: false,
    user: { id: data.user.id, email: data.user.email, role: profile?.role ?? "client" },
  })

  res.cookies.set("portal_access_token", data.session.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: data.session.expires_in,
  })
  res.cookies.set("portal_refresh_token", data.session.refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

  return res
}

