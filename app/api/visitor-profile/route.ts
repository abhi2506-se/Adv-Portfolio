import { NextRequest, NextResponse } from 'next/server'
import { getAllUsers, deleteUser } from '@/lib/user-db'
import { verifyToken } from '@/lib/admin-auth'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  return cookie?.value && verifyToken(cookie.value)
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const users = await getAllUsers(500)
    return NextResponse.json({ users })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'User id required' }, { status: 400 })
    await deleteUser(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
