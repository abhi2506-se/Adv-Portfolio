import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requirePortalUser, PortalAuthError, writeAuditLog } from "@/lib/portal/auth"
import { getServerSupabase } from "@/lib/portal/supabase"

const CreateProjectSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  budgetAmount: z.number().positive(),
  budgetCurrency: z.string().length(3).default("INR"),
  domain: z.string().max(100).optional(),
  industryId: z.number().int().optional(),
  country: z.string().length(2),
  preferredLanguage: z.string().min(2).max(10),
  advanceAmount: z.number().positive(),
  technologyIds: z.array(z.number().int()).max(20).default([]),
  requirements: z.record(z.string()).default({}), // e.g. { pages: "5", timeline: "6 weeks" }
  acceptedTermsVersion: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requirePortalUser()
    const json = await req.json().catch(() => null)
    const parsed = CreateProjectSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }
    const d = parsed.data

    if (d.advanceAmount > d.budgetAmount) {
      return NextResponse.json({ error: "Advance cannot exceed total budget." }, { status: 400 })
    }

    const supabase = await getServerSupabase() // RLS-scoped: client_id will be forced to auth.uid()

    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        client_id: user.id,
        title: d.title,
        description: d.description,
        budget_amount: d.budgetAmount,
        budget_currency: d.budgetCurrency,
        domain: d.domain ?? null,
        industry_id: d.industryId ?? null,
        country: d.country,
        preferred_language: d.preferredLanguage,
        advance_amount: d.advanceAmount,
        status: "pending_payment",
        accepted_terms_at: new Date().toISOString(),
        terms_version: d.acceptedTermsVersion,
      })
      .select()
      .single()

    if (error || !project) {
      return NextResponse.json({ error: "Could not create project." }, { status: 500 })
    }

    if (d.technologyIds.length > 0) {
      await supabase.from("project_technologies").insert(
        d.technologyIds.map((technology_id) => ({ project_id: project.id, technology_id }))
      )
    }

    const reqRows = Object.entries(d.requirements).map(([key, value]) => ({
      project_id: project.id,
      key,
      value,
    }))
    if (reqRows.length > 0) {
      await supabase.from("requirements").insert(reqRows)
    }

    await supabase.from("status_history").insert({
      project_id: project.id,
      from_status: null,
      to_status: "pending_payment",
      changed_by: user.id,
      note: "Project created by client, awaiting advance payment.",
    })

    await writeAuditLog({
      actorId: user.id,
      actorRole: "client",
      action: "project.create",
      targetType: "project",
      targetId: project.id,
    })

    return NextResponse.json({ ok: true, project })
  } catch (err) {
    if (err instanceof PortalAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error("[projects.POST]", err)
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requirePortalUser()
    const supabase = await getServerSupabase()

    // RLS already restricts non-admins to their own rows, but we filter
    // explicitly too so the query plan doesn't rely solely on policy.
    let query = supabase.from("projects").select("*").order("created_at", { ascending: false })
    if (user.role !== "admin") {
      query = query.eq("client_id", user.id)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: "Could not load projects." }, { status: 500 })

    return NextResponse.json({ projects: data })
  } catch (err) {
    if (err instanceof PortalAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 })
  }
}
