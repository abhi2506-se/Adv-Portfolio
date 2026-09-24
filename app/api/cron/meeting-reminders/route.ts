/**
 * GET /api/cron/meeting-reminders
 *
 * Sends 24-hour and 1-hour reminder emails for approved meetings created
 * through the new "Schedule Meeting / Interview" system. Separate from the
 * legacy /api/cron/reminders (which serves an older booking system).
 *
 * Vercel Cron (vercel.json): runs every 15 minutes, path
 * "/api/cron/meeting-reminders". See vercel.json for the schedule string.
 *
 * Protected by the same CRON_SECRET env var as the existing cron route.
 */
import { NextRequest, NextResponse } from 'next/server'
import { mrmGetDue, mrmMarkSent } from '@/lib/meeting-store'
import { meetingMailer, safeFromEmail, sendMeetingEmail } from '@/lib/meeting-mailer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PLATFORM_LABEL: Record<string, string> = { google_meet: 'Google Meet', zoom: 'Zoom', teams: 'Microsoft Teams' }

function fmtDateTime(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time}:00`)
    return d.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return `${date} ${time}` }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { id: string; status: string; error?: string }[] = []
  try {
    const due = await mrmGetDue(50) as any[]
    if (due.length === 0) return NextResponse.json({ processed: 0, results: [] })

    const resend = await meetingMailer()
    const from = await safeFromEmail()

    for (const r of due) {
      try {
        if (!resend) { results.push({ id: r.id, status: 'skipped', error: 'Gmail SMTP not configured (SMTP_USER/SMTP_PASS missing)' }); continue }
        const dateStr = fmtDateTime(r.slot_date, r.slot_time)
        const window = r.kind === '24h' ? 'tomorrow' : 'in 1 hour'
        await sendMeetingEmail(resend, {
          from, to: r.email,
          subject: `⏰ Reminder: your meeting is ${window} — ${dateStr}`,
          html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">⏰ Meeting Reminder</h1>
  </div>
  <div style="padding:24px 28px">
    <p style="color:#cbd5e1">Hi <strong style="color:#fff">${r.full_name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px">Just a reminder — your meeting is coming up ${window}:</p>
    <div style="background:#0f172a;border:1px solid #1e40af;border-radius:10px;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px;color:#fff;font-weight:700">${dateStr}</p>
      <p style="margin:0;color:#94a3b8;font-size:13px">${PLATFORM_LABEL[r.platform] ?? r.platform}</p>
    </div>
    ${r.meeting_link ? `<div style="text-align:center"><a href="${r.meeting_link}" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none">🎥 Join Meeting</a></div>` : ''}
  </div>
</div>`,
        })
        await mrmMarkSent(r.id)
        results.push({ id: r.id, status: 'sent' })
      } catch (e: any) {
        console.error('[meeting-reminders] send failed:', e)
        results.push({ id: r.id, status: 'failed', error: e?.message || String(e) })
      }
    }
    return NextResponse.json({ processed: results.length, results })
  } catch (e) {
    console.error('[meeting-reminders] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
