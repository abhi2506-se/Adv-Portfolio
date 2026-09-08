import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { initiateRazorpayRefund } from "@/lib/portal/razorpay"
import { notifyClient, recordStatusChange } from "@/lib/portal/notify"

const Schema = z.object({ reason: z.string().min(3).max(1000) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePortalAdmin()
    const { id } = await params
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 })

    const supabase = getServiceSupabase()
    const { data: project, error } = await supabase.from("projects").select("id, status, client_id").eq("id", id).single()
    if (error || !project) return NextResponse.json({ error: "Project not found." }, { status: 404 })

    // Rejection with refund is only valid pre-acceptance, per the defined
    // lifecycle ("Reject & Refund" applies to the review stage only).
    if (project.status !== "under_review") {
      return NextResponse.json({ error: `Cannot reject a project in status '${project.status}'.` }, { status: 409 })
    }

    const { data: advancePayment } = await supabase
      .from("payments")
      .select("id, razorpay_payment_id, amount, status")
      .eq("project_id", id)
      .eq("type", "advance")
      .eq("status", "captured")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    await supabase
      .from("projects")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", id)
    await recordStatusChange({
      projectId: id,
      fromStatus: "under_review",
      toStatus: "rejected",
      changedBy: admin.id,
      note: parsed.data.reason,
    })

    if (advancePayment?.razorpay_payment_id) {
      const { data: refundRow, error: refundInsertErr } = await supabase
        .from("refunds")
        .insert({
          payment_id: advancePayment.id,
          project_id: id,
          amount: advancePayment.amount,
          reason: parsed.data.reason,
          status: "pending",
          initiated_by: admin.id,
        })
        .select()
        .single()

      if (!refundInsertErr && refundRow) {
        try {
          const razorpayRefund = await initiateRazorpayRefund({
            paymentId: advancePayment.razorpay_payment_id,
            amountInRupees: Number(advancePayment.amount),
            notes: { projectId: id, reason: parsed.data.reason },
          })
          await supabase
            .from("refunds")
            .update({ razorpay_refund_id: razorpayRefund.id, updated_at: new Date().toISOString() })
            .eq("id", refundRow.id)
        } catch (refundErr) {
          console.error("[project.reject] refund initiation failed", refundErr)
          await supabase
            .from("refunds")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", refundRow.id)
          // Project is still marked rejected; ops must retry the refund
          // manually from the admin refunds tab. We surface this in the
          // response so the admin UI can flag it immediately.
          await notifyClient({
            clientId: project.client_id,
            projectId: id,
            type: "status_change",
            title: "Your project was not accepted",
            body: `Reason: ${parsed.data.reason}. Your refund is being processed manually — our team will follow up.`,
          })
          await writeAuditLog({
            actorId: admin.id,
            actorRole: "admin",
            action: "project.reject",
            targetType: "project",
            targetId: id,
            metadata: { reason: parsed.data.reason, refundStatus: "failed" },
          })
          return NextResponse.json({ ok: true, refundStatus: "failed_needs_manual_action" })
        }
      }
    }

    await notifyClient({
      clientId: project.client_id,
      projectId: id,
      type: "status_change",
      title: "Your project was not accepted",
      body: `Reason: ${parsed.data.reason}. ${
        advancePayment ? "Your advance payment refund has been initiated." : ""
      }`,
    })
    await writeAuditLog({
      actorId: admin.id,
      actorRole: "admin",
      action: "project.reject",
      targetType: "project",
      targetId: id,
      metadata: { reason: parsed.data.reason, refundInitiated: Boolean(advancePayment) },
    })

    return NextResponse.json({ ok: true, refundStatus: advancePayment ? "pending" : "not_applicable" })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error("[project.reject]", err)
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
