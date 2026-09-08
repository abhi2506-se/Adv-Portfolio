export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getAdminCredentials } from '@/lib/credentials-store'
import { SYSTEM_FROM, withNoReplyNotice } from '@/lib/mail-identities'
import {
  verifyCoAdminCredentials, verifyCoAdminAnswer, requestEnable, getCoAdminByUsername,
} from '@/lib/co-admin-db'
import { generateCoAdminToken, CO_ADMIN_SESSION_COOKIE, CO_ADMIN_SESSION_MAX_AGE_SECONDS } from '@/lib/co-admin-auth'

async function notifyRealAdmin(subject: string, html: string) {
  try {
    const admin = await getAdminCredentials()
    const to = admin.email || admin.username
    if (!to || !to.includes('@')) return
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await transporter.sendMail({ from: SYSTEM_FROM, to, subject, html: withNoReplyNotice(html) })
  } catch {
    // Never block the login flow on a notification failure.
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { step } = body

    // ── Step 1: relation + username + password → reveals the security question ──
    if (step === 'credentials') {
      const { relation, username, password } = body
      if (!relation || !username || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      const result = await verifyCoAdminCredentials(relation, username, password)
      if (result.status === 'invalid') return NextResponse.json({ error: 'Invalid relation, username, or password.' }, { status: 401 })
      if (result.status === 'blocked') return NextResponse.json({ blocked: true, error: 'This account is blocked. Only the real admin can unblock it.' }, { status: 403 })
      if (result.status === 'disabled') return NextResponse.json({ disabled: true, error: 'This account has been disabled by the admin.' }, { status: 403 })
      return NextResponse.json({ ok: true, question: result.question })
    }

    // ── Step 2: security-question answer → 3 attempts, then blocked ──
    if (step === 'answer') {
      const { username, answer } = body
      if (!username || !answer) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
      const result = await verifyCoAdminAnswer(username, answer)

      if (result.status === 'invalid') return NextResponse.json({ error: 'Session expired, please start over.' }, { status: 401 })

      if (result.status === 'blocked') {
        await notifyRealAdmin(
          `🚫 Co-admin blocked: ${result.name || username}`,
          `<div style="font-family:sans-serif;padding:24px;background:#0f172a;color:#e2e8f0;">
            <h2 style="color:#f87171;">Co-admin account blocked</h2>
            <p><strong>${result.name || username}</strong> (username: ${username}) got the security question wrong 3 times in a row and has been automatically blocked from logging in.</p>
            <p>Go to your dashboard's Co-Admins section to review and unblock this account if this was legitimate.</p>
          </div>`
        )
        return NextResponse.json({ blocked: true, error: 'Too many wrong answers. This account is now blocked — only the real admin can unblock it.' }, { status: 403 })
      }

      if (result.status === 'wrong') {
        // Per spec: a wrong security-question answer alerts the real admin immediately.
        notifyRealAdmin(
          `⚠️ Co-admin login: wrong security answer`,
          `<div style="font-family:sans-serif;padding:24px;background:#0f172a;color:#e2e8f0;">
            <h2 style="color:#fbbf24;">Wrong security answer</h2>
            <p>Someone logging in as co-admin <strong>${username}</strong> answered the security question incorrectly.</p>
            <p>${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} remaining before the account is automatically blocked.</p>
          </div>`
        ).catch(() => {})
        return NextResponse.json({ ok: false, attemptsLeft: result.attemptsLeft, error: `Incorrect answer. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left.` })
      }

      // status === 'ok'
      const token = generateCoAdminToken(result.id, username, result.permissions)
      const res = NextResponse.json({ ok: true, name: result.name, permissions: result.permissions })
      res.cookies.set(CO_ADMIN_SESSION_COOKIE, token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
        maxAge: CO_ADMIN_SESSION_MAX_AGE_SECONDS, path: '/',
      })
      return res
    }

    // ── A disabled co-admin can ask the real admin to re-enable them ──
    if (step === 'request_enable') {
      const { username } = body
      if (!username) return NextResponse.json({ error: 'Missing username' }, { status: 400 })
      const row = await getCoAdminByUsername(username)
      if (!row) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      await requestEnable(username)
      await notifyRealAdmin(
        `🙋 Enable request from ${row.name}`,
        `<div style="font-family:sans-serif;padding:24px;background:#0f172a;color:#e2e8f0;">
          <h2 style="color:#60a5fa;">Co-admin wants to be re-enabled</h2>
          <p><strong>${row.name}</strong> (username: ${username}, relation: ${row.relation}) tried to log in and asked to be re-enabled.</p>
          <p>Go to your dashboard's Co-Admins section to review.</p>
        </div>`
      )
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown step' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
