export const runtime = 'nodejs'

/**
 * /api/admin/update-credentials
 *
 * Allows the admin to change their username, password, or email from the
 * admin panel.  Credentials are stored in the `admin_credentials` DB table
 * (Neon Postgres) so changes survive Vercel deployments without touching
 * environment variables.
 *
 * Flow:
 *   1. Admin fills the form and requests an OTP  (handled by /api/admin/send-otp)
 *   2. Admin submits new value + OTP here
 *   3. OTP is verified against the cookie set in step 1
 *   4. New credentials are written to the DB (password is bcrypt-hashed)
 *   5. All active admin sessions are revoked so the admin must log in again
 *      with the new credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/admin-auth'
import { getAdminCredentials } from '@/lib/credentials-store'
import { dbSetAdminCredentials, dbGetAdminCredentials } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

const SESSION_COOKIE = 'portfolio_admin_session'
const OTP_COOKIE     = 'portfolio_admin_otp'
const BCRYPT_ROUNDS  = 12

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  return cookie?.value && verifyToken(cookie.value)
}

export async function POST(req: NextRequest) {
  // Must be logged in
  if (!isAuthed(req)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { otp, newUsername, newPassword, confirmPassword, newEmail } = body as Record<string, string>

    // ── 1. Determine which field is being changed ─────────────────────────────
    const mode =
      newUsername    ? 'username' :
      newPassword    ? 'password' :
      newEmail       ? 'email'    : null

    if (!mode) {
      return NextResponse.json({ success: false, message: 'No field to update provided.' }, { status: 400 })
    }

    if (!otp?.trim()) {
      return NextResponse.json({ success: false, message: 'OTP is required.' }, { status: 400 })
    }

    // ── 2. Verify OTP from cookie ─────────────────────────────────────────────
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const otpCookie   = cookieStore.get(OTP_COOKIE)?.value

    if (!otpCookie) {
      return NextResponse.json({ success: false, message: 'OTP expired or not requested. Please request a new OTP first.' }, { status: 401 })
    }

    let payload: { otpHash: string; email: string; expiry: number }
    try {
      payload = JSON.parse(Buffer.from(otpCookie, 'base64').toString())
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid OTP session. Please request a new OTP.' }, { status: 401 })
    }

    if (Date.now() > payload.expiry) {
      return NextResponse.json({ success: false, message: 'OTP has expired. Please request a new one.' }, { status: 401 })
    }

    const secret    = process.env.SESSION_SECRET || 'portfolio-admin-otp-secret-2024'
    const inputHash = createHash('sha256').update(otp.trim() + secret).digest('hex')

    if (inputHash !== payload.otpHash) {
      return NextResponse.json({ success: false, message: 'Incorrect OTP. Please try again.' }, { status: 401 })
    }

    // ── 3. Validate new values ────────────────────────────────────────────────
    if (mode === 'password') {
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ success: false, message: 'Password must be at least 8 characters.' }, { status: 400 })
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ success: false, message: 'Passwords do not match.' }, { status: 400 })
      }
    }

    if (mode === 'username' && (!newUsername || newUsername.trim().length < 3)) {
      return NextResponse.json({ success: false, message: 'Username must be at least 3 characters.' }, { status: 400 })
    }

    if (mode === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!newEmail || !emailRegex.test(newEmail.trim())) {
        return NextResponse.json({ success: false, message: 'Invalid email address.' }, { status: 400 })
      }
    }

    // ── 4. Load current credentials so we can carry over unchanged fields ─────
    const current = await getAdminCredentials()

    let updatedUsername = current.username
    let updatedPassword = current.password
    let updatedEmail    = current.email

    // We always store a bcrypt hash in the DB.
    // If current creds are from env vars (plain text), hash them now.
    if (!current.fromDB) {
      updatedPassword = await bcrypt.hash(current.password, BCRYPT_ROUNDS)
    }

    // ── 5. Apply the change ───────────────────────────────────────────────────
    if (mode === 'username') {
      updatedUsername = newUsername.trim()
    } else if (mode === 'password') {
      updatedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
    } else if (mode === 'email') {
      updatedEmail = newEmail.trim()
    }

    // ── 6. Persist to DB ──────────────────────────────────────────────────────
    await dbSetAdminCredentials({
      username: updatedUsername,
      password: updatedPassword,
      email:    updatedEmail,
    })

    // ── 7. Invalidate OTP cookie (one-time use) ───────────────────────────────
    const res = NextResponse.json({
      success: true,
      message: mode === 'username'
        ? `Username updated to "${updatedUsername}". Please log in again with your new username.`
        : mode === 'password'
        ? 'Password updated successfully. Please log in again with your new password.'
        : `Admin email updated to "${updatedEmail}".`,
      requiresRelogin: mode !== 'email',
    })

    res.cookies.set(OTP_COOKIE, '', { maxAge: 0, path: '/' })

    return res
  } catch (error) {
    console.error('[update-credentials]', error)
    return NextResponse.json({ success: false, message: 'Server error. Please try again.' }, { status: 500 })
  }
}
