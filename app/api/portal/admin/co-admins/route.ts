import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"

const CreateSchema = z.object({
  fullName: z.string().min(2).max(200),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  commissionPerSentEmail: z.number().min(0).default(0),
  commissionPerReply: z.number().min(0).default(0),
})

const UpdateSchema = z.object({
  id: z.string().uuid(),
  commissionPerSentEmail: z.number().min(0).optional(),
  commissionPerReply: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
})

// GET: admin-only list of all co-admins.
export async function GET() {
  try {
    await requirePortalAdmin()
    const supabase = getServiceSupabase()
    const { data, error } = await supabase
      .from("clients")
      .select("id, full_name, email, commission_per_sent_email, commission_per_reply, is_active, created_at")
      .eq("role", "co_admin")
      .order("created_at", { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ coAdmins: data ?? [] })
  } catch (e) {
    if (e instanceof PortalAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// POST: admin creates a new co-admin account + sets their commission rates.
export async function POST(req: NextRequest) {
  try {
    const admin = await requirePortalAdmin()
    const json = await req.json().catch(() => null)
    const parsed = CreateSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    const { fullName, email, password, commissionPerSentEmail, commissionPerReply } = parsed.data

    const supabase = getServiceSupabase()
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (authErr || !authData?.user) {
      return NextResponse.json({ error: authErr?.message ?? "Could not create co-admin account" }, { status: 400 })
    }

    const { error: profileErr } = await supabase.from("clients").insert({
      id: authData.user.id,
      full_name: fullName,
      email,
      role: "co_admin",
      commission_per_sent_email: commissionPerSentEmail,
      commission_per_reply: commissionPerReply,
    })
    if (profileErr) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Could not create co-admin profile" }, { status: 500 })
    }

    await writeAuditLog({
      actorId: admin.id, actorRole: "admin", action: "co_admin.create",
      targetType: "client", targetId: authData.user.id, metadata: { email },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof PortalAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// PATCH: admin updates a co-admin's commission rates or active status.
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requirePortalAdmin()
    const json = await req.json().catch(() => null)
    const parsed = UpdateSchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    const { id, commissionPerSentEmail, commissionPerReply, isActive } = parsed.data

    const supabase = getServiceSupabase()
    const patch: Record<string, unknown> = {}
    if (commissionPerSentEmail !== undefined) patch.commission_per_sent_email = commissionPerSentEmail
    if (commissionPerReply !== undefined) patch.commission_per_reply = commissionPerReply
    if (isActive !== undefined) patch.is_active = isActive

    const { error } = await supabase.from("clients").update(patch).eq("id", id).eq("role", "co_admin")
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await writeAuditLog({
      actorId: admin.id, actorRole: "admin", action: "co_admin.update",
      targetType: "client", targetId: id, metadata: patch,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof PortalAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
