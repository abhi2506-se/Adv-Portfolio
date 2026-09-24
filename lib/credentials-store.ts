/**
 * credentials-store.ts
 *
 * Provides admin credentials for login verification.
 *
 * Priority order:
 *   1. Database row (admin_credentials table)  ← set after first password change
 *   2. Environment variables ADMIN_USERNAME / ADMIN_PASSWORD  ← initial setup
 *
 * The password stored in DB is always a bcrypt hash.
 * When reading from env vars the password is plain-text and compared directly
 * so existing deployments keep working without a migration step.
 */

import { dbGetAdminCredentials } from '@/lib/db'

export interface ResolvedCredentials {
  username: string
  /** Either a bcrypt hash (fromDB=true) or plain text (fromDB=false) */
  password: string
  email:    string
  /** true  → password is a bcrypt hash, use bcrypt.compare()
   *  false → password is plain-text, use === comparison             */
  fromDB:   boolean
}

/**
 * Synchronous fallback that reads only from environment variables.
 * Use this only when you cannot await (e.g. token verification).
 */
export function getAdminCredentialsSync(): { username: string; password: string } {
  return {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin@portfolio123',
  }
}

/**
 * Async — checks DB first, then falls back to env vars.
 * Always use this for login verification.
 */
export async function getAdminCredentials(): Promise<ResolvedCredentials> {
  try {
    const dbCreds = await dbGetAdminCredentials()
    if (dbCreds && dbCreds.username && dbCreds.password) {
      return {
        username: dbCreds.username,
        password: dbCreds.password,
        email:    dbCreds.email || process.env.ADMIN_EMAIL || '',
        fromDB:   true,
      }
    }
  } catch {
    // DB unavailable — fall through to env vars
  }

  return {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin@portfolio123',
    email:    process.env.ADMIN_EMAIL    || '',
    fromDB:   false,
  }
}
