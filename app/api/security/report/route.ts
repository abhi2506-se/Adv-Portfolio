import { NextRequest, NextResponse } from 'next/server'
import { dbSaveSuspiciousActivity, dbIsIPBlocked, dbBlockIP, dbGetSuspiciousActivities, dbGetBlockedIPWithDetails, dbBlockIPWithMeta, dbGetBlockedByFingerprint, dbUnblockIP, dbUnblockByFingerprint } from '@/lib/db'
import nodemailer from 'nodemailer'
import { SYSTEM_FROM, withNoReplyNotice } from '@/lib/mail-identities'
import { isWhitelistedName } from '@/lib/security-whitelist'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

let lastEmailTime: Record<string, number> = {}
const EMAIL_COOLDOWN = 60_000

// Block duration logic based on activity type and repeat count
function getBlockDurationHours(type: string, previousCount: number): number {
  if (type === 'SCREENSHOT_ATTEMPT' || type === 'SCREENSHOT_MOBILE') {
    if (previousCount >= 3) return 72
    if (previousCount >= 1) return 48
    return 24
  }
  if (type === 'ABUSIVE_LANGUAGE' || type === 'ABUSIVE_LANGUAGE_TYPED' ||
      type === 'ABUSIVE_LANGUAGE_CHATBOT' || type === 'ABUSIVE_LANGUAGE_CONTACT_FORM') {
    if (previousCount >= 2) return 72
    if (previousCount >= 1) return 48
    return 24
  }
  if (type === 'ILLEGAL_INTENT_TYPED' || type === 'ILLEGAL_INTENT_CHAT') {
    if (previousCount >= 1) return 72
    return 48
  }
  if (type === 'DEVTOOLS_OPEN') {
    if (previousCount >= 3) return 48
    if (previousCount >= 1) return 24
    return 0
  }
  const MED_SEVERITY = ['VIEW_SOURCE_ATTEMPT', 'DRAG_PROTECTED_MEDIA', 'RIGHT_CLICK_PROTECTED']
  if (MED_SEVERITY.includes(type)) {
    if (previousCount >= 5) return 72
    if (previousCount >= 2) return 48
    return 0
  }
  if (type === 'UNUSUAL_RAPID_INTERACTION') {
    if (previousCount >= 3) return 24
    return 0
  }
  return 0
}

