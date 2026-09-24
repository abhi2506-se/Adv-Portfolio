import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/admin-auth'
import { dbSavePushSubscription, dbDeletePushSubscription } from '@/lib/db'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAuthed(req: NextRequest) {
  try {
    const cookie = req.cookies.get(SESSION_COOKIE)
    if (!cookie?.value) {
      console.error('[push-subscribe] No session cookie found')
      return false
    }
    const verified = verifyToken(cookie.value)
    if (!verified) {
      console.error('[push-subscribe] Token verification failed')
      return false
    }
    return true
  } catch (error) {
    console.error('[push-subscribe] Auth check error:', error)
    return false
  }
}

// GET — return VAPID public key so the client can subscribe
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    console.warn('[push-subscribe] GET: Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const publicKey = process.env.VAPID_PUBLIC_KEY
    if (!publicKey) {
      console.error('[push-subscribe] VAPID_PUBLIC_KEY not configured')
      return NextResponse.json({ error: 'VAPID not configured' }, { status: 503 })
    }
    
    console.log('[push-subscribe] GET: Returning VAPID public key')
    return NextResponse.json({ publicKey })
  } catch (err) {
    console.error('[push-subscribe] GET error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST — save a new push subscription from the admin browser
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    console.warn('[push-subscribe] POST: Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { endpoint, keys } = body as {
      endpoint: string
      keys: { p256dh: string; auth: string }
    }

    // Validate input
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      console.error('[push-subscribe] POST: Invalid subscription object', { endpoint, keys: !!keys })
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
    }

    // Validate endpoint is a valid URL
    try {
      new URL(endpoint)
    } catch {
      console.error('[push-subscribe] POST: Invalid endpoint URL', endpoint)
      return NextResponse.json({ error: 'Invalid endpoint URL' }, { status: 400 })
    }

    const id = `psub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
    
    console.log('[push-subscribe] POST: Saving subscription', { id, endpoint: endpoint.substring(0, 50) + '...' })
    
    await dbSavePushSubscription({ id, endpoint, p256dh: keys.p256dh, auth: keys.auth })

    console.log('[push-subscribe] POST: Successfully saved subscription', id)
    return NextResponse.json({ ok: true, id })
  } catch (err) {
    console.error('[push-subscribe] POST error:', err)
    return NextResponse.json({ error: 'Failed to save subscription', details: String(err) }, { status: 500 })
  }
}

// DELETE — remove subscription when admin unsubscribes or logs out
export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) {
    console.warn('[push-subscribe] DELETE: Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { endpoint } = await req.json()
    if (!endpoint) {
      console.error('[push-subscribe] DELETE: Missing endpoint')
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    console.log('[push-subscribe] DELETE: Removing subscription', endpoint.substring(0, 50) + '...')
    
    await dbDeletePushSubscription(endpoint)

    console.log('[push-subscribe] DELETE: Successfully removed subscription')
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[push-subscribe] DELETE error:', err)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }
}
