import { NextRequest, NextResponse } from 'next/server'
import { dbGetActiveSessions, dbRevokeSession, dbUpdateSessionActivity } from '@/lib/db'
import { verifyToken } from '@/lib/admin-auth'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  return cookie?.value && verifyToken(cookie.value)
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const sessions = await dbGetActiveSessions()
    return NextResponse.json({ sessions })
  } catch (e) {
    return NextResponse.json({ error: 'Failed', sessions: [] }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    await dbRevokeSession(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    await dbUpdateSessionActivity(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
