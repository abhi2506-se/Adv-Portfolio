import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, updateUserPassword } from '@/lib/user-db'

export async function POST(req: NextRequest) {
  try {
    const { email, password_hash } = await req.json()
    if (!email || !password_hash) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })

    const user = await getUserByEmail(email)
    if (!user) return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 })

    // password_hash is already hashed client-side (ch_... format) — store directly
    await updateUserPassword(email, password_hash)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
