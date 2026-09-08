import { NextRequest, NextResponse } from 'next/server'
import { dbUnblockIP, dbUnblockByFingerprint } from '@/lib/db'
import { isSelfUnblockWifeName } from '@/lib/security-whitelist'

/**
 * POST /api/security/self-unblock
 *
 * Lets a blocked visitor unblock themselves instantly from the "Access
 * Blocked" screen, without waiting for an admin appeal, by picking their
 * relation to the site owner and typing the expected name for that
 * relation. Currently supports relation "wife" — if the typed name matches
 * (case-insensitive, tolerant of the "Abhisek" spelling), their IP and
 * device fingerprint are unblocked immediately.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { relation, name, fingerprint } = body as { relation?: string; name?: string; fingerprint?: string }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') || 'unknown'

    let matched = false
    if (relation === 'wife' && isSelfUnblockWifeName(name)) matched = true

    if (!matched) {
      return NextResponse.json({ unblocked: false, error: 'That name does not match our records.' }, { status: 200 })
    }

    if (ip !== 'unknown') await dbUnblockIP(ip).catch(() => {})
    if (fingerprint) await dbUnblockByFingerprint(fingerprint).catch(() => {})

    return NextResponse.json({ unblocked: true })
  } catch (e) {
    return NextResponse.json({ unblocked: false, error: 'Something went wrong. Please try again.' }, { status: 200 })
  }
}
