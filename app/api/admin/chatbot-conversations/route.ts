import { NextRequest, NextResponse } from 'next/server'
import { dbGetChatbotSessions, dbGetChatbotSessionsCount, dbDeleteChatbotSession } from '@/lib/db'
import { verifyToken } from '@/lib/admin-auth'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  return cookie?.value && verifyToken(cookie.value)
}

// GET /api/admin/chatbot-conversations
// Returns all saved chatbot conversations for admin view
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)
    const [sessions, total] = await Promise.all([
      dbGetChatbotSessions(limit),
      dbGetChatbotSessionsCount(),
    ])
    return NextResponse.json({ sessions, total })
  } catch (e) {
    console.error('[chatbot-conversations] GET error:', e)
    return NextResponse.json({ error: 'Failed to fetch conversations', sessions: [], total: 0 }, { status: 500 })
  }
}

// DELETE /api/admin/chatbot-conversations
// Delete a single session by session_id
export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { session_id } = await req.json()
    if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    await dbDeleteChatbotSession(session_id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[chatbot-conversations] DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
