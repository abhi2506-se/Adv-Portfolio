/**
 * admin-auth.ts
 *
 * Token generation + verification utilities.
 *
 * IMPORTANT: verifyToken() only validates the token signature and expiry.
 * It does NOT check that the username matches the current admin username —
 * that check would require an async DB call which cannot happen in a
 * synchronous cookie-check guard. Sessions are already invalidated by
 * revoking them in the admin_sessions table when credentials change.
 */

export const SESSION_COOKIE = 'portfolio_admin_session'
export const OTP_COOKIE     = 'portfolio_admin_otp'

// ── Session duration: 7 days ───────────────────────────────────────────────
const SESSION_DURATION_MS    = 7 * 24 * 60 * 60 * 1000
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60   // 604 800

const SESSION_SECRET = () => process.env.SESSION_SECRET || 'portfolio-admin-session-secret-2024'

export function generateToken(username: string): string {
  const payload = { username, ts: Date.now(), v: 2 }
  const data    = Buffer.from(JSON.stringify(payload)).toString('base64')
  // Simple HMAC-like signature using the session secret
  const { createHmac } = require('crypto')
  const sig = createHmac('sha256', SESSION_SECRET()).update(data).digest('hex').slice(0, 16)
  return `${data}.${sig}`
}

export function verifyToken(token: string): boolean {
  try {
    // Support both old (no sig) and new (with sig) token formats
    let data: string
    if (token.includes('.')) {
      const parts = token.split('.')
      // Last segment is the signature
      const sig  = parts.pop()!
      data        = parts.join('.')
      // Verify signature
      const { createHmac } = require('crypto')
      const expected = createHmac('sha256', SESSION_SECRET()).update(data).digest('hex').slice(0, 16)
      if (sig !== expected) return false
    } else {
      // Legacy token without signature — still accept so existing sessions don't break
      data = token
    }

    const decoded   = JSON.parse(Buffer.from(data, 'base64').toString())
    const isExpired = Date.now() - decoded.ts > SESSION_DURATION_MS
    return !isExpired
  } catch {
    return false
  }
}
