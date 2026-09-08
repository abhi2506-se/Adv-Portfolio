/**
 * /api/visitors
 * POST — Record/refresh a visitor session with geo/device info.
 * GET  — Return current visitor stats.
 */
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)
let migrated = false

async function ensureVisitorTable() {
  if (migrated) return
  await sql`CREATE TABLE IF NOT EXISTS visitor_sessions (
    session_id  TEXT PRIMARY KEY,
    first_visit BIGINT NOT NULL,
    last_active BIGINT NOT NULL,
    ip          TEXT NOT NULL DEFAULT '',
    city        TEXT NOT NULL DEFAULT '',
    country     TEXT NOT NULL DEFAULT '',
    region      TEXT NOT NULL DEFAULT '',
    device      TEXT NOT NULL DEFAULT '',
    os          TEXT NOT NULL DEFAULT '',
    browser     TEXT NOT NULL DEFAULT '',
    page        TEXT NOT NULL DEFAULT '/'
  )`
  // Migrate existing table
  try { await sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS ip TEXT NOT NULL DEFAULT ''` } catch {}
  try { await sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT ''` } catch {}
  try { await sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT ''` } catch {}
  try { await sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT ''` } catch {}
  try { await sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS device TEXT NOT NULL DEFAULT ''` } catch {}
  try { await sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS os TEXT NOT NULL DEFAULT ''` } catch {}
  try { await sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS browser TEXT NOT NULL DEFAULT ''` } catch {}
  try { await sql`ALTER TABLE visitor_sessions ADD COLUMN IF NOT EXISTS page TEXT NOT NULL DEFAULT '/'` } catch {}
  migrated = true
}

function parseDevice(ua: string): string {
  if (/iPhone/.test(ua)) return 'Mobile'
  if (/iPad/.test(ua)) return 'Tablet'
  if (/Android/.test(ua) && /Mobile/.test(ua)) return 'Mobile'
  if (/Android/.test(ua)) return 'Tablet'
  return 'Desktop'
}

function parseOS(ua: string): string {
  if (/iPhone|iPad/.test(ua)) return 'iOS'
  if (/Android/.test(ua)) return 'Android'
  if (/Windows/.test(ua)) return 'Windows'
  if (/Macintosh/.test(ua)) return 'macOS'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown'
}

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari'
  return 'Unknown'
}

async function getGeoData(ip: string): Promise<{ city: string; country: string; region: string }> {
  if (!ip || ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('::1')) {
    return { city: '', country: '', region: '' }
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=city,country,regionName`,
      { signal: AbortSignal.timeout(2000) }
    )
    if (res.ok) {
      const gd = await res.json()
      return { city: gd.city || '', country: gd.country || '', region: gd.regionName || '' }
    }
  } catch {}
  return { city: '', country: '', region: '' }
}

export async function POST(req: NextRequest) {
  try {
    await ensureVisitorTable()
    const { sessionId, page } = await req.json()
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') || 'unknown'
    const ua = req.headers.get('user-agent') || ''
    const now = Date.now()

    // Check if this is a new session or returning session
    const existing = await sql`SELECT session_id FROM visitor_sessions WHERE session_id = ${sessionId.trim()}`
    
    if (existing.length === 0) {
      // New session — fetch geo data asynchronously (non-blocking)
      const geo = await getGeoData(ip)
      await sql`
        INSERT INTO visitor_sessions
          (session_id, first_visit, last_active, ip, city, country, region, device, os, browser, page)
        VALUES (
          ${sessionId.trim()}, ${now}, ${now},
          ${ip}, ${geo.city}, ${geo.country}, ${geo.region},
          ${parseDevice(ua)}, ${parseOS(ua)}, ${parseBrowser(ua)},
          ${page || '/'}
        )
        ON CONFLICT (session_id) DO NOTHING`
    } else {
      // Update last_active and page
      await sql`
        UPDATE visitor_sessions
        SET last_active = ${now}, page = ${page || '/'}
        WHERE session_id = ${sessionId.trim()}`
    }

    // Return stats
    const fiveMinAgo = now - 5 * 60 * 1000
    const [totalRow]  = await sql`SELECT COUNT(*) AS count FROM visitor_sessions`
    const [activeRow] = await sql`SELECT COUNT(*) AS count FROM visitor_sessions WHERE last_active > ${fiveMinAgo}`
    return NextResponse.json(
      { total: parseInt(totalRow?.count ?? '0'), active: parseInt(activeRow?.count ?? '0'), lastUpdated: now },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    console.error('[visitors] POST error:', e)
    return NextResponse.json({ total: 0, active: 0, lastUpdated: Date.now() })
  }
}

export async function GET() {
  try {
    await ensureVisitorTable()
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    const [totalRow]  = await sql`SELECT COUNT(*) AS count FROM visitor_sessions`
    const [activeRow] = await sql`SELECT COUNT(*) AS count FROM visitor_sessions WHERE last_active > ${fiveMinAgo}`
    return NextResponse.json(
      {
        total: parseInt(totalRow?.count ?? '0'),
        active: parseInt(activeRow?.count ?? '0'),
        lastUpdated: Date.now(),
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  } catch (e) {
    console.error('[visitors] GET error:', e)
    return NextResponse.json({ total: 0, active: 0, lastUpdated: Date.now() })
  }
}
