/**
 * lib/recruiter-verification.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Two layers of "official email" verification for the Recruiter/Interview
 * form, as required by the spec:
 *
 *  1. Domain check  — rejects personal providers (Gmail, Yahoo, Outlook…)
 *     outright, and confirms the domain is a real, mail-receiving domain
 *     via a live DNS MX lookup (no 3rd-party API key needed).
 *  2. OTP check     — proves the submitter actually controls that exact
 *     inbox by emailing a 6-digit code they must enter before the booking
 *     form can be submitted.
 *
 * Domain-to-company matching is intentionally a *hint*, not a hard block —
 * guessing "company name → domain" and silently substituting it was the
 * root cause of an earlier bug (auto-filled wrong email). We only block on
 * facts we can actually verify: personal-provider list + live MX lookup.
 * Ownership of the exact address is proven by the OTP, not by guessing.
 */
import { createHmac, randomBytes } from 'crypto'
import { resolveMx } from 'dns/promises'

/* ── Personal / free email providers — never acceptable as an "official" email ── */
export const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.in', 'ymail.com',
  'outlook.com', 'hotmail.com', 'hotmail.co.in', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'protonmail.com', 'proton.me',
  'yandex.com', 'mail.com', 'zoho.com', 'rediffmail.com', 'rocketmail.com',
  'gmx.com', 'inbox.com', 'fastmail.com',
])

/** Known company → official domain, used only to show a helpful hint — never to block. */
const KNOWN_COMPANY_DOMAINS: Record<string, string> = {
  amazon: 'amazon.com', tcs: 'tcs.com', flipkart: 'flipkart.com', infosys: 'infosys.com',
  wipro: 'wipro.com', accenture: 'accenture.com', cognizant: 'cognizant.com',
  hcl: 'hcltech.com', 'tech mahindra': 'techmahindra.com', capgemini: 'capgemini.com',
  ibm: 'ibm.com', microsoft: 'microsoft.com', google: 'google.com', meta: 'meta.com',
  apple: 'apple.com', oracle: 'oracle.com', sap: 'sap.com', deloitte: 'deloitte.com',
  pwc: 'pwc.com', ey: 'ey.com', kpmg: 'kpmg.com',
  'indian navy': 'indiannavy.gov.in', isro: 'isro.gov.in', drdo: 'drdo.gov.in',
  'indian army': 'indianarmy.gov.in', 'indian air force': 'iaf.nic.in',
}

export function expectedDomainHint(companyName: string): string | null {
  const key = (companyName || '').trim().toLowerCase()
  if (!key) return null
  if (KNOWN_COMPANY_DOMAINS[key]) return KNOWN_COMPANY_DOMAINS[key]
  for (const [company, domain] of Object.entries(KNOWN_COMPANY_DOMAINS)) {
    if (key.includes(company) || company.includes(key)) return domain
  }
  return null
}

export interface DomainCheck { valid: boolean; reason?: string; hint?: string }

/**
 * Validates the email's domain: blocks personal providers outright (the one
 * check that's actually reliable), and tries to confirm the domain has mail
 * (MX) records as a best-effort sanity check.
 *
 * IMPORTANT: the live DNS lookup runs inside a serverless function, where
 * `dns.resolveMx` can be slow or fail transiently for reasons that have
 * nothing to do with whether the domain is real (cold starts, regional DNS
 * resolver hiccups, etc.). Previously, ANY lookup failure — including a
 * timeout — hard-rejected the request, which silently blocked legitimate
 * recruiters from ever receiving their OTP (it looked like "the email never
 * arrived" because the OTP was never even sent). The OTP step itself is
 * what actually proves the user controls the inbox, so a DNS hiccup here
 * should never be a hard blocker — only a confirmed personal-email-provider
 * match should be.
 */
export async function checkOfficialDomain(email: string, companyName: string): Promise<DomainCheck> {
  const trimmed = (email || '').trim().toLowerCase()
  const atIdx = trimmed.indexOf('@')
  if (!trimmed || atIdx === -1 || atIdx === trimmed.length - 1) {
    return { valid: false, reason: 'Enter a valid email address' }
  }
  const domain = trimmed.slice(atIdx + 1)

  if (PERSONAL_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, reason: 'Personal email providers (Gmail, Yahoo, Outlook, etc.) are not accepted. Please use your official company email.' }
  }

  const hint = expectedDomainHint(companyName)

  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('mx-lookup-timeout')), 4000)),
    ])
    if (!records || records.length === 0) {
      // No MX records is a genuine signal the domain can't receive mail —
      // still worth flagging, but don't block: the OTP send itself will
      // fail loudly if the address truly can't receive email.
      return { valid: true, hint: hint ?? undefined, reason: `Heads up: ${domain} doesn't appear to have mail servers configured. If the OTP email doesn't arrive, double-check the address.` }
    }
  } catch (err) {
    // DNS lookup failed or timed out — log it, but fail OPEN. A network
    // hiccup on our end should never be the reason a real recruiter can't
    // book a meeting.
    console.warn('[checkOfficialDomain] MX lookup failed, proceeding anyway:', domain, err)
  }

  return { valid: true, hint: hint ?? undefined }
}

/* ════════════════════════════════════════════════════════════════════════
   OTP
   ════════════════════════════════════════════════════════════════════════ */
const OTP_SECRET = () => process.env.OTP_SECRET || process.env.SESSION_SECRET || 'portfolio-otp-fallback-secret'
const OTP_TTL_MIN = 10
const TOKEN_TTL_MIN = 45
const MAX_ATTEMPTS = 5
const MAX_SENDS_PER_WINDOW = 3
const SEND_WINDOW_MIN = 10

export function generateOtp(): string {
  // 6-digit numeric code, zero-padded
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function hashOtp(email: string, otp: string): string {
  return createHmac('sha256', OTP_SECRET()).update(`${email.trim().toLowerCase()}:${otp}`).digest('hex')
}

export function generateToken(): string {
  return randomBytes(24).toString('hex')
}

export { OTP_TTL_MIN, TOKEN_TTL_MIN, MAX_ATTEMPTS, MAX_SENDS_PER_WINDOW, SEND_WINDOW_MIN }
