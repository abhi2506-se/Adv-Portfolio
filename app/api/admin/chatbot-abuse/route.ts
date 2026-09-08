/**
 * /api/admin/chatbot-abuse
 * GET    — list all abuse records (admin only)
 * POST   — record an abuse event (internal, called from /api/ai)
 * PATCH  — unblock a user (admin only)
 * DELETE — delete a record (admin only)
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  dbGetAllAbuseRecords, dbRecordAbuse, dbUnblockAbuse, dbGetAbuseRecord, dbMarkWarnShown,
} from '@/lib/db'

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

/* ── GET — admin: list all abuse records ─────────────────────────────────── */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const records = await dbGetAllAbuseRecords()
    return NextResponse.json({ records })
  } catch (e) {
    return NextResponse.json({ records: [] })
  }
}

/* ── POST — record abuse or check status ─────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, fingerprint, ip_address } = body

    if (!fingerprint && !ip_address) {
      return NextResponse.json({ error: 'fingerprint or ip_address required' }, { status: 400 })
    }

    if (action === 'check') {
      const record = await dbGetAbuseRecord(fingerprint || '', ip_address || '')
      return NextResponse.json({
        blocked: record?.blocked ?? false,
        abuse_count: record?.abuse_count ?? 0,
        warn_shown: record?.warn_shown ?? false,
        record,
      })
    }

    if (action === 'record') {
      const record = await dbRecordAbuse(fingerprint || '', ip_address || '')
      // First offense (count was 0 before this) → warn only
      // Second offense → blocked = true
      const isFirstOffense = record.abuse_count === 1
      const shouldWarn = isFirstOffense && !record.warn_shown
      return NextResponse.json({
        blocked: record.blocked,
        abuse_count: record.abuse_count,
        warn: shouldWarn,
        warn_shown: record.warn_shown,
        record,
      })
    }

    if (action === 'mark_warned') {
      await dbMarkWarnShown(fingerprint || '', ip_address || '')
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e) {
    console.error('[chatbot-abuse POST]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

/* ── PATCH — admin: unblock ──────────────────────────────────────────────── */
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await dbUnblockAbuse(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
