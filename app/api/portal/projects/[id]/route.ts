import { NextRequest, NextResponse } from "next/server"
import { requirePortalUser, PortalAuthError } from "@/lib/portal/auth"
import { getServerSupabase } from "@/lib/portal/supabase"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser()
    const { id } = await params
    const supabase = await getServerSupabase()

    const { data: project, error } = await supabase.from("projects").select("*").eq("id", id).single()

    // RLS returns "no rows" (not a 403) for a project you don't own — from
    // the caller's perspective this correctly looks identical to "doesn't
    // exist", which is exactly the behavior you want for IDOR protection
    // (never confirm the existence of someone else's private record).
    if (error || !project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }
    if (user.role !== "admin" && project.client_id !== user.id) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }

    const [{ data: milestones }, { data: statusHistory }, { data: documents }, { data: payments }, { data: technologies }] =
      await Promise.all([
        supabase.from("milestones").select("*").eq("project_id", id).order("order_index"),
        supabase.from("status_history").select("*").eq("project_id", id).order("created_at"),
        supabase.from("documents").select("*").eq("project_id", id).order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id, type, amount, currency, status, method, created_at")
          .eq("project_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("project_technologies")
          .select("technologies(name)")
          .eq("project_id", id),
      ])

    return NextResponse.json({
      project,
      milestones: milestones ?? [],
      statusHistory: statusHistory ?? [],
      documents: documents ?? [],
      payments: payments ?? [],
      technologies: (technologies ?? []).map((t: any) => t.technologies?.name).filter(Boolean),
    })
  } catch (err) {
    if (err instanceof PortalAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
