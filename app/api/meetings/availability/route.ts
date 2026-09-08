/**
 * GET /api/meetings/availability?date=YYYY-MM-DD&duration=45
 *   → { slots: [{ start_time, end_time, buffer_until }], buffer_minutes }
 *   Dynamically computed from admin availability windows minus existing
 *   bookings (+ buffer) for that exact date/duration pair. Nothing here is
 *   pre-materialized — this is the live, Calendly-style slot generator.
 *
 * GET /api/meetings/availability?from=YYYY-MM-DD&to=YYYY-MM-DD&duration=45&summary=1
 *   → { summary: { "2026-06-23": 4, "2026-06-24": 6, ... } }
 *   Used to paint the calendar (which days have any room at all) without
 *   generating full slot lists for every visible day.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  generateAvailableSlots, getAvailableDateSummary, getSchedulerSettings,
} from '@/lib/availability-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VALID_DURATIONS = [15, 30, 45, 60]

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const durationRaw = Number(sp.get('duration'))
    const duration = VALID_DURATIONS.includes(durationRaw) ? durationRaw : 30
    const settings = await getSchedulerSettings()

    if (sp.get('summary') === '1') {
      const from = sp.get('from') || new Date().toISOString().split('T')[0]
      const to = sp.get('to') || (() => {
        const d = new Date(); d.setDate(d.getDate() + 45)
        return d.toISOString().split('T')[0]
      })()
      const summary = await getAvailableDateSummary(from, to, duration)
      return NextResponse.json({ summary, buffer_minutes: settings.buffer_minutes, timezone: settings.timezone })
    }

    const date = sp.get('date')
    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })

    const slots = await generateAvailableSlots(date, duration)
    return NextResponse.json({
      slots,
      buffer_minutes: settings.buffer_minutes,
      timezone: settings.timezone,
      duration_minutes: duration,
    })
  } catch (e) {
    console.error('[meetings/availability] error:', e)
    return NextResponse.json({ slots: [], error: 'Server error' }, { status: 500 })
  }
}
