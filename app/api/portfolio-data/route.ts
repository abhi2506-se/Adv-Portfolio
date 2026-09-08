/**
 * /api/portfolio-data
 * Alias of /api/portfolio that normalises field names so the project detail
 * page (which expects `name`, `tags`, `repoUrl`, `liveUrl`) works correctly.
 */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { defaultPortfolioData } from '@/lib/portfolio-data'

const sql = neon(process.env.DATABASE_URL!)

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function normaliseProject(p: Record<string, unknown>) {
  // Support both old shape (title/tech) and new shape (name/tags)
  const name   = (p.name  || p.title  || '') as string
  const tags   = (p.tags  || p.tech   || []) as string[]
  const github = (p.github || p.repoUrl || '') as string
  const live   = (p.live  || p.liveUrl || '') as string

  return {
    ...p,
    // Canonical fields expected by project-detail-client
    name,
    tags,
    repoUrl:  github,
    liveUrl:  live,
    github,
    live,
    // Slug computed from name so URLs always resolve
    slug: ((p.slug as string) || slugify(name)),
    // longDescription fallback
    longDescription: (p.longDescription || p.description || '') as string,
    // Keep original title too
    title: name,
    tech: tags,
  }
}

function normaliseData(raw: Record<string, unknown>) {
  const projects = ((raw.projects || []) as Record<string, unknown>[]).map(normaliseProject)
  return { ...raw, projects }
}

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_data (
      key        TEXT PRIMARY KEY DEFAULT 'main',
      data       JSONB NOT NULL,
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )
  `
}

export async function GET() {
  try {
    await ensureTable()
    const rows = await sql`SELECT data, updated_at FROM portfolio_data WHERE key = 'main'`

    // If DB has data, use it; else fall back to defaultPortfolioData
    const raw = rows.length
      ? (rows[0].data as Record<string, unknown>)
      : (defaultPortfolioData as unknown as Record<string, unknown>)

    // Merge with defaults so newly added fields are always present
    const merged = {
      ...defaultPortfolioData,
      ...raw,
      hero:  { ...defaultPortfolioData.hero,  ...((raw.hero  || {}) as object) },
      about: { ...defaultPortfolioData.about, ...((raw.about || {}) as object) },
      // Always include default projects if DB has none
      projects: ((raw.projects as unknown[])?.length
        ? raw.projects
        : defaultPortfolioData.projects) as Record<string, unknown>[],
    }

    return NextResponse.json(normaliseData(merged as Record<string, unknown>), {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    })
  } catch (e) {
    console.error('[portfolio-data] GET error:', e)
    // Always return default data so pages never break
    const fallback = normaliseData(defaultPortfolioData as unknown as Record<string, unknown>)
    return NextResponse.json(fallback)
  }
}
