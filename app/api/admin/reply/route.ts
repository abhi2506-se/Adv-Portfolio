import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { to, subject, message, senderName, originalMessage, originalDate } = body

    if (!to?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 })
    }

    const repliedAt = new Date().toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    })

    const adminName = senderName || 'Abhishek Singh'
    const recipientFirstName = to.split('@')[0]

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Reply from ${adminName}</title>
</head>
<body style="margin:0;padding:0;background:#060918;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#060918;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;">

        <!-- TOP GLOW LINE -->
        <tr><td style="padding-bottom:3px;">
          <div style="height:2px;background:linear-gradient(to right,transparent,#6366f1,#8b5cf6,#06b6d4,transparent);border-radius:999px;"></div>
        </td></tr>

        <!-- HEADER -->
        <tr><td style="border-radius:20px 20px 0 0;background:linear-gradient(135deg,#0f0c29 0%,#1a1060 50%,#091628 100%);padding:36px 36px 28px;text-align:center;">
          <!-- Avatar ring -->
          <div style="width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4);margin:0 auto 4px;padding:3px;">
            <div style="width:70px;height:70px;border-radius:50%;background:#0f0c29;line-height:70px;text-align:center;font-size:28px;">✉️</div>
          </div>
          <h1 style="margin:16px 0 4px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">You've Got a Reply!</h1>
          <p style="margin:0;color:#a5b4fc;font-size:13px;">from <strong style="color:#818cf8;">${adminName}</strong></p>
        </td></tr>

        <!-- META ROW -->
        <tr><td style="background:#0a0e1a;border-left:1px solid #1e2d4a;border-right:1px solid #1e2d4a;padding:0 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #1e2d4a;border-bottom:1px solid #1e2d4a;padding:14px 0;">
            <tr>
              <td width="33%" style="text-align:center;padding:10px 8px;border-right:1px solid #1e2d4a;">
                <p style="margin:0 0 3px;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">📅 Date</p>
                <p style="margin:0;color:#94a3b8;font-size:12px;font-weight:500;">${repliedAt.split(',')[0]}</p>
              </td>
              <td width="34%" style="text-align:center;padding:10px 8px;border-right:1px solid #1e2d4a;">
                <p style="margin:0 0 3px;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">🕐 Time</p>
                <p style="margin:0;color:#94a3b8;font-size:12px;font-weight:500;">${repliedAt.split(', ').slice(-1)[0]} IST</p>
              </td>
              <td width="33%" style="text-align:center;padding:10px 8px;">
                <p style="margin:0 0 3px;color:#475569;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">👤 From</p>
                <p style="margin:0;color:#94a3b8;font-size:12px;font-weight:500;">${adminName}</p>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- BODY -->
        <tr><td style="background:#0d1117;border-left:1px solid #1e2d4a;border-right:1px solid #1e2d4a;padding:28px 36px;">

          <!-- Subject -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
            <tr><td style="background:#0f172a;border:1px solid #1e2d4a;border-radius:10px;padding:12px 18px;">
              <p style="margin:0 0 3px;color:#6366f1;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📌 Re: Subject</p>
              <p style="margin:0;color:#e2e8f0;font-size:15px;font-weight:600;">${subject.replace(/^Re:\s*/i, '')}</p>
            </td></tr>
          </table>

          <!-- Greeting -->
          <p style="margin:0 0 18px;color:#94a3b8;font-size:14px;line-height:1.6;">
            Hi <strong style="color:#e2e8f0;">${recipientFirstName}</strong>,<br>
            Thank you for reaching out. Here's my response to your query:
          </p>

          <!-- Reply content -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
            <tr><td style="background:#0a0f1e;border:1px solid #1e2d4a;border-left:3px solid #6366f1;border-radius:0 10px 10px 0;padding:20px 22px;">
              <p style="margin:0 0 10px;color:#6366f1;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">💬 Reply</p>
              <p style="margin:0;color:#e2e8f0;font-size:15px;line-height:1.85;white-space:pre-wrap;">${message.trim().replace(/\n/g, '<br>')}</p>
            </td></tr>
          </table>

          ${originalMessage ? `
          <!-- Original message thread -->
          <div style="margin-bottom:24px;">
            <p style="margin:0 0 10px;color:#334155;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">── Your original message ──</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="background:#080c14;border:1px solid #1a2233;border-left:3px solid #334155;border-radius:0 8px 8px 0;padding:14px 18px;">
                ${originalDate ? `<p style="margin:0 0 8px;color:#334155;font-size:11px;">Sent on ${originalDate}</p>` : ''}
                <p style="margin:0;color:#475569;font-size:13px;line-height:1.7;">${originalMessage.replace(/\n/g, '<br>')}</p>
              </td></tr>
            </table>
          </div>` : ''}

          <!-- Sign-off -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
            <tr><td style="background:linear-gradient(135deg,#0f172a,#0a0f1e);border:1px solid #1e2d4a;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 4px;color:#e2e8f0;font-size:14px;font-weight:600;">Warm regards,</p>
              <p style="margin:0 0 2px;color:#818cf8;font-size:16px;font-weight:800;">${adminName}</p>
              <p style="margin:0;color:#475569;font-size:12px;">Full-Stack Developer · Portfolio</p>
            </td></tr>
          </table>

          <!-- Visit portfolio CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center">
              <a href="https://portfolio-v13.vercel.app/" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;font-weight:700;font-size:13px;padding:13px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.3px;">
                Visit My Portfolio 🚀
              </a>
            </td></tr>
          </table>

        </td></tr>

        <!-- FOOTER -->
        <tr><td style="background:#080c16;border:1px solid #1e2d4a;border-top:0;border-radius:0 0 20px 20px;padding:18px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td><p style="margin:0;color:#334155;font-size:11px;">This is a personal reply from ${adminName}</p></td>
              <td align="right"><p style="margin:0;color:#334155;font-size:11px;">Please do not forward this email</p></td>
            </tr>
          </table>
        </td></tr>

        <!-- BOTTOM GLOW LINE -->
        <tr><td style="padding-top:3px;">
          <div style="height:2px;background:linear-gradient(to right,transparent,#6366f1,#8b5cf6,#06b6d4,transparent);border-radius:999px;"></div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    await transporter.sendMail({
      from: `"${adminName}" <${process.env.SMTP_USER}>`,
      to: to.trim(),
      subject: `Re: ${subject.trim().replace(/^Re:\s*/i, '')}`,
      html,
      replyTo: process.env.SMTP_USER,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[reply] POST error:', e)
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 })
  }
}
