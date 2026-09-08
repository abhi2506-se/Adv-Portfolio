import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `
}

export async function GET() {
  try {
    await ensureTable()
    const rows = await sql`SELECT value FROM site_settings WHERE key = 'favicon_url'`
    if (!rows.length || !rows[0].value) {
      // Redirect to default icon
      return NextResponse.redirect(new URL('/icon-dark-32x32.png', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'))
    }
    const iconUrl = rows[0].value
    // Fetch the blob and stream it
    const blob = await fetch(iconUrl)
    const buffer = await blob.arrayBuffer()
    const contentType = blob.headers.get('content-type') || 'image/png'
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    })
  } catch (e) {
    console.error('GET /api/favicon error:', e)
    return NextResponse.redirect(new URL('/icon-dark-32x32.png', 'http://localhost:3000'))
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable()
    const { url } = await req.json()
    await sql`
      INSERT INTO site_settings (key, value) VALUES ('favicon_url', ${url})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('POST /api/favicon error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
