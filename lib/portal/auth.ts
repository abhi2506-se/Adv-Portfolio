import { cookies } from "next/headers"
import { getServerSupabase, getServiceSupabase } from "./supabase"

export interface PortalUser {
  id: string
  email: string
  full_name: string
  role: "client" | "admin" | "co_admin"
  country: string | null
  preferred_language: string
}

/**
 * Resolves the current portal user from the session cookie set at login.
 * Returns null if not authenticated. This calls Supabase's auth.getUser()
 * which validates the JWT against Supabase itself (not just decodes it),
 * so a forged/expired cookie is rejected server-side.
 */
export async function getPortalUser(): Promise<PortalUser | null> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get("portal_access_token")?.value
  if (!accessToken) return null

  const supabase = await getServerSupabase()
  const { data: authData, error: authErr } = await supabase.auth.getUser(accessToken)
  if (authErr || !authData?.user) return null

  const { data: profile, error: profileErr } = await supabase
    .from("clients")
    .select("id, email, full_name, role, country, preferred_language")
    .eq("id", authData.user.id)
    .single()

  if (profileErr || !profile) return null
  return profile as PortalUser
}

export class PortalAuthError extends Error {
  status: number
  constructor(message: string, status = 401) {
    super(message)
    this.status = status
  }
}

export async function requirePortalUser(): Promise<PortalUser> {
  const user = await getPortalUser()
  if (!user) throw new PortalAuthError("Not authenticated", 401)
  return user
}

export async function requirePortalAdmin(): Promise<PortalUser> {
  const user = await requirePortalUser()
  if (user.role !== "admin") throw new PortalAuthError("Admin access required", 403)
  return user
}

/** Also allows co_admin, for the shared parts of the proposals/commission UI. */
export async function requirePortalAdminOrCoAdmin(): Promise<PortalUser> {
  const user = await requirePortalUser()
  if (user.role !== "admin" && user.role !== "co_admin") {
    throw new PortalAuthError("Admin or co-admin access required", 403)
  }
  return user
}

/**
 * Bridges the portfolio-owner login (username/password/OTP via
 * app/api/admin/login) into a real client-portal Supabase session, so the
 * single set of credentials that unlocks the portfolio's own admin panel
 * also unlocks the client-portal admin — no second account to manage.
 *
 * How it works (service-role only, never exposed to the browser):
 *  1. Ensure a `clients` row + Supabase auth identity exist for this admin
 *     email, with role = 'admin'.
 *  2. Mint a real Supabase session for that identity using
 *     `admin.generateLink` + `verifyOtp`, which issues a valid
 *     access/refresh token pair WITHOUT needing to know a Supabase
 *     password (the caller has already proven identity via the portfolio
 *     admin's own username/password + OTP check).
 *
 * Called from app/api/admin/login/route.ts right after OTP verification
 * succeeds; the returned tokens are set as the normal portal_access_token /
 * portal_refresh_token cookies alongside the portfolio_admin_session cookie.
 */
export async function mintPortalAdminSession(adminEmail: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
} | null> {
  if (!adminEmail) return null
  try {
    const service = getServiceSupabase()

    const { data: existing } = await service
      .from("clients")
      .select("id, role")
      .eq("email", adminEmail)
      .maybeSingle()

    let userId = existing?.id as string | undefined

    if (!userId) {
      const { data: created, error: createErr } = await service.auth.admin.createUser({
        email: adminEmail,
        email_confirm: true,
        user_metadata: { source: "portfolio_admin_bridge" },
      })
      if (createErr || !created?.user) return null
      userId = created.user.id
      await service.from("clients").insert({
        id: userId,
        full_name: "Site Admin",
        email: adminEmail,
        role: "admin",
      })
    } else if (existing?.role !== "admin") {
      // Keep the bridged identity's role in sync with reality.
      await service.from("clients").update({ role: "admin" }).eq("id", userId)
    }

    const { data: link, error: linkErr } = await service.auth.admin.generateLink({
      type: "magiclink",
      email: adminEmail,
    })
    if (linkErr || !link) return null

    const hashedToken = (link.properties as any)?.hashed_token
    if (!hashedToken) return null

    const { createClient } = await import("@supabase/supabase-js")
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
    const { data: verified, error: verifyErr } = await anon.auth.verifyOtp({
      token_hash: hashedToken,
      type: "magiclink",
    })
    if (verifyErr || !verified.session) return null

    return {
      accessToken: verified.session.access_token,
      refreshToken: verified.session.refresh_token,
      expiresIn: verified.session.expires_in,
    }
  } catch {
    // Bridging is best-effort: if it fails, the portfolio admin login still
    // succeeds on its own — the person just won't get auto-logged into the
    // client portal and can log in there separately.
    return null
  }
}

/**
 * Writes an audit log row via the service client (bypasses RLS deliberately
 * — audit_logs has no insert policy for regular users, only admins can
 * SELECT, so every insert must go through here).
 */
export async function writeAuditLog(entry: {
  actorId: string | null
  actorRole: string | null
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string | null
}) {
  const supabase = getServiceSupabase()
  await supabase.from("audit_logs").insert({
    actor_id: entry.actorId,
    actor_role: entry.actorRole,
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    metadata: entry.metadata ?? {},
    ip_address: entry.ipAddress ?? null,
  })
}
