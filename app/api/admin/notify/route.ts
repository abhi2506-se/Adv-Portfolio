/**
 * API endpoint to send push notifications
 * Called by internal processes to notify admins
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/admin-auth'
import { notifyAllAdmins, notifyNewMessage, notifyNewChatMessage, notifySuspiciousActivity, notifyVisitorCustom, notifyVisitorPortfolioUpdate } from '@/lib/notifications'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAuthed(req: NextRequest) {
  try {
    const cookie = req.cookies.get(SESSION_COOKIE)
    if (!cookie?.value) return false
    return !!verifyToken(cookie.value)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // Verify authentication
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { type, data } = body as {
      type: string
      data: Record<string, any>
    }

    console.log(`[notify] Sending notification: ${type}`)

    let sentCount = 0

    switch (type) {
      case 'message':
        sentCount = await notifyNewMessage({
          name: data.name || 'Unknown',
          subject: data.subject || 'No subject',
          email: data.email || 'no-email@example.com',
        })
        break

      case 'chat':
        sentCount = await notifyNewChatMessage({
          visitorName: data.visitorName || 'Visitor',
          message: data.message || 'New message',
          visitorId: data.visitorId || '',
        })
        break

      case 'suspicious':
        sentCount = await notifySuspiciousActivity({
          type: data.activityType || 'Unknown',
          description: data.description || '',
          ip: data.ip || '',
          severity: data.severity || 'low',
        })
        break

      case 'custom':
        sentCount = await notifyAllAdmins({
          title: data.title || 'Notification',
          body: data.body || '',
          tag: data.tag || 'custom',
          data: data.data || {},
        })
        break

      // ── Visitor notifications ──────────────────────────────────────────────
      case 'visitor_broadcast':
        sentCount = await notifyVisitorCustom({
          title: data.title || 'Update from Abhishek',
          body:  data.body  || '',
          url:   data.url   || '/',
        })
        break

      case 'visitor_portfolio_update':
        sentCount = await notifyVisitorPortfolioUpdate({
          section: data.section || 'Portfolio',
          message: data.message || '',
        })
        break

      default:
        return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 })
    }

    console.log(`[notify] Successfully sent to ${sentCount} devices`)
    return NextResponse.json({ ok: true, sent: sentCount })
  } catch (err) {
    console.error('[notify] Error:', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
