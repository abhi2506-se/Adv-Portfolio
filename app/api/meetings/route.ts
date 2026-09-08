/**
 * POST /api/meetings — public: submit a Recruiter/Interview or
 *      Freelance/Consultation request against an open slot.
 * GET  /api/meetings — admin: list requests + stats.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  mrCreate, mrList, mrStats, mrDelete,
  msGet, msTryBook, msFree, isSlotInPast, msCreateAndBookDynamic, msSetStatus,
  type MeetingType, type MeetingPlatform,
} from '@/lib/meeting-store'
import { generateAvailableSlots } from '@/lib/availability-store'
import { checkOfficialDomain } from '@/lib/recruiter-verification'
import { rvCheckToken } from '@/lib/meeting-store'
import { meetingMailer, safeFromEmail, meetingAdminEmail, explainEmailError, sendMeetingEmail } from '@/lib/meeting-mailer'
import { notifyAllAdmins } from '@/lib/notifications'
import { requireAdmin } from '@/lib/require-admin'
import { mrSetEmailError, mrAppendEmailError } from '@/lib/meeting-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_PLATFORMS: MeetingPlatform[] = ['google_meet', 'zoom', 'teams']
const PLATFORM_LABEL: Record<string, string> = { google_meet: 'Google Meet', zoom: 'Zoom', teams: 'Microsoft Teams' }

function fmtDateTime(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time}:00`)
    return d.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return `${date} ${time}` }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const type: MeetingType = body.type === 'freelance' ? 'freelance' : 'recruiter'
    const full_name = (body.full_name || '').trim()
    const email = (body.email || '').trim().toLowerCase()
    const phone = (body.phone || '').trim() || null
    const details = (body.details || '').trim() || null
    const slot_id = body.slot_id
    const platform: MeetingPlatform = body.platform
    const company_name = (body.company_name || '').trim() || null
    const job_role = (body.job_role || '').trim() || null
    const verification_token = body.verification_token || null

    // ── Dynamic booking fields (new windows-based engine) ──────────────────
    // The new booking UI sends { slot_date, start_time, duration_minutes }
    // instead of a pre-existing slot_id — the slot is computed on the fly
    // from availability windows and only materialized into a real
    // meeting_slots row once we've confirmed it's actually still free.
    const dynamicDate = body.slot_date as string | undefined
    const dynamicStart = body.start_time as string | undefined
    const dynamicDuration = Number(body.duration_minutes)

    if (!full_name) return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    if (!email)     return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    if (!slot_id && !(dynamicDate && dynamicStart && [15, 30, 45, 60].includes(dynamicDuration))) {
      return NextResponse.json({ error: 'Please select a date and time' }, { status: 400 })
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: 'Please select a valid meeting platform' }, { status: 400 })
    }

    if (type === 'recruiter') {
      if (!company_name) return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
      if (!job_role)      return NextResponse.json({ error: 'Position / job role is required' }, { status: 400 })

      // Defense in depth — never trust the client alone for the domain check
      const domainCheck = await checkOfficialDomain(email, company_name)
      if (!domainCheck.valid) {
        return NextResponse.json({ error: domainCheck.reason }, { status: 400 })
      }
      if (!verification_token || !(await rvCheckToken(email, verification_token))) {
        return NextResponse.json({ error: 'This email hasn\u2019t been verified yet. Please verify it with the code we emailed you before submitting.' }, { status: 403 })
      }
    } else {
      if (!details) return NextResponse.json({ error: 'Please describe your project or consultation needs' }, { status: 400 })
    }

    let slot: { id: string; slot_date: string; start_time: string; end_time: string; platforms: string }
    let isNewDynamicSlot = false

    if (slot_id) {
      // ── Legacy path: a pre-existing meeting_slots row ──────────────────
      const existingSlot = await msGet(slot_id)
      if (!existingSlot) return NextResponse.json({ error: 'That slot no longer exists. Please pick another.' }, { status: 404 })
      if (existingSlot.status !== 'open') {
        return NextResponse.json({ error: 'That slot was just booked by someone else. Please pick another time.' }, { status: 409 })
      }
      if (await isSlotInPast(existingSlot.slot_date, existingSlot.start_time)) {
        return NextResponse.json({ error: 'That time slot has already passed. Please pick another time.' }, { status: 409 })
      }
      if (!existingSlot.platforms.split(',').includes(platform)) {
        return NextResponse.json({ error: `${PLATFORM_LABEL[platform]} isn\u2019t available for this slot.` }, { status: 400 })
      }
      slot = existingSlot
    } else {
      // ── New path: dynamically generated slot — re-verify it's still
      // actually free (per current windows + bookings) before materializing
      // a row for it. This re-check is what prevents double-booking even
      // though the slot didn't exist as a row until this exact request.
      const stillAvailable = await generateAvailableSlots(dynamicDate!, dynamicDuration)
      const match = stillAvailable.find(s => s.start_time === dynamicStart)
      if (!match) {
        return NextResponse.json({ error: 'That time is no longer available. Please pick another slot.' }, { status: 409 })
      }
      const created = await msCreateAndBookDynamic({
        slot_date: dynamicDate!, start_time: match.start_time, end_time: match.end_time,
        platforms: VALID_PLATFORMS.join(','),
      })
      if (!created) {
        return NextResponse.json({ error: 'That time was just booked by someone else. Please pick another slot.' }, { status: 409 })
      }
      slot = created
      isNewDynamicSlot = true
    }

    const request = await mrCreate({
      type, full_name, email, company_name, job_role, phone, details,
      slot_id: slot.id, slot_date: slot.slot_date, slot_time: slot.start_time, platform,
      verification_token, visitor_timezone: (body.visitor_timezone || '').trim() || null,
    })

    if (isNewDynamicSlot) {
      // Slot was created with status='booked' but no request_id yet — attach it now.
      await msSetStatus(slot.id, 'booked', request.id)
    } else {
      const booked = await msTryBook(slot.id, request.id)
      if (!booked) {
        await mrDelete(request.id)
        return NextResponse.json({ error: 'That slot was just booked by someone else. Please pick another time.' }, { status: 409 })
      }
    }

    const dateStr = fmtDateTime(slot.slot_date, slot.start_time)
    const label = type === 'recruiter' ? 'Interview Request' : 'Consultation Request'

    // Show the visitor their own local time too, if it differs from the
    // scheduling (admin) timezone — this is the "timezone conversion based
    // on attendee location" requirement. Computed from the same UTC instant,
    // so it's always correct regardless of DST in either zone.
    const visitorTz = (body.visitor_timezone || '').trim() || null
    let visitorLocalStr: string | null = null
    if (visitorTz) {
      try {
        const meetingInstant = new Date(`${slot.slot_date}T${slot.start_time}:00`)
        visitorLocalStr = meetingInstant.toLocaleString('en-US', {
          timeZone: visitorTz, weekday: 'long', year: 'numeric', month: 'long',
          day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
        })
      } catch { visitorLocalStr = null }
    }

    /* ── Visitor confirmation email ───────────────────────────────────────── */
    try {
      const resend = await meetingMailer()
      const from = await safeFromEmail()
      if (resend) {
        await sendMeetingEmail(resend, {
          from, to: email,
          subject: `✅ ${label} Received — ${dateStr}`,
          html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:28px 32px 20px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${label} Received!</h1>
    <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">You'll hear back once it's reviewed</p>
  </div>
  <div style="padding:24px 32px">
    <p style="color:#cbd5e1">Hi <strong style="color:#fff">${full_name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px">Your request for <strong style="color:#60a5fa">${dateStr}</strong> is pending review. You'll get a confirmation email with the meeting link once it's approved.</p>
    <div style="background:#0f172a;border:1px solid #1e40af;border-radius:10px;padding:18px;margin:18px 0">
      <table style="width:100%;border-collapse:collapse">
        ${company_name ? `<tr><td style="padding:6px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase">Company</td><td style="padding:6px 0;color:#e2e8f0">${company_name}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;width:100px">Date</td><td style="padding:6px 0;color:#e2e8f0;font-weight:600">${dateStr}</td></tr>
        ${visitorLocalStr ? `<tr><td style="padding:6px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase">Your time</td><td style="padding:6px 0;color:#93c5fd">${visitorLocalStr}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase">Platform</td><td style="padding:6px 0;color:#e2e8f0">${PLATFORM_LABEL[platform]}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase">Status</td><td style="padding:6px 0;color:#fbbf24;font-weight:700">⏳ Pending Review</td></tr>
      </table>
    </div>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center">
    <p style="margin:0;color:#475569;font-size:12px"><strong style="color:#94a3b8">Abhishek Singh</strong></p>
  </div>
</div>`,
        })
        await mrSetEmailError(request.id, null)
      } else {
        await mrSetEmailError(request.id, 'Email not delivered: SMTP_USER/SMTP_PASS not configured. Set Gmail SMTP env vars.')
      }
    } catch (e) {
      const from = await safeFromEmail()
      const msg = explainEmailError(e, from)
      console.error('[meetings POST] visitor email failed:', msg, e)
      await mrSetEmailError(request.id, msg).catch(() => {})
    }

    /* ── Admin notification (push + best-effort email) ───────────────────── */
    try {
      await notifyAllAdmins({
        title: `📅 New ${label}`,
        body: `${full_name}${company_name ? ` (${company_name})` : ''} — ${dateStr}`,
        url: '/admin/meetings',
        tag: 'meeting-request',
      })
    } catch (e) { console.error('[meetings POST] push notify failed:', e) }

    try {
      const resend = await meetingMailer()
      const from = await safeFromEmail()
      const adminEmail = await meetingAdminEmail()
      if (resend && adminEmail) {
        await sendMeetingEmail(resend, {
          from, to: adminEmail,
          subject: `📅 New ${label} — ${full_name}`,
          html: `<p>New ${label.toLowerCase()} from <strong>${full_name}</strong>${company_name ? ` at ${company_name}` : ''} for ${dateStr}.</p><p><a href="${process.env.NEXTAUTH_URL || ''}/admin/meetings">Review in admin dashboard →</a></p>`,
        })
      } else if (!adminEmail) {
        console.error('[meetings POST] admin email skipped: no admin notification email configured (set "Notification Email" in Settings or ADMIN_EMAIL env var)')
        await mrAppendEmailError(request.id, 'Admin notification', 'No admin notification email configured — set it in Settings → Email or the ADMIN_EMAIL env var.')
      }
    } catch (e) {
      const from = await safeFromEmail()
      const msg = explainEmailError(e, from)
      console.error('[meetings POST] admin email failed:', msg, e)
      await mrAppendEmailError(request.id, 'Admin notification', msg).catch(() => {})
    }

    return NextResponse.json({ success: true, request: { id: request.id, status: request.status } })
  } catch (e) {
    console.error('[meetings POST] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const status = (req.nextUrl.searchParams.get('status') as any) || undefined
  const type = (req.nextUrl.searchParams.get('type') as any) || undefined
  const [requests, stats] = await Promise.all([mrList(status, type), mrStats()])
  return NextResponse.json({ requests, stats })
}
