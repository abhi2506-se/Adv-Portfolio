/**
 * GET    /api/meetings/[id]  — public: fetch a single request (status page)
 * PATCH  /api/meetings/[id]  — admin: approve | reject | reschedule
 * DELETE /api/meetings/[id]  — admin: delete
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  mrGet, mrApprove, mrReject, mrReschedule, mrDelete, mrSetEmailError, mrAppendEmailError,
  msGet, msFree, msTryBook, maLog, ceCreate, mrmScheduleFor, mrmCancelForRequest,
  isSlotInPast, slotDurationMinutes,
} from '@/lib/meeting-store'
import { generateMeetingLink } from '@/lib/meeting-link-generators'
import { meetingMailer, safeFromEmail, meetingAdminEmail, meetingTimezone, explainEmailError, sendMeetingEmail } from '@/lib/meeting-mailer'
import { buildIcs, icsBuffer, buildGoogleCalendarUrl, buildOutlookCalendarUrl } from '@/lib/ics'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const PLATFORM_LABEL: Record<string, string> = { google_meet: 'Google Meet', zoom: 'Zoom', teams: 'Microsoft Teams' }

function fmtDateTime(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time}:00`)
    return d.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return `${date} ${time}` }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const request = await mrGet(id)
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { admin_notes, verification_token, email_error, ...safe } = request as any
  return NextResponse.json({ request: safe })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  // IMPORTANT: this entire handler used to have no top-level try/catch, so
  // any unexpected error (a DB hiccup, a bad date, etc.) would crash the
  // route and the client would receive an empty body, surfacing as
  // "Unexpected end of JSON input" instead of a real error message. Every
  // path below now always returns valid JSON.
  try {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const { action, rejection_reason, admin_notes, manual_link, new_slot_id } = body

  const existing = await mrGet(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const label = existing.type === 'recruiter' ? 'Interview' : 'Consultation'
  const from = await safeFromEmail()
  const tz = await meetingTimezone()

  /* ── APPROVE ───────────────────────────────────────────────────────────── */
  if (action === 'approve') {
    const meetingDateTimeIso = `${existing.slot_date}T${existing.slot_time}:00`
    // Use the *actual* duration of the slot the visitor booked (15/30/45/60
    // min), instead of a hardcoded value — otherwise the calendar invite and
    // the Google Meet/Zoom/Teams event end up the wrong length.
    const bookedSlot = existing.slot_id ? await msGet(existing.slot_id) : null
    const durationMinutes = bookedSlot ? slotDurationMinutes(bookedSlot.start_time, bookedSlot.end_time) : 30
    let link = manual_link?.trim() || ''
    let usedApi = true
    if (!link) {
      const result = await generateMeetingLink({
        name: existing.full_name, email: existing.email,
        proposed_date: meetingDateTimeIso, timezone: tz,
        type: existing.type === 'recruiter' ? 'interview' : 'consultation',
        platform: existing.platform,
        durationMinutes,
      })
      link = result.link
      usedApi = result.usedApi
    }

    // Build a universal .ics calendar invite — works regardless of which
    // calendar provider the requester uses, and regardless of whether
    // Google Calendar API credentials are configured. If Google credentials
    // *are* configured, generateMeetingLink already created a real Google
    // Calendar event with the requester listed as an attendee (Google emails
    // them an invite they can accept with one click). The .ics attachment
    // covers everyone else and is sent as a belt-and-suspenders guarantee.
    const icsOpts = {
      uid: `${id}@portfolio-scheduler`,
      title: `${label} — ${existing.full_name}${existing.company_name ? ` (${existing.company_name})` : ''}`,
      description: `${label} via ${PLATFORM_LABEL[existing.platform] ?? existing.platform}\nLink: ${link}`,
      startIso: meetingDateTimeIso,
      durationMinutes,
      location: link,
      organizerEmail: (await safeFromEmail()).match(/<(.+)>/)?.[1] || 'noreply@example.com',
      organizerName: 'Abhishek Singh',
      attendeeEmail: existing.email,
      attendeeName: existing.full_name,
    }
    const ics = buildIcs(icsOpts)
    const googleCalUrl = buildGoogleCalendarUrl(icsOpts)
    const outlookCalUrl = buildOutlookCalendarUrl(icsOpts)

    // Same attendee-local-time conversion as the initial request email —
    // recomputed at approval time in case the admin's scheduling timezone
    // setting has since changed.
    let visitorLocalStr: string | null = null
    if (existing.visitor_timezone) {
      try {
        visitorLocalStr = new Date(meetingDateTimeIso).toLocaleString('en-US', {
          timeZone: existing.visitor_timezone, weekday: 'long', year: 'numeric', month: 'long',
          day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
        })
      } catch { visitorLocalStr = null }
    }

    const approved = await mrApprove(id, { meeting_link: link, admin_notes })
    await ceCreate({ request_id: id, provider: 'ics', ics_uid: `${id}@portfolio-scheduler`, html_link: link })
    await maLog({ request_id: id, action: 'approved', performed_by: 'admin' })
    await mrmScheduleFor(id, meetingDateTimeIso)

    const dateStr = fmtDateTime(existing.slot_date, existing.slot_time)
    try {
      const resend = await meetingMailer()
      if (resend) {
        await sendMeetingEmail(resend, {
          from, to: existing.email,
          subject: `✅ ${label} Confirmed — ${dateStr}`,
          html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:28px 32px 20px">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${label} Confirmed! ✅</h1>
    <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">Your meeting is all set</p>
  </div>
  <div style="padding:24px 32px">
    <p style="color:#cbd5e1">Hi <strong style="color:#fff">${existing.full_name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px">Your request has been <strong style="color:#4ade80">approved</strong>. Here's everything you need:</p>
    <div style="background:#0f172a;border:1px solid #1e40af;border-radius:12px;padding:20px;margin:16px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;width:110px">Date &amp; Time</td><td style="padding:8px 0;color:#fff;font-weight:700">${dateStr}</td></tr>
        ${visitorLocalStr ? `<tr><td style="padding:8px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase">Your time</td><td style="padding:8px 0;color:#93c5fd">${visitorLocalStr}</td></tr>` : ''}
        <tr><td style="padding:8px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase">Duration</td><td style="padding:8px 0;color:#e2e8f0">${durationMinutes} minutes</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase">Platform</td><td style="padding:8px 0;color:#e2e8f0">${PLATFORM_LABEL[existing.platform] ?? existing.platform}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:20px 0">
      <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">🎥 Join Meeting</a>
      <p style="margin:10px 0 0;color:#475569;font-size:11px">Or copy: <a href="${link}" style="color:#60a5fa">${link}</a></p>
    </div>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:16px 0">
      <p style="margin:0 0 10px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">📅 Add to Your Calendar</p>
      <p style="margin:0 0 10px;color:#64748b;font-size:12px">A calendar invite (.ics) is attached to this email — open it to add the event to any calendar app. Or use the buttons below:</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="${googleCalUrl}" style="display:inline-block;background:#1a73e8;color:#fff;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">📅 Google Calendar</a>
        <a href="${outlookCalUrl}" style="display:inline-block;background:#0078d4;color:#fff;padding:9px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">📅 Outlook</a>
      </div>
      <p style="margin:10px 0 0;color:#475569;font-size:11px">Apple Calendar users: open the attached <strong>invite.ics</strong> file.</p>
    </div>
    <p style="color:#64748b;font-size:13px">You'll also get a reminder email 24 hours and 1 hour before the meeting.</p>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center">
    <p style="margin:0;color:#475569;font-size:12px">Looking forward to it!<br/><strong style="color:#94a3b8">Abhishek Singh</strong></p>
  </div>
</div>`,
          // Use Buffer (not base64 string) — nodemailer requires Buffer for binary
          // attachments. Passing a base64 string causes "Unable to load event" in
          // calendar apps because nodemailer re-encodes it as UTF-8 text.
          attachments: [{ filename: 'invite.ics', content: icsBuffer(ics), contentType: 'text/calendar; method=REQUEST; charset=utf-8' }],
        })
        await mrSetEmailError(id, null)

        // Best-effort: also notify the admin's own inbox with the same details
        const adminEmail = await meetingAdminEmail()
        if (adminEmail) {
          try {
            await sendMeetingEmail(resend, {
              from, to: adminEmail,
              subject: `✅ ${label} approved — ${existing.full_name}`,
              html: `<p>Approved: <strong>${existing.full_name}</strong>${existing.company_name ? ` (${existing.company_name})` : ''} — ${dateStr} via ${PLATFORM_LABEL[existing.platform]}.</p><p>Link: <a href="${link}">${link}</a></p>`,
              attachments: [{ filename: 'invite.ics', content: icsBuffer(ics), contentType: 'text/calendar; method=REQUEST; charset=utf-8' }],
            })
          } catch (adminErr) {
            const adminMsg = explainEmailError(adminErr, from)
            console.error('[meetings approve] admin notification failed:', adminMsg, adminErr)
            await mrAppendEmailError(id, 'Admin notification', adminMsg).catch(() => {})
          }
        }
      } else {
        await mrSetEmailError(id, 'Email not delivered: SMTP_USER/SMTP_PASS not configured. Set Gmail SMTP env vars.')
      }
    } catch (e) {
      const msg = explainEmailError(e, from)
      console.error('[meetings approve] email error:', msg, e)
      await mrSetEmailError(id, msg).catch(() => {})
    }

    return NextResponse.json({ success: true, request: approved, link, usedApi })
  }

  /* ── REJECT ────────────────────────────────────────────────────────────── */
  if (action === 'reject') {
    if (!rejection_reason?.trim()) {
      return NextResponse.json({ error: 'A rejection reason is required' }, { status: 400 })
    }
    const rejected = await mrReject(id, rejection_reason.trim(), admin_notes)
    await msFree(existing.slot_id)
    await mrmCancelForRequest(id)
    await maLog({ request_id: id, action: 'rejected', reason: rejection_reason.trim(), performed_by: 'admin' })

    try {
      const resend = await meetingMailer()
      if (resend) {
        await sendMeetingEmail(resend, {
          from, to: existing.email,
          subject: `Update on your ${label} request`,
          html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#7f1d1d,#0f172a);padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">Update on Your Request</h1>
  </div>
  <div style="padding:24px 28px">
    <p style="color:#cbd5e1">Hi <strong style="color:#fff">${existing.full_name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px">Unfortunately I'm unable to accommodate your ${label.toLowerCase()} request at this time.</p>
    <div style="background:#450a0a22;border:1px solid #7f1d1d44;border-radius:10px;padding:14px;margin:16px 0"><p style="margin:0;color:#fca5a5;font-size:14px"><strong>Reason:</strong> ${rejection_reason.trim()}</p></div>
    <p style="color:#94a3b8;font-size:14px">Feel free to submit a new request for a different time.</p>
  </div>
</div>`,
        })
        await mrSetEmailError(id, null)
      } else {
        await mrSetEmailError(id, 'Email not delivered: SMTP_USER/SMTP_PASS not configured. Set Gmail SMTP env vars.')
      }
    } catch (e) {
      const msg = explainEmailError(e, from)
      console.error('[meetings reject] email error:', msg, e)
      await mrSetEmailError(id, msg).catch(() => {})
    }
    return NextResponse.json({ success: true, request: rejected })
  }

  /* ── RESCHEDULE ────────────────────────────────────────────────────────── */
  if (action === 'reschedule') {
    if (!new_slot_id) return NextResponse.json({ error: 'new_slot_id is required' }, { status: 400 })
    const newSlot = await msGet(new_slot_id)
    if (!newSlot) return NextResponse.json({ error: 'New slot not found' }, { status: 404 })
    if (newSlot.status !== 'open') return NextResponse.json({ error: 'That slot is not available' }, { status: 409 })
    if (await isSlotInPast(newSlot.slot_date, newSlot.start_time)) {
      return NextResponse.json({ error: 'That time slot has already passed. Pick a different time.' }, { status: 409 })
    }

    const booked = await msTryBook(new_slot_id, id)
    if (!booked) return NextResponse.json({ error: 'That slot was just taken. Pick another.' }, { status: 409 })

    const prevDate = existing.slot_date
    const prevTime = existing.slot_time
    await msFree(existing.slot_id)
    await mrmCancelForRequest(id)

    const rescheduled = await mrReschedule(id, {
      new_slot_id, new_date: newSlot.slot_date, new_time: newSlot.start_time, admin_notes,
    })
    await maLog({
      request_id: id, action: 'rescheduled', performed_by: 'admin',
      previous_date: prevDate, previous_time: prevTime,
      new_date: newSlot.slot_date, new_time: newSlot.start_time,
    })

    const dateStr = fmtDateTime(newSlot.slot_date, newSlot.start_time)
    try {
      const resend = await meetingMailer()
      if (resend) {
        await sendMeetingEmail(resend, {
          from, to: existing.email,
          subject: `🔄 Your ${label} request was rescheduled`,
          html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#7c3aed,#0f172a);padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">Your meeting was rescheduled</h1>
  </div>
  <div style="padding:24px 28px">
    <p style="color:#cbd5e1">Hi <strong style="color:#fff">${existing.full_name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px">Your ${label.toLowerCase()} has a new proposed time:</p>
    <div style="background:#0f172a;border:1px solid #4c1d95;border-radius:10px;padding:16px;margin:16px 0">
      <p style="margin:0;color:#fff;font-weight:700;font-size:15px">${dateStr}</p>
    </div>
    <p style="color:#94a3b8;font-size:14px">This is still pending your acceptance — I'll send a final confirmation with the meeting link once approved.</p>
  </div>
</div>`,
        })
        await mrSetEmailError(id, null)
      } else {
        await mrSetEmailError(id, 'Email not delivered: SMTP_USER/SMTP_PASS not configured. Set Gmail SMTP env vars.')
      }
    } catch (e) {
      const msg = explainEmailError(e, from)
      console.error('[meetings reschedule] email error:', msg, e)
      await mrSetEmailError(id, msg).catch(() => {})
    }
    return NextResponse.json({ success: true, request: rescheduled })
  }

  return NextResponse.json({ error: 'Invalid action. Use approve, reject, or reschedule.' }, { status: 400 })
  } catch (e) {
    console.error('[meetings PATCH] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const existing = await mrGet(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    await msFree(existing.slot_id)
    await mrmCancelForRequest(id)
    await mrDelete(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[meetings DELETE] error:', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Server error' }, { status: 500 })
  }
}
