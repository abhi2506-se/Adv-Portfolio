/**
 * /api/visitor-analytics
 * Real data from DB: visitor sessions with country/city/device/OS info.
 * Used by the PowerBI-style dashboard section.
 */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)
let migrated = false

async function ensureTables() {
  if (migrated) return
  await sql`CREATE TABLE IF NOT EXISTS visitor_sessions (
    session_id   TEXT PRIMARY KEY,
    first_visit  BIGINT NOT NULL,
    last_active  BIGINT NOT NULL,
    ip           TEXT NOT NULL DEFAULT '',
    city         TEXT NOT NULL DEFAULT '',
    country      TEXT NOT NULL DEFAULT '',
    region       TEXT NOT NULL DEFAULT '',
    device       TEXT NOT NULL DEFAULT '',
    os           TEXT NOT NULL DEFAULT '',
    browser      TEXT NOT NULL DEFAULT '',
    page         TEXT NOT NULL DEFAULT '/'
  )`
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

export async function GET() {
  try {
    await ensureTables()
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    // Get real visitor stats
    const [totalRow] = await sql`SELECT COUNT(*) AS count FROM visitor_sessions`
    const [activeRow] = await sql`SELECT COUNT(*) AS count FROM visitor_sessions WHERE last_active > ${fiveMinAgo}`
    const [monthRow]  = await sql`SELECT COUNT(*) AS count FROM visitor_sessions WHERE first_visit > ${thirtyDaysAgo}`

    // Country distribution
    const countryRows = await sql`
      SELECT country, COUNT(*) AS count
      FROM visitor_sessions
      WHERE country != ''
      GROUP BY country ORDER BY count DESC LIMIT 10`

    // Device distribution
    const deviceRows = await sql`
      SELECT device, COUNT(*) AS count
      FROM visitor_sessions
      WHERE device != ''
      GROUP BY device ORDER BY count DESC`

    // OS distribution
    const osRows = await sql`
      SELECT os, COUNT(*) AS count
      FROM visitor_sessions
      WHERE os != ''
      GROUP BY os ORDER BY count DESC`

    // Recent live visitors (last 10 minutes)
    const liveRows = await sql`
      SELECT session_id, city, country, device, os, browser, page, last_active
      FROM visitor_sessions
      WHERE last_active > ${Date.now() - 10 * 60 * 1000}
      ORDER BY last_active DESC LIMIT 20`

    // Daily visitors for last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const dailyRows = await sql`
      SELECT 
        DATE(to_timestamp(first_visit/1000)) AS day,
        COUNT(*) AS count
      FROM visitor_sessions
      WHERE first_visit > ${sevenDaysAgo}
      GROUP BY day ORDER BY day`

    const total   = parseInt(totalRow?.count ?? '0')
    const active  = parseInt(activeRow?.count ?? '0')
    const monthly = parseInt(monthRow?.count ?? '0')

    return NextResponse.json({
      total, active, monthly,
      countries: countryRows.map(r => ({ name: r.country || 'Unknown', count: parseInt(r.count as string) })),
      devices:   deviceRows.map(r  => ({ name: r.device  || 'Unknown', count: parseInt(r.count as string) })),
      os:        osRows.map(r      => ({ name: r.os      || 'Unknown', count: parseInt(r.count as string) })),
      liveVisitors: liveRows.map(r => ({
        id:      (r.session_id as string).slice(-6),
        city:    r.city    || 'Unknown',
        country: r.country || 'Unknown',
        device:  r.device  || 'Unknown',
        os:      r.os      || 'Unknown',
        browser: r.browser || 'Unknown',
        page:    r.page    || '/',
        seenAgo: Math.round((Date.now() - Number(r.last_active)) / 1000),
      })),
      dailyTrend: dailyRows.map(r  => ({ day: String(r.day), count: parseInt(r.count as string) })),
      fetchedAt: Date.now(),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[visitor-analytics] error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
