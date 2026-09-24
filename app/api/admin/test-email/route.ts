/**
 * POST /api/admin/test-email
 * Sends a test email to verify the Resend configuration is working.
 * Admin-only endpoint.
 */
import { NextRequest, NextResponse } from 'next/server'
import { dbGetSettings } from '@/lib/db'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

async function requireAdmin(req: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(`${req.nextUrl.origin}/api/admin/session-check`, {
      headers: { cookie: req.headers.get('cookie') || '' },
    })
    if (!res.ok) return false
    const d = await res.json()
    return d.valid !== false
  } catch { return false }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let bodyTo = ''
  try {
    const body = await req.json().catch(() => ({}))
    bodyTo = (body?.to || '').trim()
  } catch {}

  try {
    const s = (await dbGetSettings()) as Record<string, string>
    const apiKey = s.resend_api_key || process.env.RESEND_API_KEY || ''
    const adminEmail = s.notify_email || process.env.ADMIN_EMAIL || ''
    const fromEmail = s.resend_from_email || process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || ''
    // Sending to the configured admin email only proves self-delivery, which
    // sandbox domains always allow. Pass { "to": "someone-else@example.com" }
    // to actually test the third-party delivery path that visitors and
    // recruiters depend on.
    const sendTo = bodyTo || adminEmail

    const diagnostics = {
      resend_api_key: apiKey ? `✅ Set (${apiKey.slice(0, 8)}…)` : '❌ Missing — set RESEND_API_KEY',
      admin_email: adminEmail || '❌ Missing — set ADMIN_EMAIL in settings',
      from_email: fromEmail,
      sending_to: sendTo || '❌ Missing — no recipient available',
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        diagnostics,
        error: 'RESEND_API_KEY not configured. Go to Settings → Email and add your Resend API key.',
      })
    }

    if (!sendTo) {
      return NextResponse.json({
        success: false,
        diagnostics,
        error: 'Admin email not configured. Go to Settings and add your email in the "Notification Email" field.',
      })
    }

    const resend = new Resend(apiKey)
    const result = await resend.emails.send({
      from: fromEmail,
      to: sendTo,
      subject: '✅ Test Email — Portfolio Email System Working',
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:500px;margin:auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden;padding:32px;border:1px solid #1e293b">
          <div style="font-size:36px;margin-bottom:16px">✅</div>
          <h2 style="margin:0 0 12px;color:#4ade80;font-size:20px">Email System is Working!</h2>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 16px">
            Your Resend email configuration is correctly set up. Meeting request emails, approval/rejection emails, and reminder emails will be delivered successfully.
          </p>
          <div style="background:#1e293b;border-radius:8px;padding:16px;font-size:12px;color:#64748b">
            <p style="margin:0"><strong style="color:#94a3b8">From:</strong> ${fromEmail}</p>
            <p style="margin:8px 0 0"><strong style="color:#94a3b8">To:</strong> ${sendTo}</p>
            <p style="margin:8px 0 0"><strong style="color:#94a3b8">Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
        </div>
      `,
    })

    // IMPORTANT: the Resend SDK does NOT throw on an API-level failure
    // (unverified domain, sandbox restriction, bad recipient, etc) — it
    // resolves successfully with `{ data: null, error: {...} }`. This
    // endpoint used to ignore `result.error` entirely and always report
    // "success", which is exactly why it kept saying email was configured
    // correctly while real visitor/recruiter emails were silently failing.
    if (result.error) {
      const sandboxHint = /resend\.dev domain is only available for testing|only send testing emails to your own/i.test(
        JSON.stringify(result.error)
      )
      return NextResponse.json({
        success: false,
        diagnostics,
        error: (result.error as any)?.message || JSON.stringify(result.error),
        hint: sandboxHint
          ? `You're sending from the resend.dev sandbox domain (${fromEmail}). Resend only delivers sandbox emails to the account's own signup address, so any email to a visitor or recruiter (a third party) is rejected outright. Verify a custom domain at resend.com/domains and set it as "Email From Address" in Settings to actually deliver to visitors/recruiters.`
          : 'Common issues: invalid API key, unverified "from" domain, or rate limit exceeded.',
      })
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      message: `Test email sent to ${sendTo}! Check your inbox (and spam folder).`,
      resend_id: (result as any)?.data?.id,
      note: !bodyTo && /@resend\.dev/i.test(fromEmail)
        ? `Heads up: this only proves delivery to ${sendTo} (your own account email). The resend.dev sandbox domain can NOT deliver to anyone else — verify a custom domain before relying on visitor/recruiter emails. Re-run this test with a different "to" address to confirm.`
        : undefined,
    })
  } catch (e: any) {
    return NextResponse.json({
      success: false,
      error: e?.message || 'Failed to send test email',
      hint: 'Common issues: Invalid API key, unverified "from" domain, or rate limit exceeded.',
    }, { status: 500 })
  }
}
