/**
 * lib/notifications.ts
 *
 * Real push notifications using the `web-push` npm package.
 *
 * WHY the old code failed:
 *   The previous implementation made a raw fetch() to the push endpoint.
 *   Web Push protocol (RFC 8030 + RFC 8291 + RFC 7519) requires:
 *     1. VAPID JWT authentication header signed with your private key
 *     2. Payload encrypted with the subscriber's p256dh + auth keys (AES-128-GCM)
 *     3. Specific Content-Encoding, Content-Type, TTL headers
 *   Without these a push service returns 401 Unauthorized.
 *   The `web-push` package handles all of this automatically.
 */

import webpush from 'web-push'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// ── VAPID setup (called lazily once) ─────────────────────────────────────────
let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  const pub  = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const mail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'mailto:admin@example.com'

  if (!pub || !priv) {
    console.error('[Notifications] VAPID keys not set. Push will not work.')
    return
  }

  webpush.setVapidDetails(
    mail.startsWith('mailto:') ? mail : `mailto:${mail}`,
    pub,
    priv
  )
  vapidConfigured = true
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PushSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title:   string
  body:    string
  icon?:   string
  badge?:  string
  tag?:    string
  url?:    string
  data?:   Record<string, string>
}

// ── Fetch all subscriptions ───────────────────────────────────────────────────
export async function getAllSubscriptions(): Promise<PushSubscription[]> {
  try {
    const rows = await sql`SELECT * FROM push_subscriptions ORDER BY created_at DESC`
    return rows as PushSubscription[]
  } catch (error) {
    console.error('[Notifications] Failed to fetch subscriptions:', error)
    return []
  }
}

// ── Send to one subscription ──────────────────────────────────────────────────
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload
): Promise<boolean> {
  ensureVapid()
  if (!vapidConfigured) return false

  const pushSub = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth:   subscription.auth,
    },
  }

  const message = JSON.stringify({
    title:  payload.title,
    body:   payload.body,
    icon:   payload.icon  || '/icons/icon-192x192.png',
    badge:  payload.badge || '/icons/icon-192x192.png',
    tag:    payload.tag   || 'admin-notification',
    url:    payload.url   || '/admin/dashboard',
    data:   payload.data  || {},
  })

  try {
    await webpush.sendNotification(pushSub, message, {
      TTL:     86400,   // 24 hours — deliver even if device is offline
      urgency: 'high',  // iOS + Android: wake the device
    })
    console.log(`[Notifications] ✓ Sent to ${subscription.endpoint.slice(0, 60)}…`)
    return true
  } catch (err: any) {
    const status = err?.statusCode || err?.status
    if (status === 410 || status === 404) {
      // Subscription expired / user unsubscribed — remove from DB
      await sql`DELETE FROM push_subscriptions WHERE endpoint = ${subscription.endpoint}`.catch(() => {})
      console.log(`[Notifications] Removed expired subscription (${status})`)
    } else {
      console.error(`[Notifications] Send failed (${status}):`, err?.body || err?.message || err)
    }
    return false
  }
}

// ── Broadcast to all subscriptions ───────────────────────────────────────────
export async function notifyAllAdmins(payload: PushPayload): Promise<number> {
  const subs = await getAllSubscriptions()
  if (subs.length === 0) {
    console.log('[Notifications] No subscriptions found — skipping push')
    return 0
  }
  console.log(`[Notifications] Broadcasting to ${subs.length} device(s)`)

  // Send in parallel for speed; await all so errors are caught
  const results = await Promise.allSettled(subs.map(s => sendPushNotification(s, payload)))
  const sent = results.filter(r => r.status === 'fulfilled' && r.value).length
  console.log(`[Notifications] Delivered to ${sent}/${subs.length}`)
  return sent
}

// ── sendPushToAdmin (backward-compatible wrapper) ─────────────────────────────
export async function sendPushToAdmin(payload: {
  title?: string
  body?:  string
  message?: string
  tag?:  string
  url?:  string
}): Promise<number> {
  try {
    return await notifyAllAdmins({
      title: payload.title || 'Admin Alert',
      body:  payload.body  || payload.message || '',
      tag:   payload.tag   || 'admin-alert',
      url:   payload.url   || '/admin/dashboard',
    })
  } catch (err) {
    console.error('[Notifications] sendPushToAdmin error:', err)
    return 0
  }
}

// ── Typed helpers matching email notifications ────────────────────────────────
export async function notifyNewMessage(d: { name: string; subject: string; email: string }): Promise<number> {
  return notifyAllAdmins({
    title: '📨 New Contact Message',
    body:  `From: ${d.name} — ${d.subject}`,
    tag:   'new-message',
    url:   '/admin/dashboard?section=messages',
  })
}

