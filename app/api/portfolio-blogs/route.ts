import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS portfolio_blogs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      tags TEXT[] NOT NULL DEFAULT '{}',
      read_time TEXT NOT NULL DEFAULT '5 min read',
      date_label TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'from-blue-600 to-cyan-500',
      icon TEXT NOT NULL DEFAULT '📝',
      trending BOOLEAN NOT NULL DEFAULT false,
      published BOOLEAN NOT NULL DEFAULT true,
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )
  `
  // Non-destructive migrations for existing tables
  try { await sql`ALTER TABLE portfolio_blogs ADD COLUMN IF NOT EXISTS created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000` } catch {}
  try { await sql`ALTER TABLE portfolio_blogs ADD COLUMN IF NOT EXISTS updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000` } catch {}
}

/** Format timestamp to "June 8, 2026 • 5:45 PM" */
function formatBlogDate(ms: number | null | undefined): string {
  if (!ms) return ''
  try {
    return new Date(Number(ms)).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    })
  } catch { return '' }
}

// GET: all published blogs
export async function GET(req: Request) {
  try {
    await ensureTable()
    const { searchParams } = new URL(req.url)
    const admin = searchParams.get('admin') === '1'

    const rows = admin
      ? await sql`SELECT * FROM portfolio_blogs ORDER BY created_at DESC`
      : await sql`SELECT * FROM portfolio_blogs WHERE published = true ORDER BY created_at DESC`

    // Enrich with formatted dates
    const blogs = rows.map((b: any) => ({
      ...b,
      formatted_created: formatBlogDate(b.created_at),
      formatted_updated: formatBlogDate(b.updated_at),
      display_date: formatBlogDate(b.updated_at || b.created_at),
    }))

    return NextResponse.json({ blogs })
  } catch (e) {
    console.error('[portfolio-blogs] GET error:', e)
    return NextResponse.json({ blogs: [] })
  }
}

// POST: create or update blog
export async function POST(req: Request) {
  try {
    await ensureTable()
    const body = await req.json()
    const { id, title, summary, tags, read_time, date_label, url, color, icon, trending, published } = body
    const now = Date.now()
    const blogId = id || `blog_${now}_${Math.random().toString(36).slice(2, 8)}`

    await sql`
      INSERT INTO portfolio_blogs (id, title, summary, tags, read_time, date_label, url, color, icon, trending, published, created_at, updated_at)
      VALUES (${blogId}, ${title}, ${summary || ''}, ${tags || []}, ${read_time || '5 min read'}, ${date_label || ''}, ${url || ''}, ${color || 'from-blue-600 to-cyan-500'}, ${icon || '📝'}, ${trending ?? false}, ${published ?? true}, ${now}, ${now})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        tags = EXCLUDED.tags,
        read_time = EXCLUDED.read_time,
        date_label = EXCLUDED.date_label,
        url = EXCLUDED.url,
        color = EXCLUDED.color,
        icon = EXCLUDED.icon,
        trending = EXCLUDED.trending,
        published = EXCLUDED.published,
        updated_at = ${now}
    `
    return NextResponse.json({
      ok: true, id: blogId,
      formatted_created: formatBlogDate(now),
      formatted_updated: formatBlogDate(now),
    })
  } catch (e) {
    console.error('[portfolio-blogs] POST error:', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// DELETE: remove blog post
export async function DELETE(req: Request) {
  try {
    await ensureTable()
    const { id } = await req.json()
    await sql`DELETE FROM portfolio_blogs WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[portfolio-blogs] DELETE error:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
