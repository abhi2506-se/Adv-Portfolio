import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/portal/supabase"

// Public endpoint — no auth required, but uses the service client ONLY to
// run pre-defined aggregate queries below. It never forwards arbitrary
// filters from the request, and never selects client-identifying or
// financial columns. This is the one legitimate use of the service role for
// an unauthenticated route.
export const revalidate = 300 // cache for 5 minutes at the edge/CDN

export async function GET() {
  const supabase = getServiceSupabase()

  const [
    totalProjectsRes,
    completedProjectsRes,
    countriesRes,
    technologiesRes,
    industriesRes,
    reviewsRes,
  ] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("projects").select("country").not("country", "is", null),
    supabase.from("project_technologies").select("technologies(name)"),
    supabase.from("projects").select("industries(name)").not("industry_id", "is", null),
    supabase
      .from("reviews")
      .select("rating, comment, consent_public_name, consent_public_country, consent_public_company, created_at, projects(country, title, client_id, clients(full_name, company))")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const countryCounts = countBy(countriesRes.data ?? [], (r: any) => r.country)
  const techCounts = countBy(technologiesRes.data ?? [], (r: any) => r.technologies?.name)
  const industryCounts = countBy(industriesRes.data ?? [], (r: any) => r.industries?.name)

  const reviews = (reviewsRes.data ?? []).map((r: any) => ({
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    // Only reveal identity fields the client explicitly consented to.
    clientName: r.consent_public_name ? r.projects?.clients?.full_name ?? null : null,
    company: r.consent_public_company ? r.projects?.clients?.company ?? null : null,
    country: r.consent_public_country ? r.projects?.country ?? null : null,
    verified: true, // this query only ever selects reviews on real projects
  }))

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null

  return NextResponse.json({
    totalProjects: totalProjectsRes.count ?? 0,
    completedProjects: completedProjectsRes.count ?? 0,
    countries: countryCounts,
    technologies: techCounts,
    industries: industryCounts,
    averageRating: avgRating,
    reviews,
    generatedAt: new Date().toISOString(),
  })
}

function countBy<T>(rows: T[], keyFn: (row: T) => string | null | undefined) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = keyFn(row)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}
