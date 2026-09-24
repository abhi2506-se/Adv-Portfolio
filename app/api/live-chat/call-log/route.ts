import { NextRequest, NextResponse } from 'next/server'
import { logCallStart, logCallEnd } from '@/lib/live-chat-db'

// POST { action: 'start', chatId, type, callerRole } -> { callId }
// POST { action: 'end', callId, status }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.action === 'start') {
      const callId = await logCallStart(body.chatId, body.type || 'audio', body.callerRole)
      return NextResponse.json({ ok: true, callId })
    }
    if (body.action === 'end') {
      await logCallEnd(body.callId, body.status || 'completed')
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
