import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalUser, PortalAuthError } from "@/lib/portal/auth"
import { getServerSupabase, getServiceSupabase } from "@/lib/portal/supabase"
import { notifyClient, recordStatusChange } from "@/lib/portal/notify"

const Schema = z.object({
  decision: z.enum(["approve", "request_changes"]),
  note: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser()
    const { id: projectId } = await params
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })

    const supabase = await getServerSupabase()
    const { data: project } = await supabase.from("projects").select("client_id, status").eq("id", projectId).single()
    if (!project || project.client_id !== user.id) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }
    if (project.status !== "client_review") {
      return NextResponse.json({ error: "This project is not currently awaiting your review." }, { status: 409 })
    }

    const toStatus = parsed.data.decision === "approve" ? "final_payment_pending" : "development"
    const service = getServiceSupabase()
    await service.from("projects").update({ status: toStatus, updated_at: new Date().toISOString() }).eq("id", projectId)
    await recordStatusChange({
      projectId,
      fromStatus: "client_review",
      toStatus,
      changedBy: user.id,
      note: parsed.data.note,
    })

    if (parsed.data.decision === "request_changes") {
      // Notify the admin — admins don't get client-style notifications in
      // this schema, so this surfaces via the admin dashboard's "recent
      // activity" feed (status_history) instead of the notifications table.
    } else {
      await notifyClient({
        clientId: user.id,
        projectId,
        type: "status_change",
        title: "Thanks for approving!",
        body: "Please complete the final payment to receive your deliverables.",
      })
    }

    return NextResponse.json({ ok: true, status: toStatus })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
