export const runtime = 'nodejs'
/**
 * /api/visitor-push-subscribe
 *
 * Visitor-side push subscription management.
 * No auth required — any visitor can subscribe.
 */
import { NextRequest, NextResponse } from 'next/server'
import { dbSaveVisitorPushSubscription, dbDeleteVisitorPushSubscription } from '@/lib/db'

function makeId() {
  return 'vsub_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { endpoint, p256dh, auth, fingerprint, user_name, user_email } = body
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing subscription fields' }, { status: 400 })
    }
    await dbSaveVisitorPushSubscription({
      id: makeId(),
      endpoint,
      p256dh,
      auth,
      fingerprint: fingerprint || '',
      user_name: user_name || '',
      user_email: user_email || '',
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[visitor-push-subscribe] POST error:', err)
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    if (!endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    await dbDeleteVisitorPushSubscription(endpoint)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
