/**
 * lib/device-id.ts
 *
 * Gives every visitor a stable, unique, tamper-proof ID stored in a signed
 * httpOnly cookie — used to recognise "returning users" for Live Chat
 * (Continue Chat / auto-approval) WITHOUT requiring a login.
 *
 * Two different visitors can never end up with the same ID (crypto random),
 * and a visitor cannot forge/guess another visitor's ID (HMAC signature),
 * so this satisfies "never allow two different users with the same name to
 * access each other's chat/history" — identity here is the signed cookie,
 * never the display name.
 */
import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, createHmac } from 'crypto'

export const DEVICE_COOKIE = 'portfolio_visitor_id'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2 // 2 years

const SECRET = () => process.env.SESSION_SECRET || 'portfolio-admin-session-secret-2024'

function sign(id: string): string {
  return createHmac('sha256', SECRET()).update(id).digest('hex').slice(0, 24)
}

function makeToken(): string {
  const id = randomBytes(16).toString('hex')
  return `${id}.${sign(id)}`
}

function verifyToken(token: string): string | null {
  const [id, sig] = token.split('.')
  if (!id || !sig) return null
  if (sig !== sign(id)) return null
  return id
}

/**
 * Reads the visitor's device ID from the incoming request cookie.
 * Returns { deviceId, isNew, token } — if isNew is true, the caller MUST
 * call attachDeviceCookie() on the outgoing response.
 */
export function getOrCreateDeviceId(req: NextRequest): { deviceId: string; isNew: boolean; token: string } {
  const existing = req.cookies.get(DEVICE_COOKIE)?.value
  const verified = existing ? verifyToken(existing) : null
  if (verified) {
    return { deviceId: verified, isNew: false, token: existing! }
  }
  const token = makeToken()
  const [id] = token.split('.')
  return { deviceId: id, isNew: true, token }
}

export function attachDeviceCookie(res: NextResponse, token: string) {
  res.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
  return res
}
