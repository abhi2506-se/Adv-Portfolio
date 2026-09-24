/**
 * lib/mail-identities.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Single source of truth for the six official outgoing-mail identities.
 * Every route that sends a transactional email should import its "from"
 * address from here instead of hard-coding it — that way the mailbox for a
 * whole category can be changed in one place.
 *
 *   1. AUTH_FROM          — OTP, email verification, password reset ONLY
 *   2. MEETINGS_FROM      — meeting/interview scheduling, confirmations,
 *                            approvals, rejections, reminders, recruiter
 *                            company-email verification OTP
 *   3. SUPPORT_FROM       — live-chat support notifications, unblock appeals
 *   4. NOTIFICATIONS_FROM — Journey activity: new blogs, new certificates,
 *                            new followers, journey comments/replies, new
 *                            testimonial submissions
 *   5. SYSTEM_FROM        — suspicious activity, unauthorized login
 *                            activity, account-blocked alerts
 *   6. CONTACT_FROM       — the contact form's "new message" notification
 *                            ONLY
 *
 * The admin's personal reply to a contact message intentionally keeps
 * sending as the personal "Abhishek Singh" identity (not CONTACT_FROM) —
 * it's a real, human, two-way reply, not an automated contact-form alert.
 *
 * Each constant can be overridden per-environment via the matching env
 * var, in case you ever want to point a category at a different
 * SMTP/Resend account without touching code.
 *
 * ── Gmail SMTP "From" caveat ────────────────────────────────────────────
 * This project currently authenticates and sends through Gmail SMTP
 * (nodemailer, using SMTP_USER/SMTP_PASS). Gmail SMTP will silently
 * rewrite the From header back to SMTP_USER unless the From address is
 * ALSO registered as a verified "Send mail as" alias on that same Gmail
 * account:
 *
 *   Gmail → Settings → Accounts and Import → "Send mail as"
 *   → Add another email address → verify each of the addresses below
 *
 * Without that step, these addresses will be correct in the code/UI but
 * Gmail will still actually send from SMTP_USER. If theabhisheksingh.in
 * mail is instead routed through a custom-domain SMTP relay or Resend
 * (already wired up for the admin "Test Email" tool) this restriction
 * doesn't apply — just verify the domain with that provider and these
 * addresses work as-is.
 */

export const AUTH_FROM =
  process.env.AUTH_EMAIL_FROM ||
  '"Account Authentication" <authentication@theabhisheksingh.in>'

export const MEETINGS_FROM =
  process.env.MEETINGS_EMAIL_FROM ||
  '"Meetings Alerts" <meetings@theabhisheksingh.in>'

export const SUPPORT_FROM =
  process.env.SUPPORT_EMAIL_FROM ||
  '"Portfolio Support" <support@theabhisheksingh.in>'

export const NOTIFICATIONS_FROM =
  process.env.NOTIFICATIONS_EMAIL_FROM ||
  '"Notifications" <notifications@theabhisheksingh.in>'

export const SYSTEM_FROM =
  process.env.SYSTEM_EMAIL_FROM ||
  '"System Alerts" <no-reply@theabhisheksingh.in>'

export const CONTACT_FROM =
  process.env.CONTACT_EMAIL_FROM ||
  '"Contact Alerts " <contact@theabhisheksingh.in>'

/** Plain-text version, exported in case any caller needs it (e.g. text-only emails). */
export const NO_REPLY_NOTICE_TEXT =
  'Please do not reply on this email, this email not accept incoming message.'

const NO_REPLY_NOTICE_HTML = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td style="padding:16px 0 0;text-align:center;">
    <p style="margin:0;color:#64748b;font-size:11px;line-height:1.5;">${NO_REPLY_NOTICE_TEXT}</p>
  </td></tr>
</table>`

/**
 * Appends the standard "do not reply" notice to an HTML email body.
 * Used for every category EXCEPT Contact and Support, which are exempt
 * and should NOT call this.
 *
 * Works for both full HTML documents (inserts just before </body>) and
 * bare fragments (appends to the end) so it's safe to wrap any template
 * in this codebase.
 */
export function withNoReplyNotice(html: string): string {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${NO_REPLY_NOTICE_HTML}</body>`)
  }
  return `${html}${NO_REPLY_NOTICE_HTML}`
}
