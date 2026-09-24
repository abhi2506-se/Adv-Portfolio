/**
 * GET /api/meetings/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Public — returns only OPEN (bookable) slots that haven't started yet.
 * Booked/blocked slots are never exposed here, and any slot for today whose
 * start_time has already passed is filtered out too, so the UI can only
 * ever show real, bookable availability (no stale/expired times).
 */
import { NextRequest, NextResponse } from 'next/server'
import { msList, filterFutureSlots, slotDurationMinutes } from '@/lib/meeting-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const today = new Date().toISOString().split('T')[0]
    const from = req.nextUrl.searchParams.get('from') || today
    const to   = req.nextUrl.searchParams.get('to')   || (() => {
      const d = new Date(); d.setDate(d.getDate() + 60)
      return d.toISOString().split('T')[0]
    })()

    const slots = await msList({ from, to, status: 'open' })
    const future = await filterFutureSlots(slots)
    // Never expose request_id / notes to the public
    const safe = future.map(s => ({
      id: s.id, slot_date: s.slot_date, start_time: s.start_time,
      end_time: s.end_time, platforms: s.platforms.split(','),
      duration_minutes: slotDurationMinutes(s.start_time, s.end_time),
    }))
    return NextResponse.json({ slots: safe })
  } catch (e) {
    console.error('[meetings/slots] error:', e)
    return NextResponse.json({ slots: [] }, { status: 500 })
  }
}