export async function notifyNewChatMessage(d: { visitorName: string; message: string; visitorId: string }): Promise<number> {
  return notifyAllAdmins({
    title: '💬 New Live Chat Request',
    body:  `${d.visitorName}: ${d.message.slice(0, 80)}${d.message.length > 80 ? '…' : ''}`,
    tag:   'live-chat',
    url:   '/admin/dashboard?section=live_chat',
  })
}

export async function notifySuspiciousActivity(d: { type: string; description: string; ip: string; severity: 'low' | 'medium' | 'high' }): Promise<number> {
  const icon = d.severity === 'high' ? '🚨' : d.severity === 'medium' ? '⚠️' : '🔍'
  return notifyAllAdmins({
    title: `${icon} Suspicious Activity: ${d.type}`,
    body:  `IP ${d.ip} — ${d.description.slice(0, 100)}`,
    tag:   'suspicious-activity',
    url:   '/admin/dashboard?section=security',
  })
}

export async function notifyNewContact(d: { name: string; email: string; subject: string }): Promise<number> {
  return notifyAllAdmins({
    title: '📬 New Contact Form Submission',
    body:  `${d.name} (${d.email}) — ${d.subject}`,
    tag:   'contact-form',
    url:   '/admin/dashboard?section=messages',
  })
}

export async function notifyBlockedIP(d: { ip: string; reason: string }): Promise<number> {
  return notifyAllAdmins({
    title: '🛡️ IP Blocked',
    body:  `${d.ip} — ${d.reason}`,
    tag:   'blocked-ip',
    url:   '/admin/dashboard?section=security',
  })
}

export async function notifyPortfolioUpdate(d: { section: string; action: string }): Promise<number> {
  return notifyAllAdmins({
    title: '📝 Portfolio Updated',
    body:  `${d.section}: ${d.action}`,
    tag:   'portfolio-update',
    url:   '/admin/dashboard?section=overview',
  })
}

export default {
  getAllSubscriptions,
  sendPushNotification,
  notifyAllAdmins,
  sendPushToAdmin,
  notifyNewMessage,
  notifyNewChatMessage,
  notifySuspiciousActivity,
  notifyNewContact,
  notifyBlockedIP,
  notifyPortfolioUpdate,
}

// ─── Visitor Push Notifications ───────────────────────────────────────────────

import { dbGetAllVisitorPushSubscriptions, dbDeleteVisitorPushSubscription } from '@/lib/db'

export async function notifyAllVisitors(payload: PushPayload): Promise<number> {
  ensureVapid()
  if (!vapidConfigured) return 0

  let subs: any[] = []
  try {
    subs = await dbGetAllVisitorPushSubscriptions()
  } catch (err) {
    console.error('[Notifications] Failed to load visitor subscriptions:', err)
    return 0
  }

  if (subs.length === 0) return 0
  console.log(`[Notifications] Sending visitor notification to ${subs.length} device(s)`)

  const results = await Promise.allSettled(
    subs.map(async (s) => {
      const pushSub = { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }
      const message = JSON.stringify({
        title:  payload.title,
        body:   payload.body,
        icon:   payload.icon  || '/icons/icon-192x192.png',
        badge:  payload.badge || '/icons/icon-192x192.png',
        tag:    payload.tag   || 'portfolio-update',
        url:    payload.url   || '/',
        data:   payload.data  || {},
      })
      try {
        await webpush.sendNotification(pushSub, message, { TTL: 86400, urgency: 'normal' })
        return true
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await dbDeleteVisitorPushSubscription(s.endpoint).catch(() => {})
        }
        return false
      }
    })
  )

  return results.filter(r => r.status === 'fulfilled' && r.value).length
}

/** Notify visitors about a new blog / journey post */
export async function notifyVisitorNewPost(d: { title: string; section: string; url: string }): Promise<number> {
  return notifyAllVisitors({
    title: `✨ New ${d.section} from Abhishek`,
    body:  d.title,
    tag:   'new-post',
    url:   d.url,
  })
}

/** Notify visitors about a portfolio section update */
export async function notifyVisitorPortfolioUpdate(d: { section: string; message: string }): Promise<number> {
  return notifyAllVisitors({
    title: '🚀 Portfolio Updated',
    body:  `${d.section}: ${d.message}`,
    tag:   'portfolio-update',
    url:   '/',
  })
}

/** Send a custom push to all visitors — called from admin panel */
export async function notifyVisitorCustom(d: { title: string; body: string; url?: string }): Promise<number> {
  return notifyAllVisitors({
    title: d.title,
    body:  d.body,
    tag:   'admin-broadcast',
    url:   d.url || '/',
  })
}
