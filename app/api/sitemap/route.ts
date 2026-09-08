/**
 * /api/sitemap
 * Returns a JSON sitemap of all public pages including dynamic project slugs.
 * Used by the /sitemap visual page to show live project URLs.
 */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { defaultPortfolioData } from '@/lib/portfolio-data'

export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || ''

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function GET() {
  let projectSlugs: { title: string; slug: string }[] = defaultPortfolioData.projects.map(p => ({
    title: p.title,
    slug:  slugify(p.title),
  }))

  // Try to pull live project list from DB
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const rows = await sql`SELECT data FROM portfolio_data WHERE key = 'main'`
    if (rows.length) {
      const projects = (rows[0].data as any)?.projects || []
      if (projects.length) {
        projectSlugs = projects.map((p: any) => ({
          title: p.name || p.title || '',
          slug:  p.slug || slugify(p.name || p.title || ''),
        }))
      }
    }
  } catch { /* use defaults */ }

  const pages = [
    { url: BASE,                      label: 'Homepage',            priority: 1.0  },
    { url: `${BASE}/#about`,          label: 'About',               priority: 0.75 },
    { url: `${BASE}/#skills`,         label: 'Skills',              priority: 0.70 },
    { url: `${BASE}/#experience`,     label: 'Experience',          priority: 0.78 },
    { url: `${BASE}/#projects`,       label: 'Projects',            priority: 0.88 },
    { url: `${BASE}/#devops`,         label: 'DevOps & Cloud',      priority: 0.80 },
    { url: `${BASE}/#github`,         label: 'GitHub Stats',        priority: 0.72 },
    { url: `${BASE}/#certifications`, label: 'Certifications',      priority: 0.68 },
    { url: `${BASE}/#blog`,           label: 'Blog',                priority: 0.65 },
    { url: `${BASE}/#testimonials`,   label: 'Testimonials',        priority: 0.62 },
    { url: `${BASE}/#contact`,        label: 'Contact',             priority: 0.75 },
    { url: `${BASE}/journey`,         label: 'Journey',             priority: 0.80 },
    { url: `${BASE}/dashboard`,       label: 'Analytics Dashboard', priority: 0.65 },
    { url: `${BASE}/sitemap`,         label: 'Sitemap',             priority: 0.40 },
    { url: `${BASE}/privacy-policy`,  label: 'Privacy Policy',      priority: 0.30 },
    { url: `${BASE}/terms-of-service`,label: 'Terms of Service',    priority: 0.30 },
    ...projectSlugs.map(p => ({
      url:      `${BASE}/projects/${p.slug}`,
      label:    `Project: ${p.title}`,
      priority: 0.85,
    })),
  ]

  return NextResponse.json({ pages, projectSlugs, total: pages.length }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
