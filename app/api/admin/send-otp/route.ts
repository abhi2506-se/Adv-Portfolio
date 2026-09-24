export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { randomInt, createHash } from 'crypto'
import nodemailer from 'nodemailer'
import { OTP_COOKIE } from '@/lib/admin-auth'
import { AUTH_FROM, withNoReplyNotice } from '@/lib/mail-identities'

const OTP_TTL_MS = 10 * 60 * 1000

function hashOtp(otp: string): string {
  const secret = process.env.SESSION_SECRET || 'portfolio-admin-otp-secret-2024'
  return createHash('sha256').update(otp + secret).digest('hex')
}

async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f172a;margin:0;padding:40px 20px;">
      <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#2563eb,#06b6d4);padding:32px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:white;letter-spacing:-1px;">🔐 Admin Login OTP</div>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Security Verification</p>
        </div>
        <div style="padding:32px;text-align:center;">
          <p style="color:#94a3b8;font-size:15px;margin:0 0 24px;">Your one-time verification code is:</p>
          <div style="background:#0f172a;border:2px solid #334155;border-radius:12px;padding:24px;display:inline-block;">
            <span style="font-size:42px;font-weight:800;color:white;letter-spacing:12px;font-family:'Courier New',monospace;">${otp}</span>
          </div>
          <p style="color:#64748b;font-size:13px;margin:24px 0 0;">
            ⏱ Expires in <strong style="color:#94a3b8;">10 minutes</strong><br/>
            Do not share this code with anyone.
          </p>
        </div>
      </div>
    </body>
    </html>
  `

  await transporter.sendMail({
    from: AUTH_FROM,
    to,
    subject: `🔐 Your OTP: ${otp} — Portfolio Admin Login`,
    html: withNoReplyNotice(html),
  })
}

export async function POST(request: Request) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return NextResponse.json(
        { success: false, message: 'Email not configured on server. Add SMTP_USER and SMTP_PASS to .env.local.' },
        { status: 503 }
      )
    }

    // Always send OTP to the configured ADMIN_EMAIL — no user input needed
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER
    if (!adminEmail) {
      return NextResponse.json(
        { success: false, message: 'ADMIN_EMAIL not configured.' },
        { status: 503 }
      )
    }

    const otp = String(randomInt(100000, 999999))
    const expiry = Date.now() + OTP_TTL_MS
    const otpHash = hashOtp(otp)

    const payload = JSON.stringify({ otpHash, email: adminEmail, expiry })
    const cookieValue = Buffer.from(payload).toString('base64')

    await sendOtpEmail(adminEmail, otp)

    const res = NextResponse.json({
      success: true,
      message: `OTP sent to your registered email. Check your inbox (and spam folder).`,
    })

    res.cookies.set(OTP_COOKIE, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })

    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[send-otp]', msg)
    return NextResponse.json(
      { success: false, message: `Failed to send OTP email: ${msg}` },
      { status: 500 }
    )
  }
}
