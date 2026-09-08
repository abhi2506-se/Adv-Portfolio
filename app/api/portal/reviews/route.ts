import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalUser, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServerSupabase } from "@/lib/portal/supabase"

const Schema = z.object({
  projectId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  consentPublicName: z.boolean().default(false),
  consentPublicCountry: z.boolean().default(false),
  consentPublicCompany: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser()
    const parsed = Schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 })
    const d = parsed.data

    const supabase = await getServerSupabase()

    // RLS also enforces status = 'completed' + ownership, but we check here
    // too so we can return a clear error message instead of a bare RLS denial.
    const { data: project } = await supabase
      .from("projects")
      .select("id, client_id, status")
      .eq("id", d.projectId)
      .single()

    if (!project || project.client_id !== user.id) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 })
    }
    if (project.status !== "completed") {
      return NextResponse.json({ error: "You can only review a completed project." }, { status: 409 })
    }

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        project_id: d.projectId,
        client_id: user.id,
        rating: d.rating,
        comment: d.comment ?? null,
        consent_public_name: d.consentPublicName,
        consent_public_country: d.consentPublicCountry,
        consent_public_company: d.consentPublicCompany,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "You've already reviewed this project." }, { status: 409 })
      }
      return NextResponse.json({ error: "Could not submit review." }, { status: 500 })
    }

    await writeAuditLog({
      actorId: user.id,
      actorRole: "client",
      action: "review.submit",
      targetType: "project",
      targetId: d.projectId,
    })

    return NextResponse.json({ ok: true, review, message: "Thanks! Your review is pending moderation before it appears publicly." })
  } catch (err) {
    if (err instanceof PortalAuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
