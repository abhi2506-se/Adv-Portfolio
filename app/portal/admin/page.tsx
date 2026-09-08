import { redirect } from "next/navigation"
import Link from "next/link"
import { getPortalUser } from "@/lib/portal/auth"
import { getServiceSupabase } from "@/lib/portal/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { STATUS_LABELS, STATUS_COLOR } from "@/lib/portal/status-labels"
import { AdminProjectActions } from "@/components/portal/admin-project-actions"

export default async function AdminPage() {
  const user = await getPortalUser()
  if (!user) redirect("/portal/login")
  if (user.role !== "admin") redirect("/portal/dashboard")

  const supabase = getServiceSupabase()
  const { data: projects } = await supabase
    .from("projects")
    .select("*, clients(full_name, email, country, preferred_language)")
    .order("created_at", { ascending: false })

  const underReview = (projects ?? []).filter((p) => p.status === "under_review")
  const active = (projects ?? []).filter((p) =>
    ["accepted", "planning", "design", "development", "testing", "client_review", "final_payment_pending", "delivered"].includes(p.status)
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Link href="/portal/admin/analytics" className="text-sm underline">Analytics →</Link>
        <Link href="/portal/admin/security" className="text-sm underline ml-4">Security →</Link>
        <Link href="/portal/admin/proposals" className="text-sm underline ml-4">Proposals &amp; Cold Emails →</Link>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">New Requests ({underReview.length})</h2>
        {underReview.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {underReview.map((p) => (
              <Card key={p.id}>
                <CardContent className="py-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {p.clients?.full_name} · {p.clients?.email} · {p.country} · {p.clients?.preferred_language}
                    </p>
                    <p className="text-sm mt-1">
                      Budget: {p.budget_currency} {Number(p.budget_amount).toLocaleString()} · Advance paid: {p.budget_currency} {Number(p.advance_amount).toLocaleString()}
                    </p>
                    <Link href={`/portal/project/${p.id}`} className="text-xs underline">View full details</Link>
                  </div>
                  <AdminProjectActions projectId={p.id} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Active Projects ({active.length})</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {active.map((p) => (
            <Link key={p.id} href={`/portal/project/${p.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    <Badge className={STATUS_COLOR[p.status] ?? ""}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {p.clients?.full_name} · {p.progress_percent}% complete
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
