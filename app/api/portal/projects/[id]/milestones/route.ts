import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalAdmin, requirePortalUser, PortalAuthError } from "@/lib/portal/auth"
import { getServiceSupabase, getServerSupabase } from "@/lib/portal/supabase"
import { notifyClient } from "@/lib/portal/notify"

const CreateSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  weightPercent: z.number().int().min(0).max(100),
  dueDate: z.string().optional(),
  orderIndex: z.number().int().default(0),
})

const UpdateSchema = z.object({
  milestoneId: z.string().uuid(),
  isCompleted: z.boolean(),
})

async function recomputeProgress(projectId: string) {
  const supabase = getServiceSupabase()
  const { data: milestones } = await supabase
    .from("milestones")
    .select("weight_percent, is_completed")
    .eq("project_id", projectId)
  const totalWeight = (milestones ?? []).reduce((s, m) => s + m.weight_percent, 0)
  const doneWeight = (milestones ?? [])
    .filter((m) => m.is_completed)
    .reduce((s, m) => s + m.weight_percent, 0)
  const percent = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0
  await supabase.from("projects").update({ progress_percent: percent, updated_at: new Date().toISOString() }).eq("id", projectId)
  return percent
}

// Admin creates a milestone for a project.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePortalAdmin()
    const { id: projectId } = await params
    const parsed = CreateSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })

    const supabase = getServiceSupabase()
    const { data: milestone, error } = await supabase
      .from("milestones")
      .insert({
        project_id: projectId,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        weight_percent: parsed.data.weightPercent,
        due_date: parsed.data.dueDate ?? null,
        order_index: parsed.data.orderIndex,
      })
      .select()
      .single()
    if (error || !milestone) return NextResponse.json({ error: "Could not create milestone." }, { status: 500 })

    await recomputeProgress(projectId)
    return NextResponse.json({ ok: true, milestone })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}

// Admin marks a milestone complete/incomplete (client approvals for
// milestones that require sign-off go through /approve instead).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePortalAdmin()
    const { id: projectId } = await params
    const parsed = UpdateSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })

    const supabase = getServiceSupabase()
    await supabase
      .from("milestones")
      .update({
        is_completed: parsed.data.isCompleted,
        completed_at: parsed.data.isCompleted ? new Date().toISOString() : null,
      })
      .eq("id", parsed.data.milestoneId)
      .eq("project_id", projectId)

    const percent = await recomputeProgress(projectId)

    const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single()
    if (project) {
      await notifyClient({
        clientId: project.client_id,
        projectId,
        type: "milestone",
        title: "Project progress updated",
        body: `Your project is now ${percent}% complete.`,
      })
    }

    return NextResponse.json({ ok: true, progressPercent: percent })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}

// Client (or admin) fetches milestones — read-only, RLS scoped.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requirePortalUser()
    const { id: projectId } = await params
    const supabase = await getServerSupabase()
    const { data: project } = await supabase.from("projects").select("client_id").eq("id", projectId).single()
    if (!project || (user.role !== "admin" && project.client_id !== user.id)) {
      return NextResponse.json({ error: "Not found." }, { status: 404 })
    }
    const { data: milestones, error } = await supabase
      .from("milestones")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index")
    if (error) return NextResponse.json({ error: "Could not load milestones." }, { status: 500 })
    return NextResponse.json({ milestones })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
