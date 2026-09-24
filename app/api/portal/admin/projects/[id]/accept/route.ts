import { NextRequest, NextResponse } from "next/server"
import { requirePortalAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { notifyClient, recordStatusChange } from "@/lib/portal/notify"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePortalAdmin()
    const { id } = await params
    const supabase = getServiceSupabase()

    const { data: project, error } = await supabase.from("projects").select("id, status, client_id").eq("id", id).single()
    if (error || !project) return NextResponse.json({ error: "Project not found." }, { status: 404 })

    if (project.status !== "under_review") {
      return NextResponse.json({ error: `Cannot accept a project in status '${project.status}'.` }, { status: 409 })
    }

    await supabase.from("projects").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", id)
    await recordStatusChange({ projectId: id, fromStatus: "under_review", toStatus: "accepted", changedBy: admin.id })
    await notifyClient({
      clientId: project.client_id,
      projectId: id,
      type: "status_change",
      title: "Your project has been accepted!",
      body: "We've accepted your project and will begin planning shortly.",
    })
    await writeAuditLog({
      actorId: admin.id,
      actorRole: "admin",
      action: "project.accept",
      targetType: "project",
      targetId: id,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
