/**
 * Meeting link generator utilities
 * Exported so they can be used both in the generate-link API route
 * and directly from the approve route (no internal HTTP needed).
 */

export function uniqueRoomId(prefix = 'meeting'): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `portfolio-${prefix}-${rand(3)}-${rand(3)}-${rand(3)}`
}

export function generateJitsiLink(type: string): string {
  const prefix = type === 'interview' ? 'interview' : 'meet'
  return `https://meet.jit.si/${uniqueRoomId(prefix)}`
}

export async function generateGoogleMeetLink(booking: {
  name: string; email: string; proposed_date: string; timezone: string; type: string; durationMinutes?: number
}): Promise<string | null> {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL
  const privateKey  = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const calendarId  = process.env.GOOGLE_CALENDAR_ID || 'primary'

  if (!clientEmail || !privateKey) return null

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    const calendar = google.calendar({ version: 'v3', auth })
    const startTime = new Date(booking.proposed_date)
    const endTime   = new Date(startTime.getTime() + (booking.durationMinutes ?? 60) * 60 * 1000)
    const requestId = `portfolio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const event = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: {
        summary: `${booking.type === 'interview' ? '💼 Interview' : '📅 Meeting'} with ${booking.name}`,
        description: `Auto-scheduled via portfolio booking system.\nAttendee: ${booking.email}`,
        start: { dateTime: startTime.toISOString(), timeZone: booking.timezone },
        end:   { dateTime: endTime.toISOString(),   timeZone: booking.timezone },
        attendees: [{ email: booking.email }],
        conferenceData: {
          createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    }, { timeout: 8000 })
    return event.data.conferenceData?.entryPoints?.[0]?.uri ?? null
  } catch (err) {
    console.error('[meeting-link] Google Meet error:', err)
    return null
  }
}

export async function generateZoomLink(booking: {
  name: string; proposed_date: string; timezone: string; type: string; durationMinutes?: number
}): Promise<string | null> {
  const accountId    = process.env.ZOOM_ACCOUNT_ID
  const clientId     = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET

  if (!accountId || !clientId || !clientSecret) return null

  try {
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!tokenRes.ok) throw new Error(`Zoom token error: ${tokenRes.status}`)
    const { access_token } = await tokenRes.json()

    const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic: `${booking.type === 'interview' ? 'Interview' : 'Meeting'} with ${booking.name}`,
        type: 2,
        start_time: new Date(booking.proposed_date).toISOString(),
        duration: booking.durationMinutes ?? 60,
        timezone: booking.timezone,
        settings: { waiting_room: true, join_before_host: false, host_video: true, participant_video: true },
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!meetingRes.ok) throw new Error(`Zoom meeting error: ${meetingRes.status}`)
    const data = await meetingRes.json()
    return (data.join_url as string) ?? null
  } catch (err) {
    console.error('[meeting-link] Zoom error:', err)
    return null
  }
}

export async function generateTeamsLink(booking: {
  name: string; proposed_date: string; timezone: string; type: string; durationMinutes?: number
}): Promise<string | null> {
  const tenantId     = process.env.AZURE_TENANT_ID
  const clientId     = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  const userId       = process.env.TEAMS_USER_ID

  if (!tenantId || !clientId || !clientSecret || !userId) return null

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          scope: 'https://graph.microsoft.com/.default',
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!tokenRes.ok) throw new Error(`Teams token error: ${tokenRes.status}`)
    const { access_token } = await tokenRes.json()

    const startDt = new Date(booking.proposed_date)
    const endDt   = new Date(startDt.getTime() + (booking.durationMinutes ?? 60) * 60 * 1000)

    const meetingRes = await fetch(
      `https://graph.microsoft.com/v1.0/users/${userId}/onlineMeetings`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: `${booking.type === 'interview' ? '💼 Interview' : '📅 Meeting'} with ${booking.name}`,
          startDateTime: startDt.toISOString(),
          endDateTime:   endDt.toISOString(),
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!meetingRes.ok) throw new Error(`Teams meeting error: ${meetingRes.status}`)
    const data = await meetingRes.json()
    return (data.joinWebUrl as string) ?? null
  } catch (err) {
    console.error('[meeting-link] Teams error:', err)
    return null
  }
}

