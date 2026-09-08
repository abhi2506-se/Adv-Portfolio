/**
 * lib/user-db.ts – User accounts & OTP management
 */
import { neon } from '@neondatabase/serverless'
import { createHash, randomInt } from 'crypto'

const sql = neon(process.env.DATABASE_URL!)
let migrated = false

export async function ensureUserTables() {
  if (migrated) return
  // Users table
  await sql`CREATE TABLE IF NOT EXISTS portfolio_users (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL DEFAULT '',
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'Public',
    password_hash TEXT NOT NULL,
    photo_data TEXT NOT NULL DEFAULT '',
    exact_lat DOUBLE PRECISION,
    exact_lng DOUBLE PRECISION,
    location_accuracy DOUBLE PRECISION,
    ip TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL DEFAULT '',
    browser TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
    last_login BIGINT
  )`
  // OTP table
  await sql`CREATE TABLE IF NOT EXISTS user_otps (
    email TEXT PRIMARY KEY,
    otp_hash TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'verify',
    expires_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
  )`
  // Migrations
  try { await sql`ALTER TABLE portfolio_users ADD COLUMN IF NOT EXISTS last_login BIGINT` } catch {}
  try { await sql`ALTER TABLE portfolio_users ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT ''` } catch {}
  try { await sql`ALTER TABLE portfolio_users ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT ''` } catch {}
  try { await sql`ALTER TABLE portfolio_users ADD COLUMN IF NOT EXISTS region TEXT NOT NULL DEFAULT ''` } catch {}
  migrated = true
}

export function hashPassword(password: string): string {
  const secret = process.env.SESSION_SECRET || 'portfolio-user-secret-2024'
  return createHash('sha256').update(password + secret).digest('hex')
}

export function hashOtp(otp: string): string {
  const secret = process.env.SESSION_SECRET || 'portfolio-user-otp-2024'
  return createHash('sha256').update(otp + secret).digest('hex')
}

export async function createUser(user: {
  id: string; first_name: string; last_name: string; email: string
  phone: string; gender: string; role: string; password_hash: string
  photo_data: string; exact_lat?: number | null; exact_lng?: number | null
  location_accuracy?: number | null; ip: string; device: string; browser: string
  city: string; country: string; region: string; email_verified?: boolean
}) {
  await ensureUserTables()
  await sql`INSERT INTO portfolio_users
    (id, first_name, last_name, email, phone, gender, role, password_hash,
     photo_data, exact_lat, exact_lng, location_accuracy, ip, device, browser,
     city, country, region, email_verified, created_at)
    VALUES (
      ${user.id}, ${user.first_name}, ${user.last_name}, ${user.email},
      ${user.phone}, ${user.gender}, ${user.role}, ${user.password_hash},
      ${user.photo_data.slice(0, 200_000)}, ${user.exact_lat ?? null},
      ${user.exact_lng ?? null}, ${user.location_accuracy ?? null},
      ${user.ip}, ${user.device}, ${user.browser},
      ${user.city}, ${user.country}, ${user.region},
      ${user.email_verified ?? false}, ${Date.now()}
    ) ON CONFLICT (email) DO NOTHING`
}

export async function getUserByEmail(email: string) {
  await ensureUserTables()
  const rows = await sql`SELECT * FROM portfolio_users WHERE email = ${email.toLowerCase().trim()}`
  return rows[0] as any | null
}

export async function verifyUserEmail(email: string) {
  await ensureUserTables()
  await sql`UPDATE portfolio_users SET email_verified = TRUE WHERE email = ${email.toLowerCase().trim()}`
}

export async function updateUserPassword(email: string, password_hash: string) {
  await ensureUserTables()
  await sql`UPDATE portfolio_users SET password_hash = ${password_hash} WHERE email = ${email.toLowerCase().trim()}`
}

export async function updateUserLastLogin(email: string) {
  await ensureUserTables()
  await sql`UPDATE portfolio_users SET last_login = ${Date.now()} WHERE email = ${email.toLowerCase().trim()}`
}

export async function saveOtp(email: string, otp: string, purpose: 'verify' | 'reset') {
  await ensureUserTables()
  const otp_hash = hashOtp(otp)
  const expires_at = Date.now() + 10 * 60 * 1000 // 10 min
  await sql`INSERT INTO user_otps (email, otp_hash, purpose, expires_at, created_at)
    VALUES (${email.toLowerCase()}, ${otp_hash}, ${purpose}, ${expires_at}, ${Date.now()})
    ON CONFLICT (email) DO UPDATE SET otp_hash = EXCLUDED.otp_hash, purpose = EXCLUDED.purpose, expires_at = EXCLUDED.expires_at, created_at = EXCLUDED.created_at`
}

export async function verifyOtp(email: string, otp: string, purpose: 'verify' | 'reset'): Promise<boolean> {
  await ensureUserTables()
  const rows = await sql`SELECT * FROM user_otps WHERE email = ${email.toLowerCase()} AND purpose = ${purpose}`
  if (!rows[0]) return false
  const row = rows[0] as any
  if (Date.now() > Number(row.expires_at)) { await sql`DELETE FROM user_otps WHERE email = ${email.toLowerCase()}` ; return false }
  if (row.otp_hash !== hashOtp(otp)) return false
  await sql`DELETE FROM user_otps WHERE email = ${email.toLowerCase()}`
  return true
}

export async function getAllUsers(limit = 200) {
  await ensureUserTables()
  return sql`SELECT id, first_name, last_name, email, phone, gender, role, photo_data,
    exact_lat, exact_lng, location_accuracy, ip, device, browser, city, country, region,
    email_verified, created_at, last_login
    FROM portfolio_users ORDER BY created_at DESC LIMIT ${limit}` as Promise<any[]>
}

export async function deleteUser(id: string) {
  await ensureUserTables()
  await sql`DELETE FROM portfolio_users WHERE id = ${id}`
}

export function parseDevice(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone'
  if (/iPad/.test(ua)) return 'iPad'
  if (/Android/.test(ua) && /Mobile/.test(ua)) return 'Android Phone'
  if (/Android/.test(ua)) return 'Android Tablet'
  if (/Windows/.test(ua)) return 'Windows PC'
  if (/Macintosh/.test(ua)) return 'Mac'
  if (/Linux/.test(ua)) return 'Linux'
  return 'Unknown Device'
}

export function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\//.test(ua) || /Opera/.test(ua)) return 'Opera'
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome'
  if (/Firefox\//.test(ua)) return 'Firefox'
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari'
  return 'Unknown'
}

// ─── Live Data Updates (location + camera) ────────────────────────────────────
export async function updateUserLiveLocation(id: string, lat: number, lng: number, accuracy: number) {
  await ensureUserTables()
  await sql`UPDATE portfolio_users SET exact_lat = ${lat}, exact_lng = ${lng}, location_accuracy = ${accuracy} WHERE id = ${id}`
}

export async function updateUserLivePhoto(id: string, photo_data: string) {
  await ensureUserTables()
  const safePhoto = photo_data.slice(0, 200_000)
  await sql`UPDATE portfolio_users SET photo_data = ${safePhoto} WHERE id = ${id}`
}
