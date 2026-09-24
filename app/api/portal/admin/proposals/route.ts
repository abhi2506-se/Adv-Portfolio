import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAdminOrCoAdmin, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { sendProposalEmail } from "@/lib/portal/proposal-mailer"

const SendSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().max(200).optional(),
  subject: z.string().min(1).max(300),
  bodyHtml: z.string().min(1),
})

// GET: list proposals. Admin sees everyone's; co_admin sees only their own.
export async function GET(req: NextRequest) {
  try {
    const user = await requirePortalAdminOrCoAdmin()
    const supabase = getServiceSupabase()

    let query = supabase
      .from("proposal_emails")
      .select("*, clients:sender_id(full_name, email, role)")
      .order("sent_at", { ascending: false })

    if (user.role === "co_admin") {
      query = query.eq("sender_id", user.id)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ proposals: data ?? [] })
  } catch (e) {
    if (e instanceof PortalAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

// POST: send a new cold email / proposal.
export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalAdminOrCoAdmin()
    const json = await req.json().catch(() => null)
    const parsed = SendSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }
    const { recipientEmail, recipientName, subject, bodyHtml } = parsed.data

    const supabase = getServiceSupabase()

    // Snapshot the sender's current per-sent-email commission rate (admins
    // are always 0 — commissions only apply to co-admins).
    const { data: senderRow } = await supabase
      .from("clients")
      .select("commission_per_sent_email, is_active")
      .eq("id", user.id)
      .single()

    if (user.role === "co_admin" && senderRow?.is_active === false) {
      return NextResponse.json({ error: "Your co-admin account is inactive." }, { status: 403 })
    }

    let status: "sent" | "failed" = "sent"
    let errorMessage: string | null = null
    try {
      await sendProposalEmail({ to: recipientEmail, subject, html: bodyHtml })
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
        recipient_email: recipientEmail,
        recipient_name: recipientName ?? null,
        subject,
        body_html: bodyHtml,
        status,
        commission_sent_amount: commissionSent,
      })
      .select()
      .single()

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    await writeAuditLog({
      actorId: user.id,
      actorRole: user.role,
      action: "proposal.send",
      targetType: "proposal_email",
      targetId: inserted.id,
      metadata: { recipientEmail, subject, status },
    })

    if (status === "failed") {
      return NextResponse.json({ error: errorMessage, proposal: inserted }, { status: 502 })
    }
    return NextResponse.json({ ok: true, proposal: inserted })
  } catch (e) {
    if (e instanceof PortalAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
