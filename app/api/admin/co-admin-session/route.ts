export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { CO_ADMIN_SESSION_COOKIE, verifyCoAdminToken } from '@/lib/co-admin-auth'
import { getCoAdminById, logCoAdminActivity } from '@/lib/co-admin-db'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(CO_ADMIN_SESSION_COOKIE)?.value
  const payload = verifyCoAdminToken(token)
  if (!payload) return NextResponse.json({ loggedIn: false })

  // Re-check current enabled/blocked state + permissions from the DB every
  // time — a co-admin session should never keep working after the real
  // admin disables/blocks them or changes their permissions.
  const row = await getCoAdminById(payload.id)
  if (!row || row.blocked || !row.enabled) {
    const res = NextResponse.json({ loggedIn: false, revoked: true })
    res.cookies.delete(CO_ADMIN_SESSION_COOKIE)
    return res
  }

  return NextResponse.json({
    loggedIn: true,
    id: row.id,
    name: row.name,
    username: row.username,
    relation: row.relation,
    permissions: row.permissions || [],
  })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(CO_ADMIN_SESSION_COOKIE)?.value
  const payload = verifyCoAdminToken(token)
  if (!payload) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  try {
    const { action, section, detail } = await req.json()
    if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    await logCoAdminActivity(payload.id, payload.username, action, section, detail)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(CO_ADMIN_SESSION_COOKIE)
  return res
}
