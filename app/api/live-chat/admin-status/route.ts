/**
 * /api/live-chat/admin-status
 *
 * A single global "is Abhishek online right now" flag, kept alive by a
 * heartbeat from the admin dashboard while it's open. Drives:
 *  - the "🔴 Abhishek is currently unavailable — leave a message" banner
 *    on the visitor's side
 *  - whether the AI hybrid auto-responder is allowed to answer
 *  - the AI → human handoff message the moment Abhishek comes back online
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/admin-auth'
import { CO_ADMIN_SESSION_COOKIE, verifyCoAdminToken } from '@/lib/co-admin-auth'
import { broadcastToChat } from '@/lib/supabase-realtime'
import { adminHeartbeat, getAdminOnlineStatus, getAiActiveChats, setAiActive, insertMessage } from '@/lib/live-chat-db'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAdminAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  if (cookie?.value && verifyToken(cookie.value)) return true
  const coCookie = req.cookies.get(CO_ADMIN_SESSION_COOKIE)
  const coPayload = coCookie?.value ? verifyCoAdminToken(coCookie.value) : null
  return !!coPayload && coPayload.permissions.includes('live_chat')
}

export async function GET() {
  const status = await getAdminOnlineStatus()
  return NextResponse.json(status)
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { justCameOnline } = await adminHeartbeat()

  if (justCameOnline) {
    // Hand every AI-active conversation back to Abhishek at once.
    const chats = await getAiActiveChats()
    for (const { id: chatId } of chats) {
      await setAiActive(chatId, false)
      const { message } = await insertMessage({
        chatId, role: 'system',
        content: "Abhishek just joined the conversation. I'll let him take over from here. 🙂",
      })
      await broadcastToChat(chatId, 'new_message', { message })
      await broadcastToChat(chatId, 'ai_handoff', { chatId })
    }
  }

  return NextResponse.json({ ok: true, justCameOnline })
}
