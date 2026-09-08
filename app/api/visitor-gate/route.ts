import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
let migrated = false

async function ensureTable() {
  if (!migrated) {
    await sql`CREATE TABLE IF NOT EXISTS visitor_gate_log (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      region TEXT NOT NULL DEFAULT '',
      device TEXT NOT NULL DEFAULT '',
      browser TEXT NOT NULL DEFAULT '',
      fingerprint TEXT NOT NULL DEFAULT '',
      photo_data TEXT NOT NULL DEFAULT '',
      exact_lat DOUBLE PRECISION,
      exact_lng DOUBLE PRECISION,
      location_accuracy DOUBLE PRECISION,
      archived BOOLEAN NOT NULL DEFAULT FALSE,
      visited_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )`
    // Add new columns to existing tables (migration)
    try { await sql`ALTER TABLE visitor_gate_log ADD COLUMN IF NOT EXISTS photo_data TEXT NOT NULL DEFAULT ''` } catch {}
    try { await sql`ALTER TABLE visitor_gate_log ADD COLUMN IF NOT EXISTS exact_lat DOUBLE PRECISION` } catch {}
    try { await sql`ALTER TABLE visitor_gate_log ADD COLUMN IF NOT EXISTS exact_lng DOUBLE PRECISION` } catch {}
    try { await sql`ALTER TABLE visitor_gate_log ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION` } catch {}
    try { await sql`ALTER TABLE visitor_gate_log ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE` } catch {}
    migrated = true
  }
}

function parseDevice(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua) && /Mobile/.test(ua)) return 'Android Phone'
  if (/Android/.test(ua)) return 'Android Tablet'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown Device'
}

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari'
  return 'Unknown'
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const body = await req.json()
    const { name, fingerprint, photo_data, exact_lat, exact_lng, location_accuracy } = body
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || 'unknown'
    const ua = req.headers.get('user-agent') || ''
    let city = '', country = '', region = ''
    try {
      const geo = await fetch(`http://ip-api.com/json/${ip}?fields=city,country,regionName`, { signal: AbortSignal.timeout(2000) })
      if (geo.ok) { const gd = await geo.json(); city = gd.city||''; country = gd.country||''; region = gd.regionName||'' }
    } catch {}
    const id = `vg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
    // Limit photo_data size to 200KB to avoid DB bloat
    const safePhoto = (photo_data || '').slice(0, 200_000)
    await sql`INSERT INTO visitor_gate_log
      (id,name,ip,city,country,region,device,browser,fingerprint,photo_data,exact_lat,exact_lng,location_accuracy,visited_at)
      VALUES (
        ${id}, ${name.trim()}, ${ip}, ${city}, ${country}, ${region},
        ${parseDevice(ua)}, ${parseBrowser(ua)}, ${fingerprint||''},
        ${safePhoto}, ${exact_lat||null}, ${exact_lng||null}, ${location_accuracy||null},
        ${Date.now()}
      )
      ON CONFLICT (id) DO NOTHING`
    return NextResponse.json({ success: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable()
    const url = new URL(req.url)
    const showArchived = url.searchParams.get('archived') === '1'
    const rows = showArchived
      ? await sql`SELECT id,name,ip,city,country,region,device,browser,fingerprint,photo_data,exact_lat,exact_lng,location_accuracy,archived,visited_at FROM visitor_gate_log WHERE archived = TRUE ORDER BY visited_at DESC LIMIT 200`
      : await sql`SELECT id,name,ip,city,country,region,device,browser,fingerprint,photo_data,exact_lat,exact_lng,location_accuracy,archived,visited_at FROM visitor_gate_log WHERE archived = FALSE OR archived IS NULL ORDER BY visited_at DESC LIMIT 200`
    return NextResponse.json({ visitors: rows })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureTable()
    const body = await req.json()
    if (body.action === 'archive_old') {
      // Archive visitors older than 30 days
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      await sql`UPDATE visitor_gate_log SET archived = TRUE WHERE visited_at < ${cutoff} AND (archived = FALSE OR archived IS NULL)`
      const count = await sql`SELECT COUNT(*) as count FROM visitor_gate_log WHERE archived = TRUE`
      return NextResponse.json({ success: true, archived: parseInt((count[0] as any)?.count || '0') })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureTable()
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await sql`DELETE FROM visitor_gate_log WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
