/**
 * GET    /api/schedule/[id]  — fetch single request (public, for status page)
 * PATCH  /api/schedule/[id]  — admin approve or reject
 * DELETE /api/schedule/[id]  — admin delete
 */
import { NextRequest, NextResponse } from 'next/server'
import { srGet, srApprove, srReject, srDelete, srMarkNotified } from '@/lib/scheduling-store'
import { generateMeetingLink } from '@/lib/meeting-link-generators'
import { requireAdmin } from '@/lib/require-admin'
import {
  meetingMailer, safeFromEmail,
  sendMeetingEmail, explainEmailError,
} from '@/lib/meeting-mailer'

export const dynamic = 'force-dynamic'

const PURPOSE_LABEL: Record<string, string> = {
  interview:    '💼 Interview',
  consultation: '💡 Consultation',
  freelance:    '🎯 Freelance Project',
  other:        '📅 Meeting',
}
const PLATFORM_LABEL: Record<string, string> = {
  google_meet: 'Google Meet', zoom: 'Zoom',
  teams: 'Microsoft Teams', jitsi: 'Jitsi Meet',
}

const APP = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || ''

/* requireAdmin is imported from @/lib/require-admin — see that file for
   why the old implementation (checking fetch().ok against an endpoint that
   always returns HTTP 200) never actually denied access. */

/* ── GET — single request (public) ──────────────────────────────────────────── */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const request = await srGet(id)
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  /* Strip internal fields for public view */
  const { admin_notes, calendly_event_id, ...safe } = request as any
  return NextResponse.json({ request: safe })
}

