import { NextRequest, NextResponse } from 'next/server'
import { dbGetFollowersCount, dbCheckFollower, dbAddFollower, dbRemoveFollower, dbGetFollowers } from '@/lib/db'
import nodemailer from 'nodemailer'
import { NOTIFICATIONS_FROM, withNoReplyNotice } from '@/lib/mail-identities'

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') || 'unknown'
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function sendFollowerConfirmation(name: string, email: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !email) return
  try {
    await transporter.sendMail({
      from: NOTIFICATIONS_FROM,
      to: email,
      subject: '🎉 You are now following Abhishek\'s Journey!',
      html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#e11d48,#f97316);border-radius:16px 16px 0 0;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🎉 Following Confirmed!</h1>
    <p style="margin:6px 0 0;color:#fecdd3;font-size:14px;">You are now following Abhishek's Journey on Abhigram</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <p style="color:#e2e8f0;font-size:16px;">Hi <strong>${name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Thanks for following my journey! You'll receive updates whenever I post new blogs or earn certificates. Your follow is permanent — no need to follow again.</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:20px 0;">
      <p style="color:#64748b;font-size:12px;margin:0 0 4px;">Your follow details:</p>
      <p style="color:#e2e8f0;font-size:14px;margin:0;"><strong>Name:</strong> ${name}</p>
      <p style="color:#e2e8f0;font-size:14px;margin:4px 0 0;"><strong>Followed at:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </div>
    <p style="color:#94a3b8;font-size:13px;">— Abhishek Singh</p>
  </div>
</div></body></html>`),
    })
  } catch (e) { console.error('Follower confirmation email error:', e) }
}

async function sendAdminNewFollowerNotification(name: string, email: string, ip: string, followedAt: number) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) return
  try {
    await transporter.sendMail({
      from: NOTIFICATIONS_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `🎉 New Follower: ${name}`,
      html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:16px 16px 0 0;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🎉 New Follower!</h1>
    <p style="margin:6px 0 0;color:#ddd6fe;font-size:14px;">Someone just followed your Abhigram Journey</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <p style="color:#e2e8f0;font-size:15px;"><strong>${name}</strong> started following your journey.</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="color:#94a3b8;font-size:13px;margin:0;"><strong style="color:#e2e8f0;">Name:</strong> ${name}</p>
      <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;"><strong style="color:#e2e8f0;">Email:</strong> ${email || 'Not provided'}</p>
      <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;"><strong style="color:#e2e8f0;">IP:</strong> ${ip}</p>
      <p style="color:#94a3b8;font-size:13px;margin:6px 0 0;"><strong style="color:#e2e8f0;">Followed at:</strong> ${new Date(followedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
    </div>
  </div>
</div></body></html>`),
    })
  } catch (e) { console.error('Admin follower notification error:', e) }
}

export async function sendEmailToAllFollowers(subject: string, htmlContent: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return
  try {
    const followers = await dbGetFollowers(1000)
    const emailFollowers = (followers as any[]).filter((f: any) => f.email)
    for (const follower of emailFollowers) {
      try {
        await transporter.sendMail({
          from: NOTIFICATIONS_FROM,
          to: follower.email,
          subject,
          html: withNoReplyNotice(htmlContent.replace('{{name}}', follower.name || 'Follower')),
        })
      } catch {}
    }
  } catch (e) { console.error('Bulk follower email error:', e) }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fingerprint = searchParams.get('fingerprint') || ''
    const [count, isFollowing, followers] = await Promise.all([
      dbGetFollowersCount(),
      fingerprint ? dbCheckFollower(fingerprint) : Promise.resolve(false),
      searchParams.get('admin') === '1' ? dbGetFollowers(1000) : Promise.resolve([]),
    ])
    return NextResponse.json({ count, isFollowing, followers })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, name, email, fingerprint } = body
    const ip = getIP(req)

    if (action === 'follow') {
      // Both name and email are required
      if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
      if (!fingerprint) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 })

      const already = await dbCheckFollower(fingerprint)
      if (already) return NextResponse.json({ success: true, count: await dbGetFollowersCount(), alreadyFollowing: true })

      const followedAt = Date.now()
      await dbAddFollower({
        id: `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        email: email.trim(),
        ip,
        fingerprint,
        followed_at: followedAt,
      })

      // Send confirmation to follower and notification to admin (non-blocking)
      sendFollowerConfirmation(name.trim(), email.trim()).catch(() => {})
      sendAdminNewFollowerNotification(name.trim(), email.trim(), ip, followedAt).catch(() => {})

    } else if (action === 'unfollow') {
      if (!fingerprint) return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 })
      await dbRemoveFollower(fingerprint)

    } else if (action === 'admin_add_follower') {
      // Admin manually adding a follower — name and email required
      if (!name?.trim() || !email?.trim()) return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
      const fp = `admin_added_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
      const followedAt = Date.now()
      await dbAddFollower({
        id: `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        email: email.trim(),
        ip: ip,
        fingerprint: fp,
        followed_at: followedAt,
      })
    }

    const count = await dbGetFollowersCount()
    return NextResponse.json({ success: true, count })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
