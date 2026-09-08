import { NextRequest, NextResponse } from 'next/server'
import { verifyOtp, verifyUserEmail } from '@/lib/user-db'

export async function POST(req: NextRequest) {
  try {
    const { email, otp, purpose } = await req.json()
    if (!email || !otp || !purpose) return NextResponse.json({ error: 'Email, OTP, and purpose required' }, { status: 400 })

    const valid = await verifyOtp(email, otp, purpose)
    if (!valid) return NextResponse.json({ error: 'Invalid or expired OTP. Please request a new one.' }, { status: 400 })

    if (purpose === 'verify') {
      await verifyUserEmail(email)
      return NextResponse.json({ success: true, message: 'Email verified successfully!' })
    }

    if (purpose === 'reset') {
      // OTP validated and consumed. Password is saved separately via /api/auth/reset-password
      return NextResponse.json({ success: true, message: 'OTP verified. You may now set a new password.' })
    }

    return NextResponse.json({ error: 'Unknown purpose' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
