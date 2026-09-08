/**
 * GET /api/cron/reminders
 *
 * Processes meeting reminders — sends email 30 min before each meeting.
 *
 * Set up as a Vercel Cron Job (vercel.json):
 *   { "crons": [{ "path": "/api/cron/reminders", "schedule": "* * * * *" }] }
 *
 * The route is protected by CRON_SECRET env var.
 */
import { NextRequest, NextResponse } from 'next/server'
import { dbGetDueReminders, dbMarkReminderSent, dbMarkReminderFailed } from '@/lib/db'
import { sendMeetingEmail, safeFromEmail } from '@/lib/meeting-mailer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function platformLabel(platform: string): string {
  return ({ google_meet: 'Google Meet', zoom: 'Zoom', teams: 'Microsoft Teams', jitsi: 'Jitsi Meet', any: 'Video Call' } as Record<string, string>)[platform] ?? 'Video Call'
}
function platformIcon(platform: string): string {
  return ({ google_meet: '🟢', zoom: '🔵', teams: '🟣', jitsi: '🎥', any: '📹' } as Record<string, string>)[platform] ?? '📹'
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: { id: string; bookingId: string; status: string; error?: string }[] = []

  try {
    const dueReminders = await dbGetDueReminders()
    if (dueReminders.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No due reminders', results: [] })
    }

    const fromEmail = await safeFromEmail()

    for (const reminder of dueReminders) {
      try {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
          await dbMarkReminderFailed(reminder.id, 'Gmail SMTP not configured (SMTP_USER/SMTP_PASS missing)')
          results.push({ id: reminder.id, bookingId: reminder.booking_id, status: 'failed', error: 'No email provider' })
          continue
        }

        const meetingDate = new Date(reminder.proposed_date)
        const formattedDate = meetingDate.toLocaleString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
        const typeLabel = reminder.type === 'interview' ? 'Interview' : 'Meeting'
        const platLabel = platformLabel(reminder.platform ?? 'any')
        const platIcon = platformIcon(reminder.platform ?? 'any')
        const joinButton = reminder.meeting_link && reminder.meeting_link !== 'PENDING_LINK'
          ? `<div style="text-align:center;margin:20px 0">
              <a href="${reminder.meeting_link}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);color:#0f172a;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none">
                ${platIcon} Join ${platLabel} Now
              </a>
              <p style="margin:10px 0 0;color:#64748b;font-size:11px">
                Link: <a href="${reminder.meeting_link}" style="color:#60a5fa">${reminder.meeting_link}</a>
              </p>
            </div>`
          : `<div style="background:#1e3a5f22;border:1px solid #1e40af44;border-radius:10px;padding:16px;margin:20px 0">
              <p style="margin:0;color:#fbbf24;font-size:14px">⚠️ Meeting link not set yet. Please check your inbox for an updated email.</p>
            </div>`

        await sendMeetingEmail(null, {
          from: fromEmail,
          to: reminder.email,
          subject: `⏰ Reminder: Your ${typeLabel} starts in 30 minutes — ${formattedDate}`,
          html: `
            <!DOCTYPE html>
            <html lang="en">
            <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif">
              <div style="max-width:580px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;border:2px solid #f59e0b44">
                <div style="background:linear-gradient(135deg,#f59e0b22,#0f172a);padding:32px 32px 24px;border-bottom:1px solid #f59e0b33">
                  <div style="font-size:40px;margin-bottom:8px">⏰</div>
                  <h1 style="margin:0;color:#fbbf24;font-size:22px;font-weight:700">Starting in 30 Minutes!</h1>
                  <p style="margin:6px 0 0;color:#94a3b8;font-size:14px">Your ${typeLabel.toLowerCase()} is about to begin</p>
                </div>
                <div style="padding:28px 32px">
                  <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px">
                    Hi <strong style="color:#f1f5f9">${reminder.name}</strong>,
                  </p>
                  <div style="background:#0f172a;border:1px solid #f59e0b33;border-radius:12px;padding:20px;margin-bottom:20px">
                    <table style="width:100%;border-collapse:collapse">
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;width:120px">Type</td>
                        <td style="padding:8px 0;color:#e2e8f0;font-size:14px">${typeLabel}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Time</td>
                        <td style="padding:8px 0;color:#fbbf24;font-size:14px;font-weight:700">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Timezone</td>
                        <td style="padding:8px 0;color:#e2e8f0;font-size:14px">${reminder.timezone}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">Platform</td>
                        <td style="padding:8px 0;color:#e2e8f0;font-size:14px">${platIcon} ${platLabel}</td>
                      </tr>
                    </table>
                  </div>
                  ${joinButton}
                  <div style="background:#0f172a22;border:1px solid #1e293b;border-radius:10px;padding:14px">
                    <p style="margin:0;color:#64748b;font-size:12px">
                      💡 <strong style="color:#94a3b8">Quick Tips:</strong>
                      Test your camera & microphone now • Use a quiet space • Be ready 2 minutes early
                    </p>
                  </div>
                </div>
                <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center">
                  <p style="margin:0;color:#475569;font-size:12px">
                    See you soon! — <strong style="color:#94a3b8">Abhishek Singh</strong>
                  </p>
                  <p style="margin:6px 0 0;color:#334155;font-size:10px">Booking ID: ${reminder.booking_id}</p>
                </div>
              </div>
            </body>
            </html>
          `,
        })

        await dbMarkReminderSent(reminder.id)
        results.push({ id: reminder.id, bookingId: reminder.booking_id, status: 'sent' })
        console.log(`[reminders] Sent reminder for booking ${reminder.booking_id} to ${reminder.email}`)
      } catch (e: any) {
        const errMsg = e?.message || String(e)
        await dbMarkReminderFailed(reminder.id, errMsg)
        results.push({ id: reminder.id, bookingId: reminder.booking_id, status: 'failed', error: errMsg })
        console.error(`[reminders] Failed for ${reminder.booking_id}:`, e)
      }
    }

    return NextResponse.json({
      processed: results.length,
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    })
  } catch (e) {
    console.error('[reminders cron] Error:', e)
    return NextResponse.json({ error: 'Cron job failed', details: String(e) }, { status: 500 })
  }
}
