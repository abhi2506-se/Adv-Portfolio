import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import nodemailer from 'nodemailer'
import { NOTIFICATIONS_FROM, withNoReplyNotice } from '@/lib/mail-identities'

const sql = neon(process.env.DATABASE_URL!)

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function notifyAdminNewTestimonial(name: string, company: string, jobTitle: string, text: string, id: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.ADMIN_EMAIL) return
  try {
    await transporter.sendMail({
      from: NOTIFICATIONS_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `⭐ New Testimonial from ${name}`,
      html: withNoReplyNotice(`<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;">
  <div style="background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:16px 16px 0 0;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">⭐ New Testimonial Submitted</h1>
    <p style="margin:6px 0 0;color:#fef3c7;font-size:14px;">A visitor submitted a testimonial for your approval</p>
  </div>
  <div style="background:#1e293b;border-radius:0 0 16px 16px;padding:28px 32px;border:1px solid #334155;border-top:none;">
    <p style="color:#94a3b8;font-size:14px;margin:0 0 4px;"><strong style="color:#e2e8f0;">From:</strong> ${name}${jobTitle ? `, ${jobTitle}` : ''}${company ? ` at ${company}` : ''}</p>
    <div style="background:#0f172a;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:12px 16px;margin-top:12px;">
      <p style="color:#e2e8f0;font-size:14px;margin:0;line-height:1.6;">${text.replace(/\n/g, '<br>')}</p>
    </div>
    <p style="color:#64748b;font-size:12px;margin-top:16px;">Login to admin dashboard → Testimonials to review and approve.</p>
  </div>
</div></body></html>`),
    })
  } catch (e) { console.error('Testimonial notify email error:', e) }
}

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS testimonials (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      job_title TEXT NOT NULL,
      company TEXT NOT NULL,
      text TEXT NOT NULL,
      photo_url TEXT NOT NULL DEFAULT '',
      rating INTEGER NOT NULL DEFAULT 5,
      linkedin_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      submitted_by_email TEXT NOT NULL DEFAULT '',
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
      approved_at BIGINT,
      submitted_at BIGINT,
      blue_tick BOOLEAN NOT NULL DEFAULT FALSE
    )
  `
  // Add columns for existing tables that might be missing them
  await sql`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS submitted_at BIGINT`.catch(() => {})
  await sql`ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS blue_tick BOOLEAN NOT NULL DEFAULT FALSE`.catch(() => {})
}

// GET: fetch approved testimonials (public) or all (admin)
export async function GET(req: Request) {
  try {
    await ensureTables()
    const { searchParams } = new URL(req.url)
    const admin = searchParams.get('admin') === '1'
    const pending = searchParams.get('pending') === '1'

    let rows
    if (admin && pending) {
      rows = await sql`SELECT * FROM testimonials WHERE status = 'pending' ORDER BY created_at DESC`
    } else if (admin) {
      rows = await sql`SELECT * FROM testimonials ORDER BY created_at DESC`
    } else {
      rows = await sql`SELECT * FROM testimonials WHERE status = 'approved' ORDER BY approved_at DESC`
    }

    return NextResponse.json({ testimonials: rows })
  } catch (e) {
    console.error('[testimonials] GET error:', e)
    return NextResponse.json({ testimonials: [] })
  }
}

// POST: submit a new testimonial (user)
export async function POST(req: Request) {
  try {
    await ensureTables()
    const body = await req.json()
    const { name, job_title, company, text, photo_url, rating, linkedin_url, submitted_by_email } = body

    if (!name || !job_title || !company || !text) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Photo is now mandatory
    if (!photo_url || photo_url.trim() === '') {
      return NextResponse.json({ ok: false, error: 'Profile photo is required' }, { status: 400 })
    }

    const now = Date.now()
    const id = `t_${now}_${Math.random().toString(36).slice(2, 8)}`
    await sql`
      INSERT INTO testimonials (id, name, job_title, company, text, photo_url, rating, linkedin_url, submitted_by_email, status, created_at, submitted_at, blue_tick)
      VALUES (${id}, ${name}, ${job_title}, ${company}, ${text}, ${photo_url}, ${rating || 5}, ${linkedin_url || ''}, ${submitted_by_email || ''}, 'pending', ${now}, ${now}, FALSE)
    `

    // Try to notify admin via existing notification system
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/admin/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'testimonial',
          title: 'New Testimonial Request',
          body: `${name} from ${company} submitted a testimonial for approval.`,
          data: { testimonialId: id },
        }),
      }).catch(() => {}) // non-fatal
    } catch {}

    // Email notification (non-blocking)
    notifyAdminNewTestimonial(name, company, job_title, text, id).catch(() => {})

    return NextResponse.json({ ok: true, id })
  } catch (e) {
    console.error('[testimonials] POST error:', e)
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}

// PATCH: admin approve, reject, delete, or toggle blue_tick
export async function PATCH(req: Request) {
  try {
    await ensureTables()
    const { id, action, blue_tick } = await req.json()

    if (action === 'approve') {
      await sql`UPDATE testimonials SET status = 'approved', approved_at = ${Date.now()} WHERE id = ${id}`
    } else if (action === 'reject') {
      await sql`UPDATE testimonials SET status = 'rejected' WHERE id = ${id}`
    } else if (action === 'delete') {
      await sql`DELETE FROM testimonials WHERE id = ${id}`
    } else if (action === 'toggle_blue_tick') {
      // blue_tick can be toggled independently of approval status
      await sql`UPDATE testimonials SET blue_tick = ${blue_tick === true} WHERE id = ${id}`
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[testimonials] PATCH error:', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
