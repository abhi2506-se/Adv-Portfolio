/**
 * GET /api/reminders — admin: list all reminders with status
 * POST /api/reminders/trigger — admin: manually trigger reminder processing
 */
import { NextRequest, NextResponse } from 'next/server'
import { dbGetAllReminders, dbGetRemindersByBooking } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(`${req.nextUrl.origin}/api/admin/session-check`, {
      headers: { cookie: req.headers.get('cookie') || '' },
    })
    if (!res.ok) return false
    const d = await res.json()
    return d.valid !== false
  } catch { return false }
}

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const bookingId = req.nextUrl.searchParams.get('bookingId')
    const reminders = bookingId
      ? await dbGetRemindersByBooking(bookingId)
      : await dbGetAllReminders(100)
    return NextResponse.json({ reminders })
  } catch (e) {
    return NextResponse.json({ reminders: [] })
  }
}
