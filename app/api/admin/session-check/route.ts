import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { verifyToken } from '@/lib/admin-auth'

const SESSION_COOKIE = 'portfolio_admin_session'
const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(SESSION_COOKIE)
  if (!cookie?.value || !verifyToken(cookie.value)) {
    return NextResponse.json({ valid: false, reason: 'invalid_token' })
  }

  const sessionId = req.nextUrl.searchParams.get('sid')
  if (!sessionId) {
    return NextResponse.json({ valid: true })
  }

  try {
    const rows = await sql`SELECT active FROM admin_sessions WHERE id = ${sessionId} LIMIT 1`
    if (rows.length === 0 || !rows[0].active) {
      const res = NextResponse.json({ valid: false, reason: 'revoked' })
      res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' })
      return res
    }
    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json({ valid: true })
  }
}
