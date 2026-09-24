import { NextRequest, NextResponse } from 'next/server'
import { dbSaveAppeal, dbGetAppeals, dbUpdateAppeal, dbUnblockIP, dbUnblockByFingerprint, dbGetBlockedByFingerprint } from '@/lib/db'
import { verifyToken } from '@/lib/admin-auth'
import nodemailer from 'nodemailer'
import { sendPushToAdmin } from '@/lib/notifications'
import { SUPPORT_FROM } from '@/lib/mail-identities'

const SESSION_COOKIE = 'portfolio_admin_session'

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  return cookie?.value && verifyToken(cookie.value)
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function sendAppealEmail(appeal: { user_name: string; user_email: string; comment: string; ip: string; fingerprint: string }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) return
  try {
    sendPushToAdmin({
      title: '📨 New Block Appeal',
      body: `${appeal.user_name || appeal.user_email || appeal.ip} has submitted a block appeal.`,
      tag: 'block-appeal',
      url: '/admin',
    }).catch(() => {})

    await transporter.sendMail({
      from: SUPPORT_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `📨 Block Appeal from ${appeal.user_name || appeal.user_email || appeal.ip}`,
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:16px 16px 0 0;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">📨 New Block Appeal</h1>
    <p style="margin:6px 0 0;color:#c4b5fd;font-size:14px;">A blocked user is requesting review of their block</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <div style="background:#0f172a;border:1px solid #7c3aed;border-radius:12px;padding:16px;margin-bottom:16px;">
      <p style="color:#c4b5fd;font-size:13px;margin:0;font-weight:700;">Name: ${appeal.user_name || 'Not provided'}</p>
      <p style="color:#94a3b8;font-size:13px;margin:8px 0 0;"><strong style="color:#e2e8f0;">Email:</strong> ${appeal.user_email || 'Not provided'}</p>
      <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;"><strong style="color:#e2e8f0;">IP:</strong> ${appeal.ip}</p>
      <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;"><strong style="color:#e2e8f0;">Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </div>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;">
      <p style="color:#94a3b8;font-size:12px;margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Appeal Message</p>
      <p style="color:#e2e8f0;font-size:14px;line-height:1.6;margin:0;">${appeal.comment.replace(/\n/g, '<br>')}</p>
    </div>
    <p style="color:#64748b;font-size:12px;margin-top:20px;">Login to your admin dashboard → Security → Appeals to review and take action.</p>
  </div>
</div></body></html>`,
    })
  } catch (e) { console.error('Appeal email error:', e) }
}

// Public POST — blocked user submits appeal
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_name, user_email, comment, fingerprint } = body
    if (!comment?.trim()) return NextResponse.json({ error: 'Comment is required' }, { status: 400 })

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || 'unknown'

    const appeal = {
      id: `ap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      ip,
      fingerprint: fingerprint || '',
      user_name: String(user_name || '').slice(0, 100),
      user_email: String(user_email || '').slice(0, 200),
      comment: String(comment).slice(0, 2000),
      created_at: Date.now(),
    }

    await dbSaveAppeal(appeal)
    sendAppealEmail(appeal).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// Admin GET — fetch all appeals
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const appeals = await dbGetAppeals(200)
    return NextResponse.json({ appeals })
  } catch {
    return NextResponse.json({ error: 'Failed', appeals: [] }, { status: 500 })
  }
}

// Admin PATCH — update appeal status (solve/reject/unblock)
export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { id, status, admin_note, ip, fingerprint } = body
    if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })

    await dbUpdateAppeal(id, status, admin_note || '')

    // If admin chose to unblock, remove from blocked_ips
    if (status === 'unblocked') {
      if (ip) await dbUnblockIP(ip).catch(() => {})
      if (fingerprint) await dbUnblockByFingerprint(fingerprint).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