async function sendAdminAlert(type: string, details: string, ip: string, device: string, blockHours: number, location: string, userName: string, userEmail: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) return
  const now = Date.now()
  const key = `${type}_${ip}`
  if (lastEmailTime[key] && now - lastEmailTime[key] < EMAIL_COOLDOWN) return
  lastEmailTime[key] = now

  const blockInfo = blockHours > 0
    ? `<p style="color:#fbbf24;"><b>Auto-blocked for ${blockHours} hours.</b> Will auto-unblock after this period.</p>`
    : '<p style="color:#94a3b8;">No automatic block applied. Review manually if needed.</p>'

  try {
    await transporter.sendMail({
      from: SYSTEM_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `Security Alert: ${type}${blockHours > 0 ? ` — Blocked ${blockHours}h` : ''}`,
      html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);border-radius:16px 16px 0 0;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Suspicious Activity Detected</h1>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <p style="color:#fca5a5;font-weight:700;">Type: ${type}</p>
    <p style="color:#94a3b8;"><strong style="color:#e2e8f0;">Details:</strong> ${details}</p>
    <p style="color:#94a3b8;"><strong style="color:#e2e8f0;">IP:</strong> ${ip}</p>
    <p style="color:#94a3b8;"><strong style="color:#e2e8f0;">Location:</strong> ${location || 'Unknown'}</p>
    <p style="color:#94a3b8;"><strong style="color:#e2e8f0;">User Name:</strong> ${userName || 'Unknown'}</p>
    <p style="color:#94a3b8;"><strong style="color:#e2e8f0;">User Email:</strong> ${userEmail || 'Unknown'}</p>
    <p style="color:#94a3b8;"><strong style="color:#e2e8f0;">Device:</strong> ${device?.slice(0, 100)}</p>
    <p style="color:#94a3b8;"><strong style="color:#e2e8f0;">Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    ${blockInfo}
    <p style="color:#64748b;font-size:12px;margin-top:16px;">Admin can unblock any user manually from the admin panel at any time.</p>
  </div>
</div></body></html>`),
    })
  } catch (e) { console.error('Alert email error:', e) }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, details, location, fingerprint, user_name, user_email } = body
    if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || 'unknown'
    const device = req.headers.get('user-agent') || 'unknown'

    // Whitelisted visitors are fully exempt — nothing is logged or blocked,
    // and any pre-existing block on their IP/fingerprint is lifted.
    if (isWhitelistedName(user_name)) {
      if (ip !== 'unknown') await dbUnblockIP(ip).catch(() => {})
      if (fingerprint) await dbUnblockByFingerprint(fingerprint).catch(() => {})
      return NextResponse.json({ success: true, blocked: false, blockHours: 0, unblockAt: 0 })
    }

    const adminCookie = req.cookies.get('portfolio_admin_session')?.value
    const isAdminRequest = adminCookie ? true : false
    const referer = req.headers.get('referer') || ''
    const isAdminReferer = referer.includes('/admin')

    let isBlocked = false
    let blockHours = 0
    let unblockAt = 0

    // Check if already blocked by IP or fingerprint
    try {
      if (!isAdminRequest && !isAdminReferer) {
        const existingBlock = await dbGetBlockedIPWithDetails(ip)
        const fpBlock = fingerprint ? await dbGetBlockedByFingerprint(fingerprint) : null
        const block = existingBlock || fpBlock

        if (block) {
          isBlocked = true
          unblockAt = Number(block.unblock_at) || 0
          if (unblockAt > 0) {
            const remainingMs = unblockAt - Date.now()
            blockHours = remainingMs > 0 ? Math.ceil(remainingMs / 3_600_000) : 0
          }
          const activity = {
            id: `sus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
            type: String(type).slice(0, 100),
            ip,
            location: String(location || block.user_location || '').slice(0, 200),
            device: device.slice(0, 200),
            details: String(details || '').slice(0, 500),
            created_at: Date.now(),
            blocked: true,
            fingerprint: fingerprint || '',
            user_name: user_name || '',
            user_email: user_email || '',
          }
          await dbSaveSuspiciousActivity(activity).catch(() => {})
          return NextResponse.json({ success: true, blocked: true, blockHours, unblockAt })
        }
      }
    } catch {}

    // Not currently blocked — apply auto-block logic
    try {
      if (!isAdminRequest && !isAdminReferer) {
        const allActivities = await dbGetSuspiciousActivities(500) as any[]
        const previousCount = allActivities.filter((a: any) => a.ip === ip && a.type === type).length
        blockHours = getBlockDurationHours(type, previousCount)
        if (blockHours > 0) {
          unblockAt = Date.now() + blockHours * 60 * 60 * 1000
          await dbBlockIPWithMeta(ip, `Auto-blocked: ${type} (${previousCount + 1} offences)`, unblockAt, {
            fingerprint: fingerprint || '',
            user_name: user_name || '',
            user_email: user_email || '',
            user_location: location || '',
            user_device: device.slice(0, 200),
          })
          isBlocked = true
        }
      }
    } catch {}

    const activity = {
      id: `sus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      type: String(type).slice(0, 100),
      ip,
      location: String(location || '').slice(0, 200),
      device: device.slice(0, 200),
      details: String(details || '').slice(0, 500),
      created_at: Date.now(),
      blocked: isBlocked,
      fingerprint: fingerprint || '',
      user_name: user_name || '',
      user_email: user_email || '',
    }

    await dbSaveSuspiciousActivity(activity)
    sendAdminAlert(activity.type, activity.details, activity.ip, activity.device, blockHours, activity.location, user_name || '', user_email || '').catch(() => {})

    return NextResponse.json({ success: true, blocked: isBlocked, blockHours, unblockAt })
  } catch (e) {
    return NextResponse.json({ success: true, blocked: false, blockHours: 0, unblockAt: 0 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || 'unknown'

    const adminCookie = req.cookies.get('portfolio_admin_session')?.value
    if (adminCookie) {
      return NextResponse.json({ blocked: false, unblockAt: 0, blockHours: 0 })
    }

    const { searchParams } = new URL(req.url)
    const fingerprint = searchParams.get('fp') || ''
    const name = searchParams.get('name') || ''

    // Whitelisted visitors always read back as unblocked, and any existing
    // block tied to their IP/fingerprint is actively lifted.
    if (isWhitelistedName(name)) {
      if (ip !== 'unknown') await dbUnblockIP(ip).catch(() => {})
      if (fingerprint) await dbUnblockByFingerprint(fingerprint).catch(() => {})
      return NextResponse.json({ blocked: false, unblockAt: 0, blockHours: 0 })
    }

    const blockDetails = await dbGetBlockedIPWithDetails(ip)
    const fpBlock = fingerprint ? await dbGetBlockedByFingerprint(fingerprint) : null
    const block = blockDetails || fpBlock

    if (!block) {
      return NextResponse.json({ blocked: false, unblockAt: 0, blockHours: 0 })
    }
    const unblockAt = Number(block.unblock_at) || 0
    // Permanent block: unblockAt === 0 means never expires
    if (unblockAt === 0) {
      return NextResponse.json({ blocked: true, unblockAt: 0, blockHours: 0, permanent: true })
    }
    const remainingMs = unblockAt - Date.now()
    // If timed block expired, treat as unblocked (DB cleanup happens on next write)
    if (remainingMs <= 0) {
      return NextResponse.json({ blocked: false, unblockAt: 0, blockHours: 0 })
    }
    const blockHours = Math.max(1, Math.ceil(remainingMs / 3_600_000))
    return NextResponse.json({ blocked: true, unblockAt, blockHours })
  } catch {
    return NextResponse.json({ blocked: false, unblockAt: 0, blockHours: 0 })
  }
}
