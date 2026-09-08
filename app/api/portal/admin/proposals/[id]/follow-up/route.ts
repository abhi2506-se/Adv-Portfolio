import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAdminOrCoAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { sendProposalEmail } from "@/lib/portal/proposal-mailer"

const FollowUpSchema = z.object({
  subject: z.string().min(1).max(300),
  bodyHtml: z.string().min(1),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requirePortalAdminOrCoAdmin()
    const json = await req.json().catch(() => null)
    const parsed = FollowUpSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const supabase = getServiceSupabase()
    const { data: original, error: findErr } = await supabase
      .from("proposal_emails")
      .select("*")
      .eq("id", params.id)
      .single()

    if (findErr || !original) return NextResponse.json({ error: "Original proposal not found" }, { status: 404 })
    if (user.role === "co_admin" && original.sender_id !== user.id) {
      return NextResponse.json({ error: "You can only follow up on your own proposals." }, { status: 403 })
    }

    const { data: senderRow } = await supabase
      .from("clients")
      .select("commission_per_sent_email")
      .eq("id", user.id)
      .single()

    let status: "sent" | "failed" = "sent"
    let errorMessage: string | null = null
    try {
      await sendProposalEmail({ to: original.recipient_email, subject: parsed.data.subject, html: parsed.data.bodyHtml })
    } catch (mailErr: any) {
      status = "failed"
      errorMessage = mailErr?.message ?? "Send failed"
    }

    const commissionSent = status === "sent" && user.role === "co_admin"
      ? Number(senderRow?.commission_per_sent_email ?? 0)
      : 0

    const { data: inserted, error: insertErr } = await supabase
      .from("proposal_emails")
      .insert({
        sender_id: user.id,
        sender_role: user.role,
        recipient_email: original.recipient_email,
        recipient_name: original.recipient_name,
        subject: parsed.data.subject,
        body_html: parsed.data.bodyHtml,
        thread_key: original.thread_key,
        is_follow_up: true,
        parent_email_id: original.id,
        status,
        commission_sent_amount: commissionSent,
      })
      .select()
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "proposal.follow_up",
      targetType: "proposal_email",
      targetId: inserted.id,
      metadata: { parentId: original.id, status },
    })

    if (status === "failed") return NextResponse.json({ error: errorMessage, proposal: inserted }, { status: 502 })
    return NextResponse.json({ ok: true, proposal: inserted })
  } catch (e) {
    if (e instanceof PortalAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
