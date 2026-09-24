import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, updateUserLastLogin, verifyUserEmail } from '@/lib/user-db'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })

    const user = await getUserByEmail(email)
    if (!user) return NextResponse.json({ error: 'No account found with this email. Please register.' }, { status: 404 })

    // The client hashes the password before sending (ch_... format).
    // We compare directly — no server-side re-hashing.
    if (user.password_hash !== password) return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })

    // Auto-heal legacy rows that were stored with email_verified = FALSE
    if (!user.email_verified) {
      await verifyUserEmail(email)
    }

    await updateUserLastLogin(email)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id, first_name: user.first_name, last_name: user.last_name,
        email: user.email, role: user.role, gender: user.gender,
        phone: user.phone, email_verified: true
      }
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
