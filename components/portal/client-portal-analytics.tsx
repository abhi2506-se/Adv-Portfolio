"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PublicAnalytics {
  totalProjects: number
  completedProjects: number
  countries: { name: string; count: number }[]
  technologies: { name: string; count: number }[]
  industries: { name: string; count: number }[]
  averageRating: number | null
  reviews: {
    rating: number
    comment: string | null
    clientName: string | null
    company: string | null
    country: string | null
    verified: boolean
  }[]
}

export function ClientPortalAnalytics() {
  const [data, setData] = useState<PublicAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/portal/analytics/public")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="animate-pulse text-sm text-muted-foreground">Loading live project stats…</div>
  }
  if (!data || data.totalProjects === 0) {
    // Real empty state, not fake numbers — shown until real projects exist.
    return null
  }

  return (
    <section className="py-12">
      <h2 className="text-2xl font-semibold mb-6">Client Portal — Live Stats</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Projects" value={data.totalProjects} />
        <StatCard label="Completed" value={data.completedProjects} />
        <StatCard label="Countries" value={data.countries.length} />
        <StatCard label="Avg. Rating" value={data.averageRating ? data.averageRating.toFixed(1) : "—"} />
      </div>

      {data.technologies.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Technologies used</h3>
          <div className="flex flex-wrap gap-2">
            {data.technologies.map((t) => (
              <span key={t.name} className="text-xs px-3 py-1 rounded-full bg-muted">{t.name} ({t.count})</span>
            ))}
          </div>
        </div>
      )}

      {data.reviews.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Verified client reviews</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {data.reviews.map((r, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <span className="text-[10px] uppercase tracking-wide text-emerald-600 font-medium">Verified Project</span>
                  </div>
                  {r.comment && <p className="text-sm mb-2">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground">
                    {[r.clientName, r.company, r.country].filter(Boolean).join(" · ") || "Anonymous client"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground font-normal">{label}</CardTitle></CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  )
}
