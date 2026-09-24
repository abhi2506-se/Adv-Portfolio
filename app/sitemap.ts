// ─── /sitemap.xml ─────────────────────────────────────────────────────────────
import { MetadataRoute } from 'next'
import { defaultPortfolioData } from '@/lib/portfolio-data'

const BASE = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // ── Collect project slugs (DB + hardcoded fallback) ─────────────────────
  let projectSlugs: string[] = defaultPortfolioData.projects.map(p =>
    slugify((p as any).slug || p.title || '')
  )
  try {
    const res = await fetch(`${BASE}/api/portfolio-data`, { next: { revalidate: 3600 } })
    if (res.ok) {
      const data = await res.json()
      const fromApi: string[] = (data.projects || []).map((p: any) =>
        (p.slug as string) || slugify((p.name || p.title || '') as string)
      )
      // Merge + dedupe, prefer API slugs
      const all  = [...fromApi, ...projectSlugs]
      const seen = new Set<string>()
      projectSlugs = all.filter(s => { if (!s || seen.has(s)) return false; seen.add(s); return true })
    }
  } catch { /* use defaults */ }

  const projectRoutes: MetadataRoute.Sitemap = projectSlugs.map(slug => ({
    url:             `${BASE}/projects/${slug}`,
    lastModified:    now,
    changeFrequency: 'monthly' as const,
    priority:        0.85,
  }))

  return [
    // ── Root ───────────────────────────────────────────────────────────────
    { url: BASE,                        lastModified: now, changeFrequency: 'weekly',  priority: 1.0  },

    // ── Homepage section anchors ────────────────────────────────────────────
    { url: `${BASE}/#about`,            lastModified: now, changeFrequency: 'monthly', priority: 0.75 },
    { url: `${BASE}/#skills`,           lastModified: now, changeFrequency: 'monthly', priority: 0.70 },
    { url: `${BASE}/#experience`,       lastModified: now, changeFrequency: 'monthly', priority: 0.78 },
    { url: `${BASE}/#projects`,         lastModified: now, changeFrequency: 'weekly',  priority: 0.88 },
    { url: `${BASE}/#devops`,           lastModified: now, changeFrequency: 'monthly', priority: 0.80 },
    { url: `${BASE}/#github`,           lastModified: now, changeFrequency: 'daily',   priority: 0.72 },
    { url: `${BASE}/#certifications`,   lastModified: now, changeFrequency: 'monthly', priority: 0.68 },
    { url: `${BASE}/#blog`,             lastModified: now, changeFrequency: 'weekly',  priority: 0.65 },
    { url: `${BASE}/#testimonials`,     lastModified: now, changeFrequency: 'monthly', priority: 0.62 },
    { url: `${BASE}/#contact`,          lastModified: now, changeFrequency: 'monthly', priority: 0.75 },

    // ── Public pages ────────────────────────────────────────────────────────
    { url: `${BASE}/journey`,           lastModified: now, changeFrequency: 'weekly',  priority: 0.80 },
    { url: `${BASE}/dashboard`,         lastModified: now, changeFrequency: 'daily',   priority: 0.65 },
    { url: `${BASE}/sitemap`,           lastModified: now, changeFrequency: 'monthly', priority: 0.40 },

    // ── Dynamic project pages ───────────────────────────────────────────────
    ...projectRoutes,

    // ── Legal ───────────────────────────────────────────────────────────────
    { url: `${BASE}/privacy-policy`,    lastModified: now, changeFrequency: 'yearly',  priority: 0.30 },
    { url: `${BASE}/terms-of-service`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.30 },
  ]
}
