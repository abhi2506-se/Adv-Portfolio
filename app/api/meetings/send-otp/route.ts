/**
 * POST /api/meetings/send-otp
 * Body: { email, company }
 * Validates the email is an official (non-personal, real, MX-verified)
 * domain, then emails a 6-digit OTP. Rate-limited per email address.
 */
import { NextRequest, NextResponse } from 'next/server'
import { checkOfficialDomain } from '@/lib/recruiter-verification'
import {
  generateOtp, hashOtp, OTP_TTL_MIN, MAX_SENDS_PER_WINDOW, SEND_WINDOW_MIN,
} from '@/lib/recruiter-verification'
import { rvInsert, rvCountRecent } from '@/lib/meeting-store'
import { meetingMailer, safeFromEmail, explainEmailError, sendMeetingEmail } from '@/lib/meeting-mailer'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email, company } = await req.json()
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const trimmedEmail = email.trim().toLowerCase()

    const domainCheck = await checkOfficialDomain(trimmedEmail, company || '')
    if (!domainCheck.valid) {
      return NextResponse.json({ error: domainCheck.reason }, { status: 400 })
    }

    const recentCount = await rvCountRecent(trimmedEmail, SEND_WINDOW_MIN)
    if (recentCount >= MAX_SENDS_PER_WINDOW) {
      return NextResponse.json(
        { error: `Too many verification codes requested. Please wait ${SEND_WINDOW_MIN} minutes and try again.` },
        { status: 429 }
      )
    }

    const otp = generateOtp()
    const otpHash = hashOtp(trimmedEmail, otp)
    const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60_000).toISOString()
    await rvInsert({ email: trimmedEmail, company_name: company || null, otp_hash: otpHash, expires_at: expiresAt })

    const resend = await meetingMailer()
    const from   = await safeFromEmail()
    if (!resend) {
      return NextResponse.json(
        { error: 'Email sending is not configured on the server (SMTP_USER/SMTP_PASS missing). Contact the site admin.' },
        { status: 503 }
      )
    }
    try {
      await sendMeetingEmail(resend, {
        from, to: trimmedEmail,
        subject: `Your verification code: ${otp}`,
        html: `
<div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:auto;background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;color:#e2e8f0">
  <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);padding:24px 28px">
    <h1 style="margin:0;color:#fff;font-size:18px;font-weight:700">Verify your company email</h1>
  </div>
  <div style="padding:24px 28px;text-align:center">
    <p style="color:#94a3b8;font-size:14px;margin:0 0 16px">Enter this code to verify your email and continue your interview scheduling request:</p>
    <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#60a5fa;background:#0f172a;border:1px solid #1e40af;border-radius:10px;padding:16px;margin-bottom:16px">${otp}</div>
    <p style="color:#64748b;font-size:12px;margin:0">This code expires in ${OTP_TTL_MIN} minutes. If you didn't request this, you can ignore this email.</p>
  </div>
</div>`,
      })
    } catch (e) {
      const msg = explainEmailError(e, from)
      console.error('[send-otp] email failed:', msg, e)
      return NextResponse.json({ error: msg }, { status: 502 })
    }

    return NextResponse.json({ success: true, expiresInSec: OTP_TTL_MIN * 60, hint: domainCheck.hint, note: domainCheck.reason })
  } catch (e) {
    console.error('[send-otp] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
