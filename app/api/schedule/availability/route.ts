/**
 * GET  /api/schedule/availability  — public, returns admin weekly availability + booked slots
 * POST /api/schedule/availability  — admin saves availability settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { avGetAll, avUpsert, srGetBookedSlots } from '@/lib/scheduling-store'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const slots = await avGetAll()
  /* also return booked date-times for the next 30 days */
  const now = new Date()
  const bookedByDate: Record<string, string[]> = {}
  for (let d = 0; d < 30; d++) {
    const dt = new Date(now)
    dt.setDate(now.getDate() + d)
    const dateKey = dt.toISOString().split('T')[0]
    const booked = await srGetBookedSlots(dateKey)
    if (booked.length > 0) bookedByDate[dateKey] = booked
  }
  return NextResponse.json({ availability: slots, bookedSlots: bookedByDate })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slots } = await req.json()
  if (!Array.isArray(slots)) return NextResponse.json({ error: 'slots array required' }, { status: 400 })
  await avUpsert(slots)
  return NextResponse.json({ success: true })
}
