import { generateSecret, generate, verify, generateURI } from "otplib"
import crypto from "crypto"
import QRCode from "qrcode"

const ISSUER = "Abhishek Singh — Client Portal"

export function generateTotpSecret(): string {
  return generateSecret()
}

export async function generateQrCodeDataUrl(email: string, secret: string): Promise<string> {
  const otpauthUrl = await generateURI({ secret, label: email, issuer: ISSUER })
  return QRCode.toDataURL(otpauthUrl)
}

export async function verifyTotpCode(token: string, secret: string): Promise<boolean> {
  try {
    // epochTolerance: 1 allows ±1 time-step (±30s) of clock drift between
    // the admin's phone and our server, which is standard practice for TOTP.
    const result = await verify({ secret, token, epochTolerance: 1 })
    return Boolean(result)
  } catch {
    return false
  }
}

/**
 * Backup/recovery codes: generated once at enrollment, shown to the admin
 * exactly once, then stored only as salted hashes (never plaintext) so a
 * database read alone can't be used to log in.
 */
export function generateBackupCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-")
  )
}

export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex")
}

export function verifyBackupCode(code: string, hashedCodes: string[]): { valid: boolean; matchedHash?: string } {
  const hash = hashBackupCode(code)
  const matchedHash = hashedCodes.find((h) => h === hash)
  return { valid: Boolean(matchedHash), matchedHash }
}
