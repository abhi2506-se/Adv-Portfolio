import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { notifyClient, recordStatusChange } from "@/lib/portal/notify"

// Only these forward transitions are allowed via this endpoint. Payment
// transitions (pending_payment -> under_review) happen only via the webhook;
// accept/reject have their own endpoints; approval happens via the client's
// /approve endpoint. This keeps the state machine centralized and prevents
// an admin UI bug from skipping steps like "completed" without a review.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  accepted: ["planning"],
  planning: ["design"],
  design: ["development"],
  development: ["testing"],
  testing: ["client_review"],
  delivered: ["completed"],
}

const Schema = z.object({
  toStatus: z.string(),
  note: z.string().max(1000).optional(),
  finalAmount: z.number().positive().optional(), // required when moving into client_review
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePortalAdmin()
    const { id } = await params
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })
    const { toStatus, note, finalAmount } = parsed.data

    const supabase = getServiceSupabase()
    const { data: project, error } = await supabase.from("projects").select("id, status, client_id").eq("id", id).single()
    if (error || !project) return NextResponse.json({ error: "Project not found." }, { status: 404 })

    const allowedNext = ALLOWED_TRANSITIONS[project.status] ?? []
    if (!allowedNext.includes(toStatus)) {
      return NextResponse.json(
        { error: `Cannot move from '${project.status}' to '${toStatus}'.` },
        { status: 409 }
      )
    }
    if (toStatus === "client_review" && !finalAmount) {
      return NextResponse.json({ error: "finalAmount is required when moving to client_review." }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = { status: toStatus, updated_at: new Date().toISOString() }
    if (finalAmount) updatePayload.final_amount = finalAmount

    await supabase.from("projects").update(updatePayload).eq("id", id)
    await recordStatusChange({ projectId: id, fromStatus: project.status, toStatus, changedBy: admin.id, note })
    await notifyClient({
      clientId: project.client_id,
      projectId: id,
      type: "status_change",
      title: "Project status updated",
      body: note ?? `Your project has moved to: ${toStatus.replace(/_/g, " ")}.`,
    })
    await writeAuditLog({
      actorId: admin.id,
      actorRole: "admin",
      action: "project.advance_status",
      targetType: "project",
      targetId: id,
      metadata: { from: project.status, to: toStatus },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
