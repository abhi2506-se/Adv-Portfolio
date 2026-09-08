/**
 * lib/meeting-mailer.ts — shared email helpers for the meeting scheduler.
 *
 * ALL meeting/interview emails (OTP, confirmation, approval, rejection,
 * reminders) are sent via Gmail SMTP using nodemailer — the same transport
 * used for admin-login OTP and user-auth OTP.
 *
 * Required env vars (same ones already used for admin/auth OTP):
 *   SMTP_HOST  — default: smtp.gmail.com
 *   SMTP_PORT  — default: 587
 *   SMTP_USER  — your Gmail address  (e.g. as.premiumportfolio@gmail.com)
 *   SMTP_PASS  — Gmail App Password  (NOT your regular password)
 *   ADMIN_EMAIL — recipient for admin notifications
 *
 * Gmail App Password setup (required — regular password won't work):
 *   1. Enable 2-Step Verification on your Google account
 *   2. Go to https://myaccount.google.com/apppasswords
 *   3. Create an App Password for "Mail"
 *   4. Use that 16-char password as SMTP_PASS in Vercel env vars
 */
import nodemailer from 'nodemailer'
import { dbGetSettings } from './db'
import { MEETINGS_FROM, withNoReplyNotice } from './mail-identities'

// ── Nodemailer transporter ────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/** Returns true if nodemailer is configured (SMTP_USER + SMTP_PASS present). */
export async function meetingMailer(): Promise<boolean> {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS)
}

/**
 * Sends an email via Gmail SMTP.
 * Throws if SMTP is not configured or if the send fails.
 */
export async function sendMeetingEmail(_ignored: any, params: {
  from: string
  to: string
  subject: string
  html: string
  attachments?: any[]
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error(
      'Gmail SMTP not configured. Set SMTP_USER and SMTP_PASS (Gmail App Password) in your Vercel environment variables.'
    )
  }
  const transporter = createTransporter()
  await transporter.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: withNoReplyNotice(params.html),
    attachments: params.attachments,
  })
}

/**
 * Returns the "from" address for ALL meeting/interview-related outgoing
 * emails — the "Meetings Alerts" official identity. See
 * lib/mail-identities.ts for the Gmail "Send mail as" alias requirement.
 */
export async function meetingFromEmail(): Promise<string> {
  return MEETINGS_FROM
}

/**
 * Returns a ready-to-use "from" address for meeting emails.
 * Always the "Meetings Alerts" identity; never an empty string.
 */
export async function safeFromEmail(): Promise<string> {
  return MEETINGS_FROM
}

/** Gmail address is always fine as the from — it IS the from. */
export function isGmailAddress(_from: string): boolean {
  return false
}

export async function meetingAdminEmail(): Promise<string> {
  const s = await dbGetSettings().catch(() => ({} as Record<string, string>))
  return s.notify_email || process.env.ADMIN_EMAIL || process.env.SMTP_USER || ''
}

export async function meetingTimezone(): Promise<string> {
  const s = await dbGetSettings().catch(() => ({} as Record<string, string>))
  return s.meeting_timezone || process.env.MEETING_TIMEZONE || 'Asia/Kolkata'
}

/**
 * Converts a send error into a human-readable message for admins.
 */
export function explainEmailError(err: unknown, _fromEmail?: string): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (/invalid login|authentication failed|username and password not accepted/i.test(raw)) {
    return `Gmail authentication failed. Make sure SMTP_PASS is a Gmail App Password (not your regular Gmail password). Generate one at https://myaccount.google.com/apppasswords — Error: ${raw}`
  }
  if (/self signed certificate|ECONNREFUSED|ETIMEDOUT/i.test(raw)) {
    return `Gmail SMTP connection failed. Check SMTP_HOST (smtp.gmail.com) and SMTP_PORT (587) in your Vercel environment variables — Error: ${raw}`
  }
  if (/smtp_user|smtp_pass|not configured/i.test(raw)) {
    return `Gmail SMTP not configured. Add SMTP_USER (as.premiumportfolio@gmail.com) and SMTP_PASS (Gmail App Password) to your Vercel environment variables.`
  }
  return `Email not delivered: ${raw}`
}
