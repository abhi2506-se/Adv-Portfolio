import { redirect } from "next/navigation"
import { getPortalUser } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { STATUS_LABELS } from "@/lib/portal/status-labels"

export default async function AdminAnalyticsPage() {
  const user = await getPortalUser()
  if (!user) redirect("/portal/login")
  if (user.role !== "admin") redirect("/portal/dashboard")

  const supabase = getServiceSupabase()
  const [{ data: projects }, { data: payments }, { data: refunds }] = await Promise.all([
    supabase.from("projects").select("status"),
    supabase.from("payments").select("amount, status"),
    supabase.from("refunds").select("amount, status"),
  ])

  const statusCounts = new Map<string, number>()
  for (const p of projects ?? []) statusCounts.set(p.status, (statusCounts.get(p.status) ?? 0) + 1)

  const captured = (payments ?? []).filter((p) => p.status === "captured").reduce((s, p) => s + Number(p.amount), 0)
  const refunded = (refunds ?? []).filter((r) => r.status === "processed").reduce((s, r) => s + Number(r.amount), 0)
  const pendingRefunds = (refunds ?? []).filter((r) => r.status === "pending").length

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Captured revenue</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">₹{captured.toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Refunded</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">₹{refunded.toLocaleString()}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Pending refunds</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{pendingRefunds}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Projects by status</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {Array.from(statusCounts.entries()).map(([status, count]) => (
            <div key={status} className="flex justify-between text-sm border-b last:border-0 pb-1">
              <span>{STATUS_LABELS[status] ?? status}</span><span>{count}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
