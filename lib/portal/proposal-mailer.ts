/**
 * lib/portal/proposal-mailer.ts
 *
 * Sends cold-email / proposal messages from sales@theabhisheksingh.in via
 * Gmail Workspace SMTP (App Password). Separate from lib/meeting-mailer.ts
 * (which uses the general SMTP_USER inbox for OTP/meeting mail) so the
 * sales mailbox and its credentials stay independent.
 *
 * Required env vars:
 *   SALES_SMTP_USER  — sales@theabhisheksingh.in
 *   SALES_SMTP_PASS  — Gmail App Password for that Workspace mailbox
 *   SALES_SMTP_HOST  — default: smtp.gmail.com
 *   SALES_SMTP_PORT  — default: 587
 *
 * Setup (Google Workspace):
 *   1. Sign in to sales@theabhisheksingh.in, enable 2-Step Verification.
 *   2. https://myaccount.google.com/apppasswords → create an App Password
 *      for "Mail".
 *   3. Set SALES_SMTP_USER / SALES_SMTP_PASS in your environment.
 */
import nodemailer from "nodemailer"

export function proposalMailerConfigured(): boolean {
  return !!(process.env.SALES_SMTP_USER && process.env.SALES_SMTP_PASS)
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SALES_SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SALES_SMTP_PORT) || 587,
    secure: process.env.SALES_SMTP_SECURE === "true",
    auth: {
      user: process.env.SALES_SMTP_USER,
      pass: process.env.SALES_SMTP_PASS,
    },
  })
}

export async function sendProposalEmail(params: {
  to: string
  subject: string
  html: string
  replyTo?: string
}): Promise<{ messageId: string }> {
  if (!proposalMailerConfigured()) {
    throw new Error(
      "Sales mailbox not configured. Set SALES_SMTP_USER and SALES_SMTP_PASS (Gmail App Password for sales@theabhisheksingh.in)."
    )
  }
  const transporter = createTransporter()
  const info = await transporter.sendMail({
    from: `"Abhishek Singh" <${process.env.SALES_SMTP_USER}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo || process.env.SALES_SMTP_USER,
  })
  return { messageId: info.messageId }
}
