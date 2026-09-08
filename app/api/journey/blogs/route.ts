import { NextResponse } from 'next/server'
import { dbGetBlogs, dbSaveBlog, dbDeleteBlog, dbGetFollowers } from '@/lib/db'
import nodemailer from 'nodemailer'
import { NOTIFICATIONS_FROM, withNoReplyNotice } from '@/lib/mail-identities'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function notifyFollowersNewBlog(blogTitle: string, blogDescription: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return
  try {
    const followers = await dbGetFollowers(1000)
    const emailFollowers = (followers as any[]).filter((f: any) => f.email)
    for (const follower of emailFollowers) {
      try {
        await transporter.sendMail({
          from: NOTIFICATIONS_FROM,
          to: follower.email,
          subject: `📝 New Blog Post: ${blogTitle}`,
          html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#e11d48,#f97316);border-radius:16px 16px 0 0;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">📝 New Blog Post!</h1>
    <p style="margin:6px 0 0;color:#fecdd3;font-size:14px;">Abhishek just shared a new blog on Abhigram</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <p style="color:#e2e8f0;font-size:15px;">Hi <strong>${follower.name}</strong>,</p>
    <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Abhishek just published a new blog post on his Abhigram Journey:</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="color:#f1f5f9;font-size:16px;font-weight:700;margin:0;">${blogTitle}</p>
      <p style="color:#94a3b8;font-size:13px;margin:8px 0 0;">${blogDescription?.slice(0, 200) || ''}</p>
    </div>
    <p style="color:#64748b;font-size:12px;">You're receiving this because you follow Abhishek's journey. Visit the portfolio to read more.</p>
  </div>
</div></body></html>`),
        })
      } catch {}
    }
  } catch (e) { console.error('Notify followers error:', e) }
}

export async function GET() {
  try {
    const blogs = await dbGetBlogs()
    return NextResponse.json(blogs)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const post = await req.json()
    const isNew = !post.id || post._isNew
    await dbSaveBlog(post)
    // Notify followers only for new blogs (not updates)
    if (isNew && post.title) {
      await notifyFollowersNewBlog(post.title, post.description || '').catch(() => {})
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    await dbDeleteBlog(id)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
