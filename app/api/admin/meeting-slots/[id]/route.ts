/**
 * PATCH  /api/admin/meeting-slots/[id]  — admin: block or re-open a slot
 *        Body: { status: 'open' | 'blocked' }
 *        (Booked slots can't be force-opened here — reject/reschedule the
 *        associated request instead, which frees the slot automatically.)
 * DELETE /api/admin/meeting-slots/[id]  — admin: delete an unbooked slot
 */
import { NextRequest, NextResponse } from 'next/server'
import { msGet, msSetStatus, msDelete } from '@/lib/meeting-store'
import { requireAdmin } from '@/lib/require-admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const { status } = await req.json()
    if (!['open', 'blocked'].includes(status)) {
      return NextResponse.json({ error: 'status must be "open" or "blocked"' }, { status: 400 })
    }
    const slot = await msGet(id)
    if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    if (slot.status === 'booked') {
      return NextResponse.json({ error: 'This slot is booked. Reject or reschedule the linked request to free it.' }, { status: 409 })
    }
    await msSetStatus(id, status, null)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/meeting-slots/[id] PATCH] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id } = await params
    const slot = await msGet(id)
    if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
    if (slot.status === 'booked') {
      return NextResponse.json({ error: 'This slot is booked and cannot be deleted. Reject or reschedule the linked request first.' }, { status: 409 })
    }
    await msDelete(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[admin/meeting-slots/[id] DELETE] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
