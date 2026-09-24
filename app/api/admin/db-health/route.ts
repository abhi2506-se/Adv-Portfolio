import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/admin-auth'
import { CO_ADMIN_SESSION_COOKIE, verifyCoAdminToken } from '@/lib/co-admin-auth'
import { lazySql as sql } from '@/lib/neon-lazy'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAdminAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  if (cookie?.value && verifyToken(cookie.value)) return true
  const coCookie = req.cookies.get(CO_ADMIN_SESSION_COOKIE)
  const coPayload = coCookie?.value ? verifyCoAdminToken(coCookie.value) : null
  return !!coPayload
}

/**
 * GET /api/admin/db-health
 *
 * Admin login itself never touches the database (it's a signed cookie
 * check only), so it's possible to be fully logged into /admin while
 * Live Chat and the Contact form — which both DO need the database —
 * silently fail because DATABASE_URL is missing/wrong in this
 * environment. This endpoint tells you which one it is in one request,
 * instead of having to dig through server logs.
 */
export async function GET(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const hasEnvVar = !!process.env.DATABASE_URL
  if (!hasEnvVar) {
    return NextResponse.json({
      ok: false,
      envVarPresent: false,
      message: 'DATABASE_URL is not set in this environment. This is why Live Chat messages and Contact form messages are failing/missing — every other admin feature (login, settings) works without it, so this can go unnoticed. Add DATABASE_URL in your hosting provider\'s Environment Variables (e.g. Vercel → Project → Settings → Environment Variables), pointing at your Neon connection string, then redeploy.',
    }, { status: 200 })
  }

  try {
    const rows = await sql`SELECT 1 as ok`
    const liveChatsExists = await sql`SELECT to_regclass('public.live_chats') as t`
    const contactExists = await sql`SELECT to_regclass('public.contact_messages') as t`
    return NextResponse.json({
      ok: true,
      envVarPresent: true,
      queryWorked: rows?.[0]?.ok === 1,
      tables: {
        live_chats: !!liveChatsExists?.[0]?.t,
        contact_messages: !!contactExists?.[0]?.t,
      },
      message: 'Database connection is healthy. If messages are still missing, the issue is elsewhere (check server logs for [live-chat] / [contact] / [db] prefixed errors around the time of the failed send).',
    })
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      envVarPresent: true,
      queryWorked: false,
      error: String(e?.message || e),
      message: 'DATABASE_URL is set, but the query failed — the connection string is likely wrong/expired, the Neon project is paused/deleted, or an IP/SSL restriction is blocking this host. Check the error field above and your Neon project dashboard.',
    }, { status: 200 })
  }
}
