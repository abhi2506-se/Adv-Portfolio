export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminCredentials } from '@/lib/credentials-store'
import { SESSION_COOKIE, OTP_COOKIE, generateToken, SESSION_MAX_AGE_SECONDS } from '@/lib/admin-auth'
import { dbSaveAdminSession } from '@/lib/db'
import { mintPortalAdminSession } from '@/lib/portal/auth'
import bcrypt from 'bcryptjs'

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function getLocationFromIP(ip: string): Promise<string> {
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip.startsWith('::')) return 'Local/Unknown'
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=country,regionName,city,status`, { signal: AbortSignal.timeout(3000) })
    const d = await res.json()
    if (d.status === 'success') return [d.city, d.regionName, d.country].filter(Boolean).join(', ')
  } catch {}
  return 'Unknown'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, password, otp } = body

    // ── Load credentials from DB first, fall back to env vars ────────────────
    const admin = await getAdminCredentials()

    if (!admin.username || !admin.password) {
      return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 500 })
    }

    // ── Verify username + password ────────────────────────────────────────────
    const usernameMatch = username === admin.username
    let passwordMatch   = false

    if (admin.fromDB) {
      // DB password is a bcrypt hash
      passwordMatch = await bcrypt.compare(String(password), admin.password)
    } else {
      // Env-var password is plain text (initial setup)
      passwordMatch = password === admin.password
    }

    const credentialsValid = usernameMatch && passwordMatch

    if (!credentialsValid) {
      return NextResponse.json({ success: false, message: 'Invalid username or password.' }, { status: 401 })
    }

    if (!otp) {
      const email  = admin.email || admin.username
      const masked = email.replace(/(.{2})(.*)(@.*)/, (_: string, a: string, b: string, c: string) =>
        a + '*'.repeat(Math.max(1, b.length)) + c
      )
      return NextResponse.json({ success: false, needsOtp: true, maskedEmail: masked, message: 'Credentials verified. Please verify with OTP.' })
    }

    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const otpCookie   = cookieStore.get(OTP_COOKIE)?.value

    if (!otpCookie) {
      return NextResponse.json({ success: false, message: 'OTP expired or not requested. Please try again.' }, { status: 401 })
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

    const { createHash } = await import('crypto')
    const secret    = process.env.SESSION_SECRET || 'portfolio-admin-otp-secret-2024'
    const inputHash = createHash('sha256').update(otp.trim() + secret).digest('hex')

    if (inputHash !== payload.otpHash) {
      return NextResponse.json({ success: false, message: 'Incorrect OTP. Please check your email and try again.' }, { status: 401 })
    }

    const token     = generateToken(admin.username)
    const sessionId = generateId()

    const ip       = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const device   = req.headers.get('user-agent') || 'Unknown'
    const location = await getLocationFromIP(ip)

    try {
      await dbSaveAdminSession({ id: sessionId, username: admin.username, ip, device, location, created_at: Date.now(), last_active: Date.now() })
    } catch {}

    const res = NextResponse.json({ success: true, sessionId })

    res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_MAX_AGE_SECONDS, path: '/' })
    res.cookies.set('admin_session_id', sessionId, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: SESSION_MAX_AGE_SECONDS, path: '/' })
    res.cookies.set(OTP_COOKIE, '', { maxAge: 0, path: '/' })

    // ── Bridge into the client-portal admin session (one login, both panels) ──
    const bridgeEmail = admin.email || admin.username
    if (bridgeEmail && bridgeEmail.includes('@')) {
      const portalSession = await mintPortalAdminSession(bridgeEmail)
      if (portalSession) {
        const isProd = process.env.NODE_ENV === 'production'
        res.cookies.set('portal_access_token', portalSession.accessToken, {
          httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: portalSession.expiresIn,
        })
        res.cookies.set('portal_refresh_token', portalSession.refreshToken, {
          httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
        })
      }
      // If bridging fails (e.g. Supabase env vars not configured yet), the
      // portfolio admin login above has already succeeded — this is
      // best-effort and never blocks the primary login.
    }

    return res
  } catch (error) {
    console.error('[admin/login]', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
