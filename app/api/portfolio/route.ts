import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { defaultPortfolioData } from '@/lib/portfolio-data'

const sql = neon(process.env.DATABASE_URL!)

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_data (
      key   TEXT PRIMARY KEY DEFAULT 'main',
      data  JSONB NOT NULL,
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )
  `
}

// Merge hero from DB with defaultPortfolioData.hero defaults so any fields
// added after the DB row was first written (e.g. facebook, leetcode) are
// always present in the response — never silently missing.
function normaliseHero(data: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== 'object') return data
  const hero = (data.hero || {}) as Record<string, unknown>
  return {
    ...data,
    hero: { ...defaultPortfolioData.hero, ...hero },
  }
}

export async function GET() {
  try {
    await ensureTable()
    const rows = await sql`SELECT data, updated_at FROM portfolio_data WHERE key = 'main'`
    if (!rows.length) return NextResponse.json(null)
    const normalised = normaliseHero(rows[0].data as Record<string, unknown>)
    return NextResponse.json({ ...normalised, _updatedAt: rows[0].updated_at })
  } catch (e) {
    console.error('GET /api/portfolio error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable()
    const raw = await req.json()
    const data = normaliseHero(raw)
    const now = Date.now()
    await sql`
      INSERT INTO portfolio_data (key, data, updated_at)
      VALUES ('main', ${JSON.stringify(data)}, ${now})
      ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
    `
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/portfolio error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
