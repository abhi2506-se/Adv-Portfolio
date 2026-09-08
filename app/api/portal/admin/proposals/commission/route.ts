import { NextResponse } from "next/server"
import { requirePortalAdminOrCoAdmin, PortalAuthError } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"

/**
 * Commission summary.
 *  - co_admin: sees only their own totals (sent count, replied count,
 *    commission earned from each, and combined total).
 *  - admin: sees the same breakdown for every co-admin, plus a grand total
 *    across all of them and the total email volume sent.
 */
export async function GET() {
  try {
    const user = await requirePortalAdminOrCoAdmin()
    const supabase = getServiceSupabase()

    if (user.role === "co_admin") {
      const { data, error } = await supabase
        .from("proposal_emails")
        .select("status, commission_sent_amount, commission_reply_amount")
        .eq("sender_id", user.id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const sentCount = data?.length ?? 0
      const repliedCount = data?.filter((d) => d.status === "replied").length ?? 0
      const sentCommission = (data ?? []).reduce((s, d) => s + Number(d.commission_sent_amount || 0), 0)
      const replyCommission = (data ?? []).reduce((s, d) => s + Number(d.commission_reply_amount || 0), 0)

      return NextResponse.json({
        self: {
          sentCount, repliedCount,
          sentCommission, replyCommission,
          totalCommission: sentCommission + replyCommission,
        },
      })
    }

    // admin: per-co-admin breakdown + grand totals
    const { data: coAdmins, error: coAdminErr } = await supabase
      .from("clients")
      .select("id, full_name, email, commission_per_sent_email, commission_per_reply")
      .eq("role", "co_admin")

    if (coAdminErr) return NextResponse.json({ error: coAdminErr.message }, { status: 500 })

    const { data: proposals, error: propErr } = await supabase
      .from("proposal_emails")
      .select("sender_id, status, commission_sent_amount, commission_reply_amount")

    if (propErr) return NextResponse.json({ error: propErr.message }, { status: 500 })

    const breakdown = (coAdmins ?? []).map((ca) => {
      const own = (proposals ?? []).filter((p) => p.sender_id === ca.id)
      const sentCount = own.length
      const repliedCount = own.filter((p) => p.status === "replied").length
      const sentCommission = own.reduce((s, p) => s + Number(p.commission_sent_amount || 0), 0)
      const replyCommission = own.reduce((s, p) => s + Number(p.commission_reply_amount || 0), 0)
      return {
        id: ca.id, fullName: ca.full_name, email: ca.email,
        commissionPerSentEmail: ca.commission_per_sent_email,
        commissionPerReply: ca.commission_per_reply,
        sentCount, repliedCount, sentCommission, replyCommission,
        totalCommission: sentCommission + replyCommission,
      }
    })

    const totalEmails = proposals?.length ?? 0
    const totalReplied = proposals?.filter((p) => p.status === "replied").length ?? 0
    const grandTotalCommission = breakdown.reduce((s, b) => s + b.totalCommission, 0)

    return NextResponse.json({ breakdown, totals: { totalEmails, totalReplied, grandTotalCommission } })
  } catch (e) {
    if (e instanceof PortalAuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
