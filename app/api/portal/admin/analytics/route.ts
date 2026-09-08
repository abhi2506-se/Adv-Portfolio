import { NextResponse } from "next/server"
import { requirePortalAdmin, PortalAuthError } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"

export async function GET() {
  try {
    await requirePortalAdmin()
    const supabase = getServiceSupabase()

    const [projectsRes, paymentsRes, refundsRes] = await Promise.all([
      supabase.from("projects").select("id, status, created_at, budget_amount, advance_amount, country, preferred_language, title, client_id, clients(full_name, email)"),
      supabase.from("payments").select("id, amount, status, type, created_at"),
      supabase.from("refunds").select("id, amount, status, created_at"),
    ])

    const projects = projectsRes.data ?? []
    const payments = paymentsRes.data ?? []
    const refunds = refundsRes.data ?? []

    const statusBreakdown = new Map<string, number>()
    for (const p of projects) statusBreakdown.set(p.status, (statusBreakdown.get(p.status) ?? 0) + 1)

    const capturedRevenue = payments.filter((p) => p.status === "captured").reduce((s, p) => s + Number(p.amount), 0)
    const refundedAmount = refunds.filter((r) => r.status === "processed").reduce((s, r) => s + Number(r.amount), 0)
    const pendingRefunds = refunds.filter((r) => r.status === "pending").length

    return NextResponse.json({
      totalProjects: projects.length,
      statusBreakdown: Array.from(statusBreakdown.entries()).map(([status, count]) => ({ status, count })),
      capturedRevenue,
      refundedAmount,
      pendingRefunds,
      recentProjects: projects
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20),
    })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error("[admin.analytics]", err)
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
