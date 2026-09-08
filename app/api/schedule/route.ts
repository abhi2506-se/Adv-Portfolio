/**
 * POST /api/schedule   — visitor submits a scheduling request
 * GET  /api/schedule   — admin lists all requests (auth required)
 */
import { NextRequest, NextResponse } from 'next/server'
import { srCreate, srList, ensureSchedulingTables } from '@/lib/scheduling-store'
import { notifyAllAdmins } from '@/lib/notifications'
import { requireAdmin } from '@/lib/require-admin'
import {
  meetingMailer, safeFromEmail, meetingAdminEmail,
  sendMeetingEmail, explainEmailError,
} from '@/lib/meeting-mailer'

export const dynamic = 'force-dynamic'

const PURPOSE_LABEL: Record<string, string> = {
  interview:    '💼 Interview',
  consultation: '💡 Consultation',
  freelance:    '🎯 Freelance Project',
  other:        '📅 Meeting',
}

const APP = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ''

/* ── POST ──────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    await ensureSchedulingTables()
    const body = await req.json()
    const { name, email, company, role, purpose, message,
            preferred_date, timezone, platform, duration_mins } = body

    /* Validation */
    if (!name?.trim() || !email?.trim() || !preferred_date || !purpose) {
      return NextResponse.json({ error: 'name, email, preferred_date and purpose are required' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (new Date(preferred_date) <= new Date()) {
      return NextResponse.json({ error: 'Please select a future date & time' }, { status: 400 })
    }
    const validPurposes = ['interview','consultation','freelance','other']
    const validPlatforms = ['google_meet','zoom','teams','jitsi']
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 })
    }

    const req_data = await srCreate({
      name: name.trim(), email: email.trim(),
      company: company?.trim() || undefined,
      role: role?.trim() || undefined,
      purpose, message: message?.trim() || undefined,
      preferred_date,
      timezone: timezone || 'Asia/Kolkata',
      platform: validPlatforms.includes(platform) ? platform : 'google_meet',
      duration_mins: [30, 45, 60].includes(Number(duration_mins)) ? Number(duration_mins) : 30,
    })

    const label = PURPOSE_LABEL[purpose] ?? '📅 Meeting'
    const dateStr = new Date(preferred_date).toLocaleString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    /* ── Push notification to admin ──────────────────────────────────────── */
    try {
      await notifyAllAdmins({
        title: `New ${label} Request`,
        body: `${name} — ${dateStr}`,
        tag: `schedule-${req_data.id}`,
        url: '/admin/dashboard',
      })
    } catch {}

    /* ── Admin email ─────────────────────────────────────────────────────── */
    try {
      const resend = await meetingMailer()
      const to     = await meetingAdminEmail()
      const from   = await safeFromEmail()
      if (resend && to) {
        await sendMeetingEmail(resend, {
          from, to,
          subject: `${label} Request from ${name}`,
          html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;background:#0f172a;border-radius:14px;overflow:hidden;border:1px solid #1e293b;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:28px 32px 20px">
    <p style="font-size:32px;margin:0 0 6px">${label}</p>
    <h2 style="margin:0;font-size:20px;color:#fff">New Scheduling Request</h2>
    <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">Action required — review in admin panel</p>
  </div>
  <div style="padding:24px 32px">
    <table style="width:100%;border-collapse:collapse">
      <tr><td style="padding:7px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;width:110px">Name</td><td style="padding:7px 0;color:#e2e8f0;font-size:14px">${name}</td></tr>
      <tr><td style="padding:7px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Email</td><td style="padding:7px 0;color:#60a5fa;font-size:14px">${email}</td></tr>
      ${company ? `<tr><td style="padding:7px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Company</td><td style="padding:7px 0;color:#e2e8f0;font-size:14px">${company}${role ? ` · ${role}` : ''}</td></tr>` : ''}
      <tr><td style="padding:7px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Purpose</td><td style="padding:7px 0;color:#e2e8f0;font-size:14px">${label}</td></tr>
      <tr><td style="padding:7px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Date & Time</td><td style="padding:7px 0;color:#fff;font-size:14px;font-weight:700">${dateStr}</td></tr>
      <tr><td style="padding:7px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Timezone</td><td style="padding:7px 0;color:#e2e8f0;font-size:14px">${timezone || 'Asia/Kolkata'}</td></tr>
      <tr><td style="padding:7px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Platform</td><td style="padding:7px 0;color:#e2e8f0;font-size:14px">${platform || 'Google Meet'}</td></tr>
      <tr><td style="padding:7px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Duration</td><td style="padding:7px 0;color:#e2e8f0;font-size:14px">${duration_mins || 30} minutes</td></tr>
      ${message ? `<tr><td style="padding:7px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;vertical-align:top">Message</td><td style="padding:7px 0;color:#cbd5e1;font-size:13px">${message}</td></tr>` : ''}
    </table>
    <div style="margin-top:20px;text-align:center">
      <a href="${APP}/admin/dashboard" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Review &amp; Approve →</a>
    </div>
  </div>
  <div style="padding:12px 32px;border-top:1px solid #1e293b;text-align:center">
    <p style="margin:0;color:#334155;font-size:11px">Request ID: ${req_data.id}</p>
  </div>
</div>`
        })
        console.log('[schedule] Admin notification email sent to:', to)
      }
    } catch (e) {
      const from = await safeFromEmail()
      console.error('[schedule] admin email failed:', explainEmailError(e, from), e)
    }

    /* ── Visitor confirmation ─────────────────────────────────────────────── */
    try {
      const resend = await meetingMailer()
      const from   = await safeFromEmail()
      if (resend) {
        await sendMeetingEmail(resend, {
          from, to: email.trim(),
          subject: `✅ ${label} Request Received!`,
          html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:28px 32px 20px">
    <p style="font-size:36px;margin:0 0 8px">${label}</p>
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Request Received!</h1>
    <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">You'll be notified once it's approved</p>
  </div>
  <div style="padding:24px 32px">
    <p style="color:#cbd5e1">Hi <strong style="color:#fff">${name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px">Your scheduling request for <strong style="color:#60a5fa">${dateStr}</strong> has been received and is currently under review. You'll receive a confirmation email with your meeting link once approved — usually within a few hours.</p>
    <div style="background:#0f172a;border:1px solid #1e40af;border-radius:10px;padding:18px;margin:18px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;width:100px">Purpose</td><td style="padding:6px 0;color:#e2e8f0">${label}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Date</td><td style="padding:6px 0;color:#e2e8f0;font-weight:600">${dateStr}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Duration</td><td style="padding:6px 0;color:#e2e8f0">${duration_mins || 30} minutes</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Status</td><td style="padding:6px 0;color:#fbbf24;font-weight:700">⏳ Pending Review</td></tr>
      </table>
    </div>
    <p style="color:#64748b;font-size:13px">Thank you for reaching out. Looking forward to connecting!</p>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center">
    <p style="margin:0;color:#475569;font-size:12px"><strong style="color:#94a3b8">Abhishek Singh</strong></p>
    <p style="margin:4px 0 0;color:#334155;font-size:10px">Request ID: ${req_data.id}</p>
  </div>
</div>`
        })
        console.log('[schedule] Visitor confirmation email sent to:', email)
      }
    } catch (e) {
      const from = await safeFromEmail()
      console.error('[schedule] visitor email failed:', explainEmailError(e, from), e)
    }

    return NextResponse.json({ success: true, id: req_data.id }, { status: 201 })
  } catch (e) {
    console.error('[schedule POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/* ── GET (admin) ───────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  // NOTE: previously this only checked check.ok, which /api/admin/session-check
  // always returns true for (it answers 200 with {valid:false} rather than a
  // non-2xx status) — meaning this endpoint leaked every requester's name,
  // email and company to anyone, logged in or not. Fixed to check the actual
  // session cookie.
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = req.nextUrl.searchParams.get('status') as any
  const list = await srList(status || undefined)
  const stats = await (await import('@/lib/scheduling-store')).srStats()
  return NextResponse.json({ requests: list, stats })
}