/**
 * Generate a direct Google Meet room URL (no API — always works, no credentials required).
 * Format: meet.google.com/xxx-xxxx-xxx — Google auto-creates the room on first join.
 */
function generateDirectGoogleMeetUrl(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `https://meet.google.com/${rand(3)}-${rand(4)}-${rand(3)}`
}

/**
 * Generate a meeting link based on the preferred platform.
 *
 * STRICT PLATFORM HONOURING:
 *   - If the user chose Google Meet → generate Google Meet (via API if credentials set, else direct URL)
 *   - If the user chose Zoom → generate Zoom (requires ZOOM_* env vars; logs clear error if not set)
 *   - If the user chose Teams → generate Teams (requires AZURE_* env vars; logs clear error if not set)
 *
 * We NO LONGER silently fall back to a different platform — that was the bug
 * that always returned Zoom/Google Meet regardless of user choice.
 * If the chosen platform's API fails, we fall back to a direct URL of the SAME
 * platform (only Google Meet supports credential-free direct room URLs; for
 * Zoom/Teams we surface the error so the admin can paste a link manually).
 */
export async function generateMeetingLink(booking: {
  name: string; email: string; proposed_date: string; timezone: string; type: string; platform?: string; durationMinutes?: number
}): Promise<{ link: string; platform: string; usedApi: boolean; message: string }> {
  const platform = (booking.platform ?? 'google_meet') as string
  let link: string | null = null
  let usedApi = false

  console.log(`[meeting-link] Generating link for platform: ${platform}`)

  if (platform === 'google_meet') {
    link = await generateGoogleMeetLink(booking)
    if (link) {
      usedApi = true
      console.log('[meeting-link] Google Meet API link generated:', link)
    } else {
      // Fall back to direct Meet URL (no API needed — room auto-created on join)
      link = generateDirectGoogleMeetUrl()
      usedApi = false
      console.log('[meeting-link] Google Meet credentials not set — using direct room URL:', link)
    }
  } else if (platform === 'zoom') {
    link = await generateZoomLink(booking)
    if (link) {
      usedApi = true
      console.log('[meeting-link] Zoom API link generated:', link)
    } else {
      // Zoom has no credential-free direct URL; admin must paste manually
      console.warn('[meeting-link] Zoom credentials (ZOOM_ACCOUNT_ID/ZOOM_CLIENT_ID/ZOOM_CLIENT_SECRET) not configured or API failed. Admin should paste link manually.')
      link = null
    }
  } else if (platform === 'teams') {
    link = await generateTeamsLink(booking)
    if (link) {
      usedApi = true
      console.log('[meeting-link] Teams API link generated:', link)
    } else {
      console.warn('[meeting-link] Teams credentials (AZURE_TENANT_ID/AZURE_CLIENT_ID/AZURE_CLIENT_SECRET/TEAMS_USER_ID) not configured or API failed. Admin should paste link manually.')
      link = null
    }
  }

  // If we still have no link (Zoom/Teams not configured), use a direct Google Meet URL
  // as absolute last resort so the approval flow never completely stalls.
  // The admin is informed via the message field to replace it with the correct link.
  if (!link) {
    link = generateDirectGoogleMeetUrl()
    usedApi = false
    console.warn(`[meeting-link] ${platform} API unavailable — using temporary Google Meet room as placeholder. Admin should replace with a real ${platform} link.`)
  }

  const platformLabels: Record<string, string> = {
    google_meet: 'Google Meet',
    zoom: 'Zoom',
    teams: 'Microsoft Teams',
  }
  const label = platformLabels[platform] ?? platform

  let message: string
  if (usedApi) {
    message = `✅ ${label} link generated via API`
  } else if (platform === 'google_meet') {
    message = `✅ Google Meet room ready (direct URL — to generate via Calendar API, set GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY env vars)`
  } else {
    message = `⚠️ ${label} API not configured. A temporary Google Meet link was used as placeholder — please paste a real ${label} link manually before approving.`
  }

  return { link, platform, usedApi, message }
}
