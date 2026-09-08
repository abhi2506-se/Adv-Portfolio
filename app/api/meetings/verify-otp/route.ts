/**
 * POST /api/meetings/verify-otp
 * Body: { email, otp }
 * On success returns a short-lived verification token the client must
 * attach to the final POST /api/meetings submission.
 */
import { NextRequest, NextResponse } from 'next/server'
import { hashOtp, generateToken, TOKEN_TTL_MIN, MAX_ATTEMPTS } from '@/lib/recruiter-verification'
import { rvGetLatestUnverified, rvIncrementAttempts, rvMarkVerified } from '@/lib/meeting-store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()
    if (!email?.trim() || !otp?.trim()) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }
    const trimmedEmail = email.trim().toLowerCase()

    const record = await rvGetLatestUnverified(trimmedEmail) as any
    if (!record) {
      return NextResponse.json({ error: 'No verification code found for this email. Please request a new one.' }, { status: 400 })
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 })
    }
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'This code has expired. Please request a new one.' }, { status: 400 })
    }

    const expectedHash = hashOtp(trimmedEmail, otp.trim())
    if (expectedHash !== record.otp_hash) {
      await rvIncrementAttempts(record.id)
      const remaining = Math.max(0, MAX_ATTEMPTS - (record.attempts + 1))
      return NextResponse.json({ error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` }, { status: 400 })
    }

    const token = generateToken()
    const tokenExpiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString()
    await rvMarkVerified(record.id, token, tokenExpiresAt)

    return NextResponse.json({ success: true, verified: true, token })
  } catch (e) {
    console.error('[verify-otp] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
