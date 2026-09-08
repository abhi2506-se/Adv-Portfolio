import { NextResponse } from 'next/server'
import { dbSaveContactMessage, dbGetContactMessages, dbGetContactMessagesSummary, dbDeleteContactMessage, dbArchiveContactMessage, dbSaveSuspiciousActivity, dbIsIPBlocked, dbBlockIP, dbGetSuspiciousActivities } from '@/lib/db'
import nodemailer from 'nodemailer'
import { sendPushToAdmin } from '@/lib/notifications'
import { SYSTEM_FROM, CONTACT_FROM, withNoReplyNotice } from '@/lib/mail-identities'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// ─── Abuse pattern detection (mirrors suspicious-activity-detector.tsx) ────────
const ABUSE_PATTERNS = [
  // English
  /\bf+u+c+k+\b/i, /\bs+h+i+t+\b/i, /bastard/i, /\bbitch\b/i, /asshole/i,
  /\bidiot\b/i, /\bmoron\b/i, /hate\s+you/i, /kill\s+you/i, /\bcunt\b/i,
  /\bwhore\b/i, /\bretard\b/i, /\bfaggot\b/i, /\bslut\b/i, /\bnigger\b/i,
  /\bdumbass\b/i, /\barse\b/i, /\bdick\b/i, /piece\s+of\s+shit/i,
  // Hindi Devanagari
  /गांडू/i, /चुतिया/i, /मादरचोद/i, /बेहेनचोद/i, /रंडी/i, /हरामी/i,
  /कमीना/i, /भड़वा/i, /सूअर/i, /कुत्ता/i, /हरामज़ादा/i,
  /लौड़ा/i, /लंड/i, /भोसड़ी/i, /चोद/i, /गांड/i,
  // Hindi Roman
  /\bgaandu\b/i, /\bchutiya\b/i, /\bmadarchod\b/i, /\bbehenchod\b/i,
  /\brandi\b/i, /\bharami\b/i, /\bkamina\b/i, /\bbhadwa\b/i, /\bharamzada\b/i,
  /\blawda\b/i, /\bchod\b/i, /\bsaala\b/i, /\bmc\b/i, /\bbc\b/i, /\bbkl\b/i, /\bbhosdike\b/i,
  // South Asian languages
  /ਮਾਦਰਚੋਦ/i, /ਭੈਣਚੋਦ/i, /মাদারচোদ/i, /শালা/i, /ஓட்டா/i, /நாயே/i,
  /ಸೂಳೆ/i, /ನಾಯಿ/i, /மாதர்சோத/i,
]

function detectContactAbuse(text: string): boolean {
  return ABUSE_PATTERNS.some(p => p.test(text))
}

