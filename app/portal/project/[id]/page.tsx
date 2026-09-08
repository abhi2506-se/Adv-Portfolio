import { redirect, notFound } from "next/navigation"
import { getPortalUser } from "@/lib/portal/auth"
import { getServerSupabase } from "@/lib/portal/supabase"
import { STATUS_LABELS, STATUS_COLOR, NEXT_ACTION } from "@/lib/portal/status-labels"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectChat } from "@/components/portal/project-chat"
import { ProjectPaymentPanel } from "@/components/portal/project-payment-panel"
import { ProjectDocuments } from "@/components/portal/project-documents"
import { ProjectReviewForm } from "@/components/portal/project-review-form"
import { ProjectApprovalActions } from "@/components/portal/project-approval-actions"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getPortalUser()
  if (!user) redirect("/portal/login")

  const supabase = await getServerSupabase()
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single()
  if (!project || (user.role !== "admin" && project.client_id !== user.id)) notFound()

  const [{ data: milestones }, { data: statusHistory }, { data: review }] = await Promise.all([
    supabase.from("milestones").select("*").eq("project_id", id).order("order_index"),
    supabase.from("status_history").select("*").eq("project_id", id).order("created_at"),
    supabase.from("reviews").select("*").eq("project_id", id).maybeSingle(),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{project.title}</h1>
            <p className="text-muted-foreground mt-1">{project.description}</p>
          </div>
          <Badge className={STATUS_COLOR[project.status] ?? ""}>{STATUS_LABELS[project.status] ?? project.status}</Badge>
        </div>
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Overall progress</span><span>{project.progress_percent}%</span>
          </div>
          <Progress value={project.progress_percent} />
        </div>
        {NEXT_ACTION[project.status] && (
          <Card className="mt-4 border-primary/30 bg-primary/5">
            <CardContent className="py-3 text-sm">
              <strong>What's next:</strong> {NEXT_ACTION[project.status]}
            </CardContent>
          </Card>
        )}
      </div>

      {(project.status === "pending_payment" || project.status === "final_payment_pending") && (
        <ProjectPaymentPanel
          projectId={project.id}
          type={project.status === "pending_payment" ? "advance" : "final"}
          amount={project.status === "pending_payment" ? project.advance_amount : project.final_amount}
          currency={project.budget_currency}
          clientName={user.full_name}
          clientEmail={user.email}
        />
      )}

      {project.status === "client_review" && user.role === "client" && (
        <ProjectApprovalActions projectId={project.id} />
      )}

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline & Milestones</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {project.status === "completed" && <TabsTrigger value="review">Review</TabsTrigger>}
        </TabsList>

        <TabsContent value="timeline" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Milestones</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(!milestones || milestones.length === 0) && (
                <p className="text-sm text-muted-foreground">Milestones will appear here once planning begins.</p>
              )}
              {milestones?.map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b last:border-0 pb-2">
                  <div>
                    <p className={`text-sm font-medium ${m.is_completed ? "line-through text-muted-foreground" : ""}`}>{m.title}</p>
                    {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  </div>
                  <Badge variant={m.is_completed ? "default" : "outline"}>{m.weight_percent}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Activity</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {statusHistory?.map((h) => (
                <div key={h.id} className="text-sm flex justify-between">
                  <span>
                    {h.from_status ? `${STATUS_LABELS[h.from_status] ?? h.from_status} → ` : ""}
                    {STATUS_LABELS[h.to_status] ?? h.to_status}
                    {h.note ? ` — ${h.note}` : ""}
                  </span>
                  <span className="text-muted-foreground text-xs">{new Date(h.created_at).toLocaleString()}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <ProjectChat
            projectId={project.id}
            currentUserId={user.id}
            currentUserRole={user.role === "co_admin" ? "admin" : user.role}
            myLanguage={user.role === "admin" ? "en" : user.preferred_language}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <ProjectDocuments projectId={project.id} />
        </TabsContent>

        {project.status === "completed" && (
          <TabsContent value="review" className="mt-4">
            {review ? (
              <Card><CardContent className="py-4 text-sm">
                You rated this project {review.rating}/5. {review.is_published ? "Published publicly." : "Pending moderation."}
              </CardContent></Card>
            ) : (
              <ProjectReviewForm projectId={project.id} />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
