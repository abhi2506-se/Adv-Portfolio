import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/admin-auth'
import { CO_ADMIN_SESSION_COOKIE, verifyCoAdminToken } from '@/lib/co-admin-auth'
import { getOrCreateDeviceId, attachDeviceCookie } from '@/lib/device-id'
import { heartbeat, getPresence } from '@/lib/live-chat-db'
import { broadcastToChat } from '@/lib/supabase-realtime'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAdminAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  if (cookie?.value && verifyToken(cookie.value)) return true
  const coCookie = req.cookies.get(CO_ADMIN_SESSION_COOKIE)
  const coPayload = coCookie?.value ? verifyCoAdminToken(coCookie.value) : null
  return !!coPayload && coPayload.permissions.includes('live_chat')
}

// POST { chatId, active } — call every ~10s from the client while a chat is open,
// and immediately on visibility/focus change. `active` = tab visible + focused +
// recent interaction (see hooks/use-presence.ts).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { chatId, active } = body
    if (!chatId) return NextResponse.json({ error: 'Missing chatId' }, { status: 400 })

    const admin = isAdminAuthed(req)
    const role: 'user' | 'admin' = admin ? 'admin' : 'user'
    const { deviceId, isNew, token } = getOrCreateDeviceId(req)

    const presence = await heartbeat(chatId, role, !!active)
    broadcastToChat(chatId, 'presence', { role, ...presence[role] }).catch(() => {})

    const res = NextResponse.json({ ok: true, presence })
    return isNew && !admin ? attachDeviceCookie(res, token) : res
  } catch (e) {
    console.error('[presence] POST error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// GET ?chatId=... — polling fallback for presence status
export async function GET(req: NextRequest) {
  try {
    const chatId = new URL(req.url).searchParams.get('chatId')
    if (!chatId) return NextResponse.json({ error: 'Missing chatId' }, { status: 400 })
    const presence = await getPresence(chatId)
    return NextResponse.json({ presence })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
