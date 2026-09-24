/**
 * GET  /api/admin/meeting-slots   — admin: list all slots (any status)
 * POST /api/admin/meeting-slots   — admin: create one slot, or bulk-generate
 *      Single:  { slot_date, start_time, end_time, platforms? }
 *      Bulk:    { bulk: true, from, to, weekdays:[0-6], start_time, end_time,
 *                 slot_length_min, buffer_min?, platforms? }
 *               Generates one slot per `slot_length_min` block between
 *               start_time/end_time, on the given weekdays, between from/to,
 *               leaving `buffer_min` minutes of rest time between the end of
 *               one slot and the start of the next (default 10 minutes).
 *               E.g. start_time=08:00, slot_length_min=30, buffer_min=10 →
 *               08:00–08:30, 08:40–09:10, 09:20–09:50, ... Once a slot is
 *               booked it's the only thing marked unavailable — the buffer
 *               is "baked in" by simply never generating a bookable slot
 *               inside that gap, so there's nothing else to double-book.
 */
import { NextRequest, NextResponse } from 'next/server'
import { msList, msCreate, msBulkCreate } from '@/lib/meeting-store'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const from = req.nextUrl.searchParams.get('from') || undefined
  const to   = req.nextUrl.searchParams.get('to')   || undefined
  const status = (req.nextUrl.searchParams.get('status') as any) || undefined
  const slots = await msList({ from, to, status })
  return NextResponse.json({ slots })
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = Math.floor(total / 60) % 24
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const STANDARD_DURATIONS = [15, 30, 45, 60]

/** Minutes since midnight for an "HH:MM" string. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Slots must start on a clean 15-minute mark (00/15/30/45) so the public picker stays consistent. */
function isQuarterHour(hhmm: string): boolean {
  const [, m] = hhmm.split(':').map(Number)
  return m % 15 === 0
}

export async function POST(req: NextRequest) {
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()

    if (body.bulk) {
      const { from, to, weekdays, start_time, end_time, slot_length_min, platforms } = body
      const buffer_min = Number.isFinite(body.buffer_min) ? Math.max(0, Number(body.buffer_min)) : 10
      if (!from || !to || !Array.isArray(weekdays) || weekdays.length === 0 || !start_time || !end_time || !slot_length_min) {
        return NextResponse.json({ error: 'from, to, weekdays, start_time, end_time, slot_length_min are required for bulk creation' }, { status: 400 })
      }
      if (!STANDARD_DURATIONS.includes(Number(slot_length_min))) {
        return NextResponse.json({ error: 'Meeting length must be 15, 30, 45, or 60 minutes' }, { status: 400 })
      }
      if (!isQuarterHour(start_time)) {
        return NextResponse.json({ error: 'Day start must be on a 15-minute mark (e.g. 9:00, 9:15, 9:30, 9:45)' }, { status: 400 })
      }
      const slotsToCreate: { slot_date: string; start_time: string; end_time: string; platforms?: string }[] = []
      const start = new Date(from)
      const end = new Date(to)
      if (end < start) return NextResponse.json({ error: '"to" date must be on or after "from" date' }, { status: 400 })
      const MAX_DAYS = 180
      let dayCount = 0
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dayCount++
        if (dayCount > MAX_DAYS) break
        if (!weekdays.includes(d.getDay())) continue
        const dateKey = d.toISOString().split('T')[0]
        let cursor = start_time
        while (cursor < end_time) {
          const slotEnd = addMinutes(cursor, slot_length_min)
          if (slotEnd > end_time) break
          slotsToCreate.push({ slot_date: dateKey, start_time: cursor, end_time: slotEnd, platforms })
          // Step past the meeting AND the rest/buffer time before the next
          // slot can start — this is what makes "8:00am, 30min" occupy
          // 8:00–8:40 (30min meeting + 10min rest) instead of back-to-back
          // 8:00–8:30 / 8:30–9:00 slots with zero breathing room.
          cursor = addMinutes(slotEnd, buffer_min)
        }
      }
      if (slotsToCreate.length === 0) {
        return NextResponse.json({ error: 'No slots generated — check your date range, weekdays, and time window' }, { status: 400 })
      }
      const created = await msBulkCreate(slotsToCreate)
      return NextResponse.json({ success: true, created, attempted: slotsToCreate.length })
    }

    const { slot_date, start_time, end_time, platforms, notes } = body
    if (!slot_date || !start_time || !end_time) {
      return NextResponse.json({ error: 'slot_date, start_time, end_time are required' }, { status: 400 })
    }
    if (end_time <= start_time) {
      return NextResponse.json({ error: 'end_time must be after start_time' }, { status: 400 })
    }
    if (!isQuarterHour(start_time)) {
      return NextResponse.json({ error: 'Start time must be on a 15-minute mark (e.g. 9:00, 9:15, 9:30, 9:45)' }, { status: 400 })
    }
    const duration = toMinutes(end_time) - toMinutes(start_time)
    if (!STANDARD_DURATIONS.includes(duration)) {
      return NextResponse.json({ error: 'Meeting duration must be 15, 30, 45, or 60 minutes' }, { status: 400 })
    }
    const slot = await msCreate({ slot_date, start_time, end_time, platforms, notes })
    return NextResponse.json({ success: true, slot })
  } catch (e) {
    console.error('[admin/meeting-slots POST] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
