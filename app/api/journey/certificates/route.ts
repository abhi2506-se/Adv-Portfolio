import { NextResponse } from 'next/server'
import { dbGetCertificates, dbSaveCertificate, dbDeleteCertificate, dbGetFollowers } from '@/lib/db'
import nodemailer from 'nodemailer'
import { NOTIFICATIONS_FROM, withNoReplyNotice } from '@/lib/mail-identities'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function notifyFollowersNewCert(certTitle: string, certIssuer: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return
  try {
    const followers = await dbGetFollowers(1000)
    const emailFollowers = (followers as any[]).filter((f: any) => f.email)
    for (const follower of emailFollowers) {
      try {
        await transporter.sendMail({
          from: NOTIFICATIONS_FROM,
          to: follower.email,
          subject: `🏆 New Certificate: ${certTitle}`,
          html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:16px 16px 0 0;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🏆 New Certificate!</h1>
    <p style="margin:6px 0 0;color:#ddd6fe;font-size:14px;">Abhishek just earned a new certification</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <p style="color:#e2e8f0;font-size:15px;">Hi <strong>${follower.name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Abhishek just added a new certificate to his Abhigram Journey:</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="color:#f1f5f9;font-size:16px;font-weight:700;margin:0;">🏆 ${certTitle}</p>
      <p style="color:#94a3b8;font-size:13px;margin:8px 0 0;">Issued by: ${certIssuer}</p>
    </div>
    <p style="color:#64748b;font-size:12px;">You're receiving this because you follow Abhishek's journey. Visit the portfolio to view the certificate.</p>
  </div>
</div></body></html>`),
        })
      } catch {}
    }
  } catch (e) { console.error('Notify followers cert error:', e) }
}

export async function GET() {
  try {
    const certs = await dbGetCertificates()
    return NextResponse.json(certs)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const cert = await req.json()
    const isNew = !cert.id || cert._isNew
    await dbSaveCertificate(cert)
    if (isNew && cert.title) {
      await notifyFollowersNewCert(cert.title, cert.issuer || 'Unknown').catch(() => {})
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    await dbDeleteCertificate(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