async function reportAbuseToSecurity(name: string, email: string, message: string, ip: string, ua: string) {
  try {
    // Auto-block logic
    const allActivities = await dbGetSuspiciousActivities(500) as any[]
    const prevCount = allActivities.filter((a: any) => a.ip === ip && a.type === 'ABUSIVE_LANGUAGE').length
    let blockHours = prevCount >= 2 ? 48 : 24 // Always block for abusive contact messages
    let blocked = false
    let unblockAt = 0

    try {
      const isBlocked = await dbIsIPBlocked(ip)
      if (!isBlocked && blockHours > 0) {
        unblockAt = Date.now() + blockHours * 60 * 60 * 1000
        await dbBlockIP(ip, `Auto-blocked: ABUSIVE_LANGUAGE in contact form (${prevCount + 1} offences)`, unblockAt)
        blocked = true
      }
    } catch {}

    const activity = {
      id: `sus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
      type: 'ABUSIVE_LANGUAGE',
      ip,
      location: '',
      device: ua.slice(0, 200),
      details: `Abusive language in contact form. From: ${name} <${email}>. Message: "${message.slice(0, 200)}"`,
      created_at: Date.now(),
      blocked,
    }
    await dbSaveSuspiciousActivity(activity)

    // Also send security email
    if (process.env.SMTP_USER && process.env.SMTP_PASS && process.env.ADMIN_EMAIL) {
      const mailTransport = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
      mailTransport.sendMail({
        from: SYSTEM_FROM,
        to: process.env.ADMIN_EMAIL,
        subject: `🚨 Abusive Contact Form Message — ${blocked ? `Blocked ${blockHours}h` : 'Review Required'}`,
        html: withNoReplyNotice(`<div style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:12px;max-width:520px">
          <h2 style="color:#f87171;">🚨 Abusive Language Detected in Contact Form</h2>
          <p><strong>From:</strong> ${name} &lt;${email}&gt;</p>
          <p><strong>IP:</strong> ${ip}</p>
          <p><strong>Message:</strong></p>
          <blockquote style="border-left:3px solid #f87171;padding-left:12px;color:#fca5a5;">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</blockquote>
          ${blocked ? `<p style="color:#fbbf24;font-weight:bold;">✅ User auto-blocked for ${blockHours} hours.</p>` : ''}
          <p style="color:#64748b;font-size:12px;">Review in admin panel → Suspicious Activity tab.</p>
        </div>`),
      }).catch(() => {})
    }
  } catch (e) {
    console.error('[contact] Abuse report failed:', e)
  }
}

// Detect hiring intent from message text
function detectIntent(message: string): string {
  const lower = message.toLowerCase()
  const hiringKeywords = [
    'hire', 'hiring', 'job', 'opportunity', 'position', 'role', 'work', 'freelance',
    'contract', 'project', 'collaborate', 'team', 'salary', 'offer', 'interview',
    'recruit', 'developer', 'engineer', 'remote', 'full-time', 'part-time',
  ]
  return hiringKeywords.some(kw => lower.includes(kw)) ? 'hiring' : 'general'
}

async function sendAdminNotification({
  name, email, subject, message, intent, receivedAt,
}: { name: string; email: string; subject: string; message: string; intent: string; receivedAt: string }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) return

  const intentLabel = intent === 'hiring' ? '💼 Hiring Intent' : '💬 General Query'
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="background:linear-gradient(135deg,#1e40af,#0891b2);border-radius:16px 16px 0 0;padding:28px 32px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">📬 New Portfolio Message</h1>
      <p style="margin:6px 0 0;color:#bae6fd;font-size:14px;">Someone reached out via your portfolio contact form</p>
    </div>
    <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#06b6d4);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <span style="color:#fff;font-size:18px;font-weight:700;">${name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <p style="margin:0;color:#f1f5f9;font-weight:600;font-size:16px;">${name}</p>
          <a href="mailto:${email}" style="color:#60a5fa;font-size:13px;text-decoration:none;">${email}</a>
        </div>
        <span style="margin-left:auto;background:${intent === 'hiring' ? '#78350f' : '#1e3a5f'};color:${intent === 'hiring' ? '#fbbf24' : '#93c5fd'};padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;">${intentLabel}</span>
      </div>

      <div style="background:#0f172a;border-radius:10px;padding:16px 20px;margin-bottom:20px;border-left:3px solid #3b82f6;">
        ${subject ? `<p style="margin:0 0 8px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Subject</p><p style="margin:0 0 12px;color:#e2e8f0;font-size:14px;font-weight:500;">${subject}</p>` : ''}
        <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
        <p style="margin:0;color:#cbd5e1;font-size:14px;line-height:1.7;">${message.replace(/\n/g, '<br>')}</p>
      </div>

      <div style="background:#0f172a;border-radius:10px;padding:12px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#64748b;font-size:12px;">⏰ Received: <strong style="color:#94a3b8;">${receivedAt}</strong></p>
      </div>

      <a href="https://portfolio-v13.vercel.app/admin/dashboard" style="display:block;text-align:center;background:linear-gradient(135deg,#2563eb,#0891b2);color:#fff;font-weight:600;font-size:14px;padding:14px;border-radius:10px;text-decoration:none;">
        Open Admin Panel →
      </a>
    </div>
    <p style="text-align:center;color:#475569;font-size:12px;margin-top:16px;">Abhishek Singh Portfolio — Auto-notification</p>
  </div>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: CONTACT_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `📬 New ${intent === 'hiring' ? '💼 Hiring' : '💬 General'} message from ${name}`,
      html,
    })
  } catch (e) {
    console.error('[contact] Admin notification failed:', e)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, subject, message } = body

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // ── Abuse detection in contact form ──────────────────────────────────────
    const fullText = `${name} ${subject || ''} ${message}`
    if (detectContactAbuse(fullText)) {
      // Get sender IP from headers
      const forwarded = (req as any).headers?.get?.('x-forwarded-for') ||
        (req as any).headers?.['x-forwarded-for'] || ''
      const realIp = (req as any).headers?.get?.('x-real-ip') ||
        (req as any).headers?.['x-real-ip'] || ''
      const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : '') ||
        (typeof realIp === 'string' ? realIp : '') || 'unknown'
      const ua = (req as any).headers?.get?.('user-agent') ||
        (req as any).headers?.['user-agent'] || 'unknown'

      // Report abuse asynchronously (don't block the response)
      reportAbuseToSecurity(name.trim(), email.trim(), message.trim(), ip, ua).catch(() => {})
    }

    const intent = detectIntent(message)
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = Date.now()

    // Save to DB — wrapped in try/catch so a DB outage never blocks the form.
    // The admin still receives the email notification even if the DB save fails.
    try {
      await dbSaveContactMessage({
        id,
        name: name.trim().slice(0, 100),
        email: email.trim().toLowerCase().slice(0, 200),
        subject: subject?.trim().slice(0, 200) || '',
        message: message.trim().slice(0, 2000),
        intent,
        created_at: now,
      })
    } catch (dbErr) {
      console.error('[contact] DB save failed (non-fatal):', dbErr)
      // Continue — still send email + push so admin is notified
    }

    // Send admin notification instantly (non-blocking)
    const receivedAt = new Date(now).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    })
    sendAdminNotification({
      name: name.trim(),
      email: email.trim(),
      subject: subject?.trim() || '',
      message: message.trim(),
      intent,
      receivedAt,
    })

    // Push notification to admin device (non-blocking)
    sendPushToAdmin({
      title: intent === 'hiring' ? '💼 New Hiring Inquiry!' : '📬 New Contact Message',
      body: `${name.trim()} — "${(message.trim()).slice(0, 80)}${message.length > 80 ? '…' : ''}"`,
      tag: 'contact-message',
      url: '/admin',
    }).catch(() => {})

    return NextResponse.json({ ok: true, intent })
  } catch (e) {
    console.error('[contact] POST error:', e)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'list'
    const includeArchived = searchParams.get('archived') === 'true'

    if (type === 'summary') {
      const summary = await dbGetContactMessagesSummary()
      return NextResponse.json({ data: summary })
    }

    // Fixed: Fetch messages with proper logging and error handling
    try {
      // Fetch all messages (both active and archived)
      const allMessages = await dbGetAllContactMessages(100)
      
      // Filter based on request parameter if needed
      const messages = includeArchived ? allMessages : allMessages.filter((m: any) => !m.archived)
      
      // Ensure data is properly formatted
      const formattedMessages = Array.isArray(messages) ? messages.map((m: any) => ({
        id: String(m.id || ''),
        name: String(m.name || ''),
        email: String(m.email || ''),
        subject: String(m.subject || ''),
        message: String(m.message || ''),
        intent: String(m.intent || 'general'),
        archived: Boolean(m.archived),
        // Ensure created_at is a number (timestamp in milliseconds)
        created_at: typeof m.created_at === 'string' ? parseInt(m.created_at, 10) : Number(m.created_at),
      })) : []
      
      console.log(`[contact] Fetched ${formattedMessages.length} messages (archived=${includeArchived})`)
      return NextResponse.json({ data: formattedMessages })
    } catch (dbErr) {
      console.error('[contact] Database fetch failed:', dbErr)
      return NextResponse.json({ data: [], error: 'Failed to fetch messages' }, { status: 500 })
    }
  } catch (e) {
    console.error('[contact] GET error:', e)
    return NextResponse.json({ data: [], error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await dbDeleteContactMessage(id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[contact] DELETE error:', e)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const action = searchParams.get('action')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    if (action === 'archive') {
      await dbArchiveContactMessage(id)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[contact] PATCH error:', e)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}
