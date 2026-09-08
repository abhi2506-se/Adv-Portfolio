import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import nodemailer from 'nodemailer'
import { verifyToken } from '@/lib/admin-auth'
import { NOTIFICATIONS_FROM, withNoReplyNotice } from '@/lib/mail-identities'

const sql = neon(process.env.DATABASE_URL!)
const SESSION_COOKIE = 'portfolio_admin_session'

async function ensureTable() {
  await sql`CREATE TABLE IF NOT EXISTS journey_likes (
    post_id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{"count":0,"comments":[]}'::jsonb
  )`
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function sendCommentNotificationToAdmin(author: string, text: string, postId: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) return
  try {
    await transporter.sendMail({
      from: NOTIFICATIONS_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `💬 New Comment on Post: ${postId}`,
      html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);border-radius:16px 16px 0 0;padding:24px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">💬 New Comment</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Someone commented on your journey post</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:24px 32px;border:1px solid #334155;border-top:none;">
    <p style="color:#94a3b8;font-size:14px;margin:0 0 4px;"><strong style="color:#e2e8f0;">From:</strong> ${author}</p>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 4px;"><strong style="color:#e2e8f0;">Post:</strong> ${postId}</p>
    <div style="background:#0f172a;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;padding:12px 16px;margin-top:12px;">
      <p style="color:#e2e8f0;font-size:14px;margin:0;">${text}</p>
    </div>
    <p style="color:#64748b;font-size:12px;margin-top:16px;">Login to admin dashboard to reply.</p>
  </div>
</div></body></html>`),
    })
  } catch (e) { console.error('Comment notify email failed:', e) }
}

async function sendReplyNotificationToUser(userEmail: string, userName: string, adminReply: string, originalComment: string, postId: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return
  try {
    await transporter.sendMail({
      from: NOTIFICATIONS_FROM,
      to: userEmail,
      subject: `💬 Abhishek replied to your comment`,
      html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#059669,#0891b2);border-radius:16px 16px 0 0;padding:24px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700;">💬 You got a reply!</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Abhishek replied to your comment on his portfolio</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:24px 32px;border:1px solid #334155;border-top:none;">
    <p style="color:#94a3b8;font-size:14px;margin:0 0 12px;">Hi <strong style="color:#e2e8f0;">${userName}</strong>,</p>
    <div style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:12px 16px;margin-bottom:12px;">
      <p style="color:#64748b;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.05em;">Your comment</p>
      <p style="color:#94a3b8;font-size:13px;margin:0;font-style:italic;">${originalComment}</p>
    </div>
    <div style="background:#0f172a;border-left:3px solid #10b981;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:16px;">
      <p style="color:#64748b;font-size:11px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.05em;">Abhishek's reply</p>
      <p style="color:#e2e8f0;font-size:14px;margin:0;">${adminReply}</p>
    </div>
    <p style="color:#64748b;font-size:12px;margin:0;">Visit the portfolio to see the full conversation.</p>
  </div>
</div></body></html>`),
    })
  } catch (e) { console.error('Reply notify email failed:', e) }
}

export async function GET(req: Request) {
  try {
    await ensureTable()
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get('postId')
    if (!postId) return NextResponse.json({ error: 'Missing postId' }, { status: 400 })
    const rows = await sql`SELECT data FROM journey_likes WHERE post_id = ${postId}`
    if (!rows.length) return NextResponse.json({ count: 0, comments: [] })
    return NextResponse.json(rows[0].data)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable()
    const body = await req.json()
    const { postId, action } = body

    const rows = await sql`SELECT data FROM journey_likes WHERE post_id = ${postId}`
    const current = rows.length ? rows[0].data : { count: 0, comments: [] }
    let updated = { ...current, comments: [...(current.comments || [])] }

    if (action === 'like') {
      updated.count = (updated.count || 0) + 1

    } else if (action === 'comment') {
      const { author, text, email } = body
      if (!text?.trim()) return NextResponse.json({ error: 'Comment text required' }, { status: 400 })
      const comment = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        author: author || 'Anonymous',
        email: email || '',
        text: text.trim(),
        createdAt: Date.now(),
        adminReply: null,
        adminRepliedAt: null,
      }
      updated.comments = [...updated.comments, comment]
      // Notify admin of new comment (non-blocking)
      sendCommentNotificationToAdmin(comment.author, comment.text, postId).catch(() => {})

    } else if (action === 'adminReply') {
      // Admin-only: add reply to a specific comment
      const cookieHeader = req.headers.get('cookie') || ''
      const sessionMatch = cookieHeader.match(/portfolio_admin_session=([^;]+)/)
      const token = sessionMatch?.[1]
      if (!token || !verifyToken(token)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const { commentId, replyText } = body
      if (!commentId || !replyText?.trim()) return NextResponse.json({ error: 'Missing commentId or replyText' }, { status: 400 })

      let targetComment: any = null
      updated.comments = updated.comments.map((c: any) => {
        if (c.id === commentId) {
          targetComment = c
          return { ...c, adminReply: replyText.trim(), adminRepliedAt: Date.now() }
        }
        return c
      })

      // Email user if they provided an email
      if (targetComment?.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetComment.email)) {
        sendReplyNotificationToUser(targetComment.email, targetComment.author, replyText.trim(), targetComment.text, postId).catch(() => {})
      }

    } else if (action === 'deleteComment') {
      const { commentId } = body
      updated.comments = updated.comments.filter((c: any) => c.id !== commentId)
    }

    await sql`INSERT INTO journey_likes (post_id, data) VALUES (${postId}, ${JSON.stringify(updated)})
      ON CONFLICT (post_id) DO UPDATE SET data = EXCLUDED.data`
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
