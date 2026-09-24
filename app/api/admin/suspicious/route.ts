import { NextRequest, NextResponse } from 'next/server'
import { dbGetSuspiciousActivities, dbResolveSuspiciousActivity, dbSaveSuspiciousActivity, dbBlockIP, dbBlockIPWithMeta, dbUnblockIP, dbUnblockByFingerprint, dbGetBlockedIPs, dbArchiveSuspiciousActivities } from '@/lib/db'
import { verifyToken } from '@/lib/admin-auth'
import nodemailer from 'nodemailer'
import { sendPushToAdmin } from '@/lib/notifications'
import { SYSTEM_FROM, withNoReplyNotice } from '@/lib/mail-identities'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  return cookie?.value && verifyToken(cookie.value)
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function sendSuspiciousAlertEmail(type: string, details: string, ip: string, device: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) return
  try {
    await transporter.sendMail({
      from: SYSTEM_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 Suspicious Activity: ${type}`,
      html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:16px 16px 0 0;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🚨 Suspicious Activity Detected</h1>
    <p style="margin:6px 0 0;color:#fca5a5;font-size:14px;">Immediate attention may be required</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <div style="background:#0f172a;border:1px solid #ef4444;border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="color:#fca5a5;font-size:13px;margin:0;font-weight:700;">Type: ${type}</p>
      <p style="color:#94a3b8;font-size:13px;margin:8px 0 0;"><strong style="color:#e2e8f0;">Details:</strong> ${details}</p>
      <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;"><strong style="color:#e2e8f0;">IP:</strong> ${ip}</p>
      <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;"><strong style="color:#e2e8f0;">Device:</strong> ${device?.slice(0, 100)}</p>
      <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;"><strong style="color:#e2e8f0;">Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </div>
    <p style="color:#64748b;font-size:12px;">Login to your admin dashboard to review and block this user if needed.</p>
  </div>
</div></body></html>`),
    })
  } catch (e) { console.error('Suspicious alert email error:', e) }
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const activities = await dbGetSuspiciousActivities(200)
    const blockedIPs = await dbGetBlockedIPs()
    return NextResponse.json({ activities, blockedIPs })
  } catch {
    return NextResponse.json({ error: 'Failed', activities: [] }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()

  if (body.action === 'block_ip') {
    const { ip, reason, unblockAt, fingerprint, user_name, user_email, user_location, user_device } = body
    if (!ip) return NextResponse.json({ error: 'Missing ip' }, { status: 400 })
    // Safety guard: never allow blocking the current admin's own IP
    const adminIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || 'unknown'
    if (ip === adminIP) {
      return NextResponse.json({ success: false, error: 'Cannot block your own IP address as admin.' }, { status: 403 })
    }
    const unblockAtNum = unblockAt ? Number(unblockAt) : 0
    const fp = fingerprint || ''
    await dbBlockIPWithMeta(ip, reason || 'Manual block by admin', unblockAtNum, {
      fingerprint: fp,
      user_name: user_name || '',
      user_email: user_email || '',
      user_location: user_location || '',
      user_device: user_device || '',
    })
    // Mark all suspicious_activity rows for this IP as blocked
    // and store the fingerprint so future admin block lookups work
    try {
      const { getDB } = await import('@/lib/db')
      const db = await getDB()
      if (fp) {
        // Update fingerprint on existing rows so the card shows it next time
        await db`UPDATE suspicious_activity SET blocked = TRUE, fingerprint = ${fp}
          WHERE ip = ${ip} AND (fingerprint = '' OR fingerprint IS NULL)`
        await db`UPDATE suspicious_activity SET blocked = TRUE
          WHERE ip = ${ip} AND fingerprint = ${fp}`
      } else {
        await db`UPDATE suspicious_activity SET blocked = TRUE WHERE ip = ${ip}`
      }
    } catch {}
    return NextResponse.json({ success: true })
  }

  if (body.action === 'archive_resolved') {
    const result = await dbArchiveSuspiciousActivities()
    return NextResponse.json({ success: true, archived: result })
  }

  if (body.action === 'unblock_ip') {
    const { ip, fingerprint } = body
    if (!ip) return NextResponse.json({ error: 'Missing ip' }, { status: 400 })
    await dbUnblockIP(ip)
    if (fingerprint) await dbUnblockByFingerprint(fingerprint).catch(() => {})
    return NextResponse.json({ success: true })
  }

  // Default: resolve activity
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    await dbResolveSuspiciousActivity(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// Public POST — called by suspicious-activity-detector (no auth needed)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, details } = body
    if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || 'unknown'
    const device = req.headers.get('user-agent') || 'unknown'

    const activity = {
      id: `sus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      type: String(type).slice(0, 100),
      ip,
      location: '',
      device: device.slice(0, 200),
      details: String(details || '').slice(0, 500),
      created_at: Date.now(),
      blocked: false,
    }

    await dbSaveSuspiciousActivity(activity)

    // Send instant email alert to admin (non-blocking)
    sendSuspiciousAlertEmail(activity.type, activity.details, activity.ip, activity.device).catch(() => {})

    // Push notification for suspicious activity
    sendPushToAdmin({
      title: '🚨 Suspicious Activity Detected',
      body: `${activity.type} — ${activity.details.slice(0, 80)}${activity.details.length > 80 ? '…' : ''}`,
      tag: 'suspicious-activity',
      url: '/admin',
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
