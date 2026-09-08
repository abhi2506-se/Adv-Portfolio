/**
 * GET /api/admin/availability
 *   → { windows: AvailabilityWindow[], settings: SchedulerSettings }
 *
 * PUT /api/admin/availability
 *   Body: { windows: [{ day_of_week, start_time, end_time, is_active? }],
 *           settings?: { buffer_minutes?, timezone?, min_notice_minutes? } }
 *   Replaces the full set of availability windows (admin's "Set Availability"
 *   screen always sends its complete current state) and optionally updates
 *   the global buffer/timezone/notice settings in the same request.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  awGetAll, awReplaceAll, getSchedulerSettings, updateSchedulerSettings,
} from '@/lib/availability-store'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isQuarterHour(hhmm: string): boolean {
  const m = Number(hhmm.split(':')[1])
  return Number.isInteger(m) && m % 5 === 0
}

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const [windows, settings] = await Promise.all([awGetAll(), getSchedulerSettings()])
  return NextResponse.json({ windows, settings })
}

export async function PUT(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { windows, settings } = body

    if (!Array.isArray(windows)) {
      return NextResponse.json({ error: 'windows array is required' }, { status: 400 })
    }
    for (const w of windows) {
      if (
        typeof w.day_of_week !== 'number' || w.day_of_week < 0 || w.day_of_week > 6 ||
        !w.start_time || !w.end_time
      ) {
        return NextResponse.json({ error: 'Each window needs day_of_week (0-6), start_time, end_time' }, { status: 400 })
      }
      if (!isQuarterHour(w.start_time) || !isQuarterHour(w.end_time)) {
        return NextResponse.json({ error: 'Times must be on a 5-minute mark' }, { status: 400 })
      }
      if (w.end_time <= w.start_time) {
        return NextResponse.json({ error: `Window end (${w.end_time}) must be after start (${w.start_time})` }, { status: 400 })
      }
    }

    const saved = await awReplaceAll(windows.map((w: any) => ({
      day_of_week: w.day_of_week,
      start_time: w.start_time,
      end_time: w.end_time,
      is_active: w.is_active ?? true,
    })))

    let savedSettings = await getSchedulerSettings()
    if (settings) {
      const buffer_minutes = Number.isFinite(settings.buffer_minutes) ? Math.max(0, Math.min(120, Number(settings.buffer_minutes))) : undefined
      const min_notice_minutes = Number.isFinite(settings.min_notice_minutes) ? Math.max(0, Math.min(1440 * 7, Number(settings.min_notice_minutes))) : undefined
      savedSettings = await updateSchedulerSettings({
        ...(buffer_minutes !== undefined ? { buffer_minutes } : {}),
        ...(min_notice_minutes !== undefined ? { min_notice_minutes } : {}),
        ...(settings.timezone ? { timezone: settings.timezone } : {}),
      })
    }

    return NextResponse.json({ success: true, windows: saved, settings: savedSettings })
  } catch (e) {
    console.error('[admin/availability PUT] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
