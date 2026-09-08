/**
 * POST /api/meetings/generate-link
 * Admin-only: generate a Calendly scheduling link (preferred) or fallback to platform APIs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { srGet } from '@/lib/scheduling-store'
import { generateMeetingLink } from '@/lib/meeting-link-generators'
import { dbGetSettings } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest): Promise<boolean> {
  const r = await fetch(`${req.nextUrl.origin}/api/admin/session-check`, {
    headers: { cookie: req.headers.get('cookie') || '' },
  }).catch(() => null)
  return r?.ok ?? false
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookingId } = await req.json()
  if (!bookingId)
    return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  const booking = await srGet(bookingId)
  if (!booking)
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  /* ── Try Calendly first ─────────────────────────────────────────────────── */
  const settings = await dbGetSettings().catch(() => ({} as Record<string, string>))
  const calendlyToken = process.env.CALENDLY_API_TOKEN || settings.calendly_api_token || ''
  const calendlyEvent = process.env.CALENDLY_EVENT_TYPE_URI || settings.calendly_event_type_uri || ''

  if (calendlyToken && calendlyEvent) {
    try {
      const res = await fetch('https://api.calendly.com/scheduling_links', {
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
      if (res.ok) {
        const d = await res.json()
        const link = d.resource?.booking_url
        if (link) {
          return NextResponse.json({
            link,
            platform: 'calendly',
            usedApi: true,
            message: '✅ Calendly single-use scheduling link generated',
          })
        }
      } else {
        const errText = await res.text().catch(() => '')
        console.error('[generate-link] Calendly error:', res.status, errText)
      }
    } catch (e) {
      console.error('[generate-link] Calendly fetch error:', e)
    }
  }

  /* ── Fallback: Google Meet / Zoom / Teams / Jitsi ───────────────────────── */
  try {
    const result = await generateMeetingLink({
      name: booking.name,
      email: booking.email,
      proposed_date: booking.preferred_date,
      timezone: booking.timezone,
      type: booking.purpose === 'interview' ? 'interview' : 'meeting',
      platform: booking.platform,
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[generate-link] fallback error:', e)
    return NextResponse.json({ error: 'Could not generate link' }, { status: 500 })
  }
}