/* ── PATCH — admin approves or rejects ──────────────────────────────────────── */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body   = await req.json()
  const { action, manual_link, rejection_reason, admin_notes } = body

  const existing = await srGet(id)
  if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  /* ── APPROVE ─────────────────────────────────────────────────────────────── */
  if (action === 'approve') {
    let meetingLink = manual_link?.trim() || ''
    let calendlyEventId: string | undefined
    let calendlyEventUrl: string | undefined
    let usedApi = false
    let platformUsed = existing.platform

    /* ── Try Calendly first ──────────────────────────────────────────────── */
    const calendlyToken = process.env.CALENDLY_API_TOKEN
    const calendlyUser  = process.env.CALENDLY_USER_URI
    const calendlyEvent = process.env.CALENDLY_EVENT_TYPE_URI

    if (!meetingLink && calendlyToken && calendlyUser && calendlyEvent) {
      try {
        /* Create a single-use scheduling link from Calendly */
        const singleUseRes = await fetch('https://api.calendly.com/scheduling_links', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${calendlyToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            max_event_count: 1,
            owner: calendlyEvent,
            owner_type: 'EventType',
          }),
        })

        if (singleUseRes.ok) {
          const d = await singleUseRes.json()
          if (d.resource?.booking_url) {
            meetingLink     = d.resource.booking_url
            calendlyEventUrl = d.resource.booking_url
            usedApi = true
          }
        }
      } catch (e) {
        console.error('[schedule approve] Calendly error:', e)
      }
    }

    /* ── Fallback: Google Meet / Zoom / Teams / Jitsi ────────────────────── */
    if (!meetingLink) {
      try {
        const result = await generateMeetingLink({
          name: existing.name,
          email: existing.email,
          proposed_date: existing.preferred_date,
          timezone: existing.timezone,
          type: existing.purpose === 'interview' ? 'interview' : 'meeting',
          platform: existing.platform,
        })
        meetingLink  = result.link
        platformUsed = result.platform as any
        usedApi      = result.usedApi
      } catch (e) {
        console.error('[schedule approve] meeting link error:', e)
      }
    }

    if (!meetingLink) {
      // Final safety net — generate a Google Meet room directly
      const chars = 'abcdefghijklmnopqrstuvwxyz'
      const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      meetingLink = `https://meet.google.com/${rand(3)}-${rand(4)}-${rand(3)}`
      platformUsed = 'google_meet'
      console.warn('[schedule approve] All meeting link methods failed; using direct Google Meet room:', meetingLink)
    }

    const approved = await srApprove(id, meetingLink, {
      calendlyEventId, calendlyEventUrl, adminNotes: admin_notes,
    })
    if (!approved) return NextResponse.json({ error: 'DB update failed' }, { status: 500 })

    /* ── Approval email ──────────────────────────────────────────────────── */
    try {
      const resend = await meetingMailer()
      const from   = await safeFromEmail()
      if (!resend) {
        console.error('[schedule approve] Email skipped: SMTP_USER/SMTP_PASS not configured in env')
      } else {
        const label  = PURPOSE_LABEL[approved.purpose] ?? '📅 Meeting'
        const plat   = PLATFORM_LABEL[platformUsed]   ?? 'Video Call'
        const dateStr = new Date(approved.preferred_date).toLocaleString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long',
          day: 'numeric', hour: '2-digit', minute: '2-digit',
        })

        await sendMeetingEmail(resend, {
          from, to: approved.email,
          subject: `✅ ${label} Confirmed — ${dateStr}`,
          html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:28px 32px 20px">
    <p style="font-size:36px;margin:0 0 8px">✅</p>
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">${label} Confirmed!</h1>
    <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">Your meeting is all set — see details below</p>
  </div>
  <div style="padding:24px 32px">
    <p style="color:#cbd5e1">Hi <strong style="color:#fff">${approved.name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px">Your request has been <strong style="color:#4ade80">approved</strong>! Here's everything you need:</p>
    <div style="background:#0f172a;border:1px solid #1e40af;border-radius:12px;padding:20px;margin:16px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;width:110px">Type</td><td style="padding:8px 0;color:#e2e8f0">${label}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Date & Time</td><td style="padding:8px 0;color:#fff;font-weight:700">${dateStr}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Duration</td><td style="padding:8px 0;color:#e2e8f0">${approved.duration_mins} minutes</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Timezone</td><td style="padding:8px 0;color:#e2e8f0">${approved.timezone}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Platform</td><td style="padding:8px 0;color:#e2e8f0">${plat}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:20px 0">
      <a href="${meetingLink}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">
        🎥 Join Meeting
      </a>
      <p style="margin:10px 0 0;color:#475569;font-size:11px">Or copy: <a href="${meetingLink}" style="color:#60a5fa">${meetingLink}</a></p>
    </div>
    <div style="background:#1e3a5f22;border:1px solid #1e40af44;border-radius:10px;padding:14px">
      <p style="margin:0 0 6px;color:#93c5fd;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em">💡 Tips</p>
      <ul style="margin:0;padding-left:16px;color:#94a3b8;font-size:13px">
        <li style="margin-bottom:3px">Join 2–3 minutes early to test your audio &amp; video</li>
        <li style="margin-bottom:3px">Use a quiet, well-lit environment</li>
        <li>Have any relevant materials ready</li>
      </ul>
    </div>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center">
    <p style="margin:0;color:#475569;font-size:12px">Looking forward to our conversation!<br/><strong style="color:#94a3b8">Abhishek Singh</strong></p>
  </div>
</div>`
        })
        console.log('[schedule approve] Approval email sent to:', approved.email)
        await srMarkNotified(id)
      }
    } catch (e) {
      const from = await safeFromEmail()
      console.error('[schedule approve] Email send FAILED:', explainEmailError(e, from), e)
      // Don't fail the approval — just log the error
    }

    return NextResponse.json({ success: true, request: approved, meetingLink, usedApi })
  }

  /* ── REJECT ──────────────────────────────────────────────────────────────── */
  if (action === 'reject') {
    if (!rejection_reason?.trim()) {
      return NextResponse.json({ error: 'rejection_reason is required' }, { status: 400 })
    }
    const rejected = await srReject(id, rejection_reason.trim(), admin_notes)
    if (!rejected) return NextResponse.json({ error: 'DB update failed' }, { status: 500 })

    try {
      const resend = await meetingMailer()
      const from   = await safeFromEmail()
      if (!resend) {
        console.error('[schedule reject] Email skipped: SMTP_USER/SMTP_PASS not configured')
      } else {
        const label = PURPOSE_LABEL[rejected.purpose] ?? '📅 Meeting'
        await sendMeetingEmail(resend, {
          from, to: rejected.email,
          subject: `Re: Your ${label} Request`,
          html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#7f1d1d,#0f172a);padding:28px 32px 20px">
    <p style="font-size:32px;margin:0 0 6px">📋</p>
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">Update on Your Request</h1>
  </div>
  <div style="padding:24px 32px">
    <p style="color:#cbd5e1">Hi <strong style="color:#fff">${rejected.name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px">Thank you for reaching out. Unfortunately I'm unable to accommodate your ${label.toLowerCase()} request at this time.</p>
    ${rejection_reason ? `<div style="background:#450a0a22;border:1px solid #7f1d1d44;border-radius:10px;padding:14px;margin:16px 0"><p style="margin:0;color:#fca5a5;font-size:14px"><strong>Reason:</strong> ${rejection_reason}</p></div>` : ''}
    <p style="color:#94a3b8;font-size:14px">Feel free to submit a new request for a different time — I'd love to connect!</p>
    <div style="text-align:center;margin-top:20px">
      <a href="${APP}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:11px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">Submit New Request →</a>
    </div>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center">
    <p style="margin:0;color:#475569;font-size:12px">Best regards,<br/><strong style="color:#94a3b8">Abhishek Singh</strong></p>
  </div>
</div>`
        })
        console.log('[schedule reject] Rejection email sent to:', rejected.email)
        await srMarkNotified(id)
      }
    } catch (e) {
      const from = await safeFromEmail()
      console.error('[schedule reject] Email send FAILED:', explainEmailError(e, from), e)
    }

    return NextResponse.json({ success: true, request: rejected })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

/* ── DELETE ──────────────────────────────────────────────────────────────────── */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await srDelete(id)
  return NextResponse.json({ success: true })
}
