import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAdminOrCoAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"

const ReplySchema = z.object({
  replySnippet: z.string().max(2000).optional(),
})

/**
 * Marks a sent proposal as replied. This is a manual action for now — the
 * admin/co-admin clicks "Mark as replied" once they see the reply land in
 * sales@theabhisheksingh.in. To automate this later, wire an inbound-email
 * webhook (e.g. a Gmail Pub/Sub push, or a provider like Postmark/SendGrid
 * inbound parse) to POST here with the matching proposal id looked up by
 * thread/message-id instead of a manual click.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requirePortalAdminOrCoAdmin()
    const json = await req.json().catch(() => ({}))
    const parsed = ReplySchema.safeParse(json)
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

    const supabase = getServiceSupabase()
    const { data: proposal, error: findErr } = await supabase
      .from("proposal_emails")
      .select("*")
      .eq("id", params.id)
      .single()

    if (findErr || !proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 })
    if (user.role === "co_admin" && proposal.sender_id !== user.id) {
      return NextResponse.json({ error: "You can only update your own proposals." }, { status: 403 })
    }
    if (proposal.status === "replied") {
      return NextResponse.json({ ok: true, proposal }) // idempotent
    }

    const { data: senderRow } = await supabase
      .from("clients")
      .select("role, commission_per_reply")
      .eq("id", proposal.sender_id)
      .single()

    const commissionReply = senderRow?.role === "co_admin"
      ? Number(senderRow?.commission_per_reply ?? 0)
      : 0

    const { data: updated, error: updateErr } = await supabase
      .from("proposal_emails")
      .update({
        status: "replied",
        replied_at: new Date().toISOString(),
        reply_snippet: parsed.data.replySnippet ?? null,
        commission_reply_amount: commissionReply,
      })
      .eq("id", params.id)
      .select()
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "proposal.mark_replied",
      targetType: "proposal_email",
      targetId: params.id,
    })

    return NextResponse.json({ ok: true, proposal: updated })
  } catch (e) {
    if (e instanceof PortalAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
