import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"

const Schema = z.object({ publish: z.boolean() })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePortalAdmin()
    const { id } = await params
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })

    const supabase = getServiceSupabase()
    const { error } = await supabase
      .from("reviews")
      .update({
        is_moderated: true,
        is_published: parsed.data.publish,
        moderated_by: admin.id,
      })
      .eq("id", id)

    if (error) return NextResponse.json({ error: "Could not update review." }, { status: 500 })

    await writeAuditLog({
      actorId: admin.id,
      actorRole: "admin",
      action: parsed.data.publish ? "review.publish" : "review.reject",
      targetType: "review",
      targetId: id,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
