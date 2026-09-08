import { NextRequest, NextResponse } from 'next/server'
import { randomInt } from 'crypto'
import nodemailer from 'nodemailer'
import { saveOtp, getUserByEmail } from '@/lib/user-db'
import { AUTH_FROM, withNoReplyNotice } from '@/lib/mail-identities'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function sendOtpEmail(to: string, otp: string, purpose: 'verify' | 'reset', name: string) {
  const title = purpose === 'verify' ? '📧 Verify Your Email' : '🔑 Reset Your Password'
  const subTitle = purpose === 'verify' ? 'Email Verification' : 'Password Reset'
  const bodyText = purpose === 'verify'
    ? `Welcome to Abhishek's Portfolio! Use this OTP to verify your email address:`
    : `Use this OTP to reset your password for Abhishek's Portfolio:`

  await transporter.sendMail({
    from: AUTH_FROM,
    to,
    subject: `${title} — OTP: ${otp}`,
    html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#2563eb,#06b6d4);border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">${title}</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">${subTitle}</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <p style="color:#94a3b8;font-size:15px;margin:0 0 8px;">Hi <strong style="color:#e2e8f0;">${name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">${bodyText}</p>
    <div style="background:#0f172a;border:2px solid #334155;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
      <span style="font-size:42px;font-weight:800;color:#ffffff;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</span>
    </div>
    <p style="color:#64748b;font-size:13px;margin:0;">⏱ Expires in <strong style="color:#94a3b8;">10 minutes</strong>. Do not share this code.</p>
  </div>
</div></body></html>`),
  })
}

export async function POST(req: NextRequest) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json({ error: 'Email not configured on server.' }, { status: 503 })
    }
    const { email, purpose, name } = await req.json()
    if (!email || !purpose) return NextResponse.json({ error: 'Email and purpose required' }, { status: 400 })
    if (!['verify', 'reset'].includes(purpose)) return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 })

    // For reset, user must exist and be verified
    if (purpose === 'reset') {
      const user = await getUserByEmail(email)
      if (!user) return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 })
      // Email was verified via OTP during registration; no secondary gate needed
    }

    const otp = String(randomInt(100000, 999999))
    await saveOtp(email, otp, purpose as 'verify' | 'reset')
    await sendOtpEmail(email, otp, purpose as 'verify' | 'reset', name || email.split('@')[0])

    return NextResponse.json({ success: true, message: `OTP sent to ${email}` })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
