import { createHmac } from 'crypto'

export const CO_ADMIN_SESSION_COOKIE = 'portfolio_coadmin_session'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000
export const CO_ADMIN_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

const SECRET = () => process.env.SESSION_SECRET || 'portfolio-admin-session-secret-2024'

export interface CoAdminTokenPayload {
  id: string
  username: string
  permissions: string[]
  ts: number
}

export function generateCoAdminToken(id: string, username: string, permissions: string[]): string {
  const payload: CoAdminTokenPayload = { id, username, permissions, ts: Date.now() }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64')
  const sig = createHmac('sha256', SECRET()).update(data).digest('hex').slice(0, 16)
  return `${data}.${sig}`
}

/** Returns the decoded payload if the token is valid & unexpired, else null. */
export function verifyCoAdminToken(token: string | undefined | null): CoAdminTokenPayload | null {
  if (!token) return null
  try {
    const parts = token.split('.')
    const sig = parts.pop()!
    const data = parts.join('.')
    const expected = createHmac('sha256', SECRET()).update(data).digest('hex').slice(0, 16)
    if (sig !== expected) return null
    const decoded: CoAdminTokenPayload = JSON.parse(Buffer.from(data, 'base64').toString())
    if (Date.now() - decoded.ts > SESSION_DURATION_MS) return null
    return decoded
  } catch {
    return null
  }
}
