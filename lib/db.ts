/**
 * lib/db.ts – Neon serverless Postgres + auto-migration
 */
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
let migrated = false

// Alias so push subscription functions (which were using initDb) don't crash.
// Both names refer to the same underlying getDB logic.
export const initDb = () => getDB()

export async function getDB() {
  if (!migrated) {
    // ─── Admin credentials table (DB-backed, replaces env-var-only approach) ──
    await sql`CREATE TABLE IF NOT EXISTS admin_credentials (
      id        TEXT PRIMARY KEY DEFAULT 'main',
      username  TEXT NOT NULL,
      password  TEXT NOT NULL,
      email     TEXT NOT NULL DEFAULT '',
      updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )`

    await sql`CREATE TABLE IF NOT EXISTS journey_blogs (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000)`
    await sql`CREATE TABLE IF NOT EXISTS journey_certificates (id TEXT PRIMARY KEY, data JSONB NOT NULL, created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000)`
    await sql`CREATE TABLE IF NOT EXISTS chat_analytics (id TEXT PRIMARY KEY, question TEXT NOT NULL, intent TEXT NOT NULL DEFAULT 'general', session_id TEXT NOT NULL DEFAULT '', created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000)`
    await sql`CREATE TABLE IF NOT EXISTS chatbot_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '')`
    await sql`CREATE TABLE IF NOT EXISTS chatbot_sessions (
      session_id TEXT PRIMARY KEY,
      messages JSONB NOT NULL DEFAULT '[]',
      last_intent TEXT NOT NULL DEFAULT 'general',
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      user_name TEXT NOT NULL DEFAULT '',
      ip_address TEXT NOT NULL DEFAULT '',
      browser_name TEXT NOT NULL DEFAULT '',
      device_name TEXT NOT NULL DEFAULT '',
      fingerprint TEXT NOT NULL DEFAULT '',
      user_location TEXT NOT NULL DEFAULT '',
      latitude DOUBLE PRECISION NOT NULL DEFAULT 0,
      longitude DOUBLE PRECISION NOT NULL DEFAULT 0
    )`
    // Auto-migrate existing tables: add new columns if missing
    try { await sql`ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS user_name TEXT NOT NULL DEFAULT ''` } catch {}
    try { await sql`ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT ''` } catch {}
    try { await sql`ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS browser_name TEXT NOT NULL DEFAULT ''` } catch {}
    try { await sql`ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS device_name TEXT NOT NULL DEFAULT ''` } catch {}
    try { await sql`ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS fingerprint TEXT NOT NULL DEFAULT ''` } catch {}
    try { await sql`ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS user_location TEXT NOT NULL DEFAULT ''` } catch {}
    try { await sql`ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION NOT NULL DEFAULT 0` } catch {}
    try { await sql`ALTER TABLE chatbot_sessions ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION NOT NULL DEFAULT 0` } catch {}
    await sql`CREATE TABLE IF NOT EXISTS contact_messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '', message TEXT NOT NULL, intent TEXT NOT NULL DEFAULT 'general', created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000, archived BOOLEAN NOT NULL DEFAULT FALSE)`
    await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )`

    // ── Visitor push subscriptions (separate from admin) ──────────────────────
    await sql`CREATE TABLE IF NOT EXISTS visitor_push_subscriptions (
      id TEXT PRIMARY KEY,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      fingerprint TEXT NOT NULL DEFAULT '',
      user_name TEXT NOT NULL DEFAULT '',
      user_email TEXT NOT NULL DEFAULT '',
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )`
    // Migrate existing table if fingerprint column missing
    try { await sql`ALTER TABLE visitor_push_subscriptions ADD COLUMN IF NOT EXISTS fingerprint TEXT NOT NULL DEFAULT ''` } catch {}
    try { await sql`ALTER TABLE visitor_push_subscriptions ADD COLUMN IF NOT EXISTS user_name TEXT NOT NULL DEFAULT ''` } catch {}
    try { await sql`ALTER TABLE visitor_push_subscriptions ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL DEFAULT ''` } catch {}

    // ── Meeting Reminders ───────────────────────────────────────────────────
    await sql`CREATE TABLE IF NOT EXISTS meeting_reminders (
      id            TEXT PRIMARY KEY,
      booking_id    TEXT NOT NULL,
      scheduled_at  TIMESTAMPTZ NOT NULL,
      sent          BOOLEAN NOT NULL DEFAULT false,
      sent_at       TIMESTAMPTZ,
      failed        BOOLEAN NOT NULL DEFAULT false,
      fail_reason   TEXT,
      retry_count   INTEGER NOT NULL DEFAULT 0,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
    try { await sql`CREATE INDEX IF NOT EXISTS idx_meeting_reminders_booking ON meeting_reminders(booking_id)` } catch {}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_meeting_reminders_scheduled ON meeting_reminders(scheduled_at) WHERE sent = false` } catch {}

    // ── Project Media ───────────────────────────────────────────────────────
    await sql`CREATE TABLE IF NOT EXISTS project_media (
      id            TEXT PRIMARY KEY,
      project_id    TEXT NOT NULL,
      media_type    TEXT NOT NULL DEFAULT 'image',
      media_url     TEXT NOT NULL,
      thumbnail_url TEXT,
      title         TEXT NOT NULL DEFAULT '',
      description   TEXT NOT NULL DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
    try { await sql`CREATE INDEX IF NOT EXISTS idx_project_media_project ON project_media(project_id)` } catch {}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_project_media_order ON project_media(project_id, display_order)` } catch {}

    // ── Chatbot Abuse Tracking ──────────────────────────────────────────────
    await sql`CREATE TABLE IF NOT EXISTS chatbot_abuse (
      id            TEXT PRIMARY KEY,
      fingerprint   TEXT NOT NULL DEFAULT '',
      ip_address    TEXT NOT NULL DEFAULT '',
      abuse_count   INTEGER NOT NULL DEFAULT 1,
      blocked       BOOLEAN NOT NULL DEFAULT false,
      warn_shown    BOOLEAN NOT NULL DEFAULT false,
      last_abuse_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      blocked_at    TIMESTAMPTZ,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
    try { await sql`CREATE INDEX IF NOT EXISTS idx_chatbot_abuse_fp ON chatbot_abuse(fingerprint)` } catch {}
    try { await sql`CREATE INDEX IF NOT EXISTS idx_chatbot_abuse_ip ON chatbot_abuse(ip_address)` } catch {}

    // ── Portfolio Blogs — ensure createdAt/updatedAt columns exist ──────────
    try { await sql`ALTER TABLE portfolio_blogs ADD COLUMN IF NOT EXISTS created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000` } catch {}
    try { await sql`ALTER TABLE portfolio_blogs ADD COLUMN IF NOT EXISTS updated_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000` } catch {}

    migrated = true
  }
  return sql
}

export async function dbGetBlogs() {
  const db = await getDB()
  const rows = await db`SELECT data FROM journey_blogs ORDER BY created_at DESC`
  return rows.map((r: any) => r.data)
}
export async function dbSaveBlog(post: any) {
  const db = await getDB()
  await db`INSERT INTO journey_blogs (id, data, created_at) VALUES (${post.id}, ${JSON.stringify(post)}, ${post.createdAt}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`
}
export async function dbDeleteBlog(id: string) {
  const db = await getDB()
  await db`DELETE FROM journey_blogs WHERE id = ${id}`
}

export async function dbGetCertificates() {
  const db = await getDB()
  const rows = await db`SELECT data FROM journey_certificates ORDER BY created_at DESC`
  return rows.map((r: any) => r.data)
}
export async function dbSaveCertificate(cert: any) {
  const db = await getDB()
  await db`INSERT INTO journey_certificates (id, data, created_at) VALUES (${cert.id}, ${JSON.stringify(cert)}, ${cert.createdAt}) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`
}
export async function dbDeleteCertificate(id: string) {
  const db = await getDB()
  await db`DELETE FROM journey_certificates WHERE id = ${id}`
}

export async function dbSaveAnalytic(entry: { id: string; question: string; intent: string; session_id: string; created_at: number }) {
  const db = await getDB()
  await db`INSERT INTO chat_analytics (id, question, intent, session_id, created_at) VALUES (${entry.id}, ${entry.question}, ${entry.intent}, ${entry.session_id}, ${entry.created_at}) ON CONFLICT (id) DO NOTHING`
}
export async function dbGetTopQuestions(limit = 50) {
  const db = await getDB()
  return db`SELECT question, intent, COUNT(*) as count, MAX(created_at) as last_asked FROM chat_analytics GROUP BY question, intent ORDER BY count DESC, last_asked DESC LIMIT ${limit}`
}
export async function dbGetAnalyticsSummary() {
  const db = await getDB()
  const total   = await db`SELECT COUNT(*) as count FROM chat_analytics`
  const today   = await db`SELECT COUNT(*) as count FROM chat_analytics WHERE created_at > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 day') * 1000`
  const intents = await db`SELECT intent, COUNT(*) as count FROM chat_analytics GROUP BY intent ORDER BY count DESC`
  const recent  = await db`SELECT question, intent, created_at FROM chat_analytics ORDER BY created_at DESC LIMIT 20`
  return { total: parseInt(total[0]?.count||'0'), today: parseInt(today[0]?.count||'0'), intents, recent }
}

// ─── Chatbot Session Conversations ────────────────────────────────────────────
export interface ChatbotSessionMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  intent?: string
}

export interface ChatbotSessionMeta {
  user_name?: string
  ip_address?: string
  browser_name?: string
  device_name?: string
  fingerprint?: string
  user_location?: string
  latitude?: number
  longitude?: number
}

export async function dbUpsertChatbotSession(
  sessionId: string,
  messages: ChatbotSessionMessage[],
  lastIntent: string,
  meta?: ChatbotSessionMeta
) {
  const db = await getDB()
  const now = Date.now()
  const truncated = messages.slice(-40)
  const userName     = meta?.user_name     || ''
  const ipAddress    = meta?.ip_address    || ''
  const browserName  = meta?.browser_name  || ''
  const deviceName   = meta?.device_name   || ''
  const fingerprint  = meta?.fingerprint   || ''
  const userLocation = meta?.user_location || ''
  const latitude     = meta?.latitude      ?? 0
  const longitude    = meta?.longitude     ?? 0
  await db`
    INSERT INTO chatbot_sessions
      (session_id, messages, last_intent, message_count, created_at, updated_at,
       user_name, ip_address, browser_name, device_name, fingerprint, user_location, latitude, longitude)
    VALUES
      (${sessionId}, ${JSON.stringify(truncated)}::jsonb, ${lastIntent}, ${truncated.length}, ${now}, ${now},
       ${userName}, ${ipAddress}, ${browserName}, ${deviceName}, ${fingerprint}, ${userLocation}, ${latitude}, ${longitude})
    ON CONFLICT (session_id) DO UPDATE SET
      messages       = ${JSON.stringify(truncated)}::jsonb,
      last_intent    = ${lastIntent},
      message_count  = ${truncated.length},
      updated_at     = ${now},
      user_name      = CASE WHEN EXCLUDED.user_name     <> '' THEN EXCLUDED.user_name     ELSE chatbot_sessions.user_name     END,
      ip_address     = CASE WHEN EXCLUDED.ip_address    <> '' THEN EXCLUDED.ip_address    ELSE chatbot_sessions.ip_address    END,
      browser_name   = CASE WHEN EXCLUDED.browser_name  <> '' THEN EXCLUDED.browser_name  ELSE chatbot_sessions.browser_name  END,
      device_name    = CASE WHEN EXCLUDED.device_name   <> '' THEN EXCLUDED.device_name   ELSE chatbot_sessions.device_name   END,
      fingerprint    = CASE WHEN EXCLUDED.fingerprint   <> '' THEN EXCLUDED.fingerprint   ELSE chatbot_sessions.fingerprint   END,
      user_location  = CASE WHEN EXCLUDED.user_location <> '' THEN EXCLUDED.user_location ELSE chatbot_sessions.user_location END,
      latitude       = CASE WHEN EXCLUDED.latitude      <> 0  THEN EXCLUDED.latitude      ELSE chatbot_sessions.latitude      END,
      longitude      = CASE WHEN EXCLUDED.longitude     <> 0  THEN EXCLUDED.longitude     ELSE chatbot_sessions.longitude     END
  `
}

export async function dbGetChatbotSessions(limit = 50) {
  const db = await getDB()
  return db`SELECT session_id, messages, last_intent, message_count,
                   created_at::text, updated_at::text,
                   user_name, ip_address, browser_name, device_name, fingerprint, user_location, latitude, longitude
            FROM chatbot_sessions ORDER BY updated_at DESC LIMIT ${limit}`
}

export async function dbGetChatbotSessionsCount() {
  const db = await getDB()
  const r = await db`SELECT COUNT(*) as count FROM chatbot_sessions`
  return parseInt(r[0]?.count || '0')
}

export async function dbDeleteChatbotSession(sessionId: string) {
  const db = await getDB()
  await db`DELETE FROM chatbot_sessions WHERE session_id = ${sessionId}`
}

// ─── Chatbot Settings ──────────────────────────────────────────────────────────
export async function dbGetSettings(): Promise<Record<string,string>> {
  const db = await getDB()
  const rows = await db`SELECT key, value FROM chatbot_settings`
  return Object.fromEntries(rows.map((r: any) => [r.key, r.value]))
}
export async function dbSetSettings(settings: Record<string,string>) {
  const db = await getDB()
  for (const [key, value] of Object.entries(settings)) {
    await db`INSERT INTO chatbot_settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
  }
}

// ─── Contact Messages ──────────────────────────────────────────────────────────
export async function dbSaveContactMessage(msg: { id: string; name: string; email: string; subject: string; message: string; intent: string; created_at: number }) {
  try {
    const db = await getDB()
    const result = await db`INSERT INTO contact_messages (id, name, email, subject, message, intent, created_at) VALUES (${msg.id}, ${msg.name}, ${msg.email}, ${msg.subject}, ${msg.message}, ${msg.intent}, ${msg.created_at}) ON CONFLICT (id) DO NOTHING`
    console.log('[db] Contact message saved:', msg.id)
    return result
  } catch (e) {
    console.error('[db] Failed to save contact message:', e)
    throw e
  }
}

export async function dbDeleteContactMessage(id: string) {
  try {
    const db = await getDB()
    const result = await db`DELETE FROM contact_messages WHERE id = ${id}`
    console.log('[db] Contact message deleted:', id)
    return result
  } catch (e) {
    console.error('[db] Failed to delete contact message:', e)
    throw e
  }
}

export async function dbArchiveContactMessage(id: string) {
  try {
    const db = await getDB()
    const result = await db`UPDATE contact_messages SET archived = TRUE WHERE id = ${id}`
    console.log('[db] Contact message archived:', id)
    return result
  } catch (e) {
    console.error('[db] Failed to archive contact message:', e)
    throw e
  }
}

export async function dbGetContactMessages(limit = 50) {
  try {
    const db = await getDB()
    const messages = await db`SELECT * FROM contact_messages WHERE archived = FALSE ORDER BY created_at DESC LIMIT ${limit}`
    console.log('[db] Fetched', messages.length, 'active contact messages')
    return Array.isArray(messages) ? messages : []
  } catch (e) {
    console.error('[db] Failed to get contact messages:', e)
    return []
  }
}

export async function dbGetAllContactMessages(limit = 50) {
  try {
    const db = await getDB()
    const messages = await db`SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT ${limit}`
    console.log('[db] Fetched', messages.length, 'total contact messages (including archived)')
    return Array.isArray(messages) ? messages : []
  } catch (e) {
    console.error('[db] Failed to get all contact messages:', e)
    return []
  }
}

export async function dbGetContactMessagesSummary() {
  try {
    const db = await getDB()
    const total = await db`SELECT COUNT(*) as count FROM contact_messages`
    const today = await db`SELECT COUNT(*) as count FROM contact_messages WHERE created_at > EXTRACT(EPOCH FROM NOW() - INTERVAL '1 day') * 1000`
    const hiring = await db`SELECT COUNT(*) as count FROM contact_messages WHERE intent = 'hiring' AND archived = FALSE`
    const unique = await db`SELECT COUNT(DISTINCT email) as count FROM contact_messages WHERE archived = FALSE`
    const active = await db`SELECT COUNT(*) as count FROM contact_messages WHERE archived = FALSE`
    
    console.log('[db] Contact summary:', { total: total[0]?.count, today: today[0]?.count, hiring: hiring[0]?.count, unique: unique[0]?.count, active: active[0]?.count })
    
    return {
      total: parseInt(total[0]?.count || '0'),
      today: parseInt(today[0]?.count || '0'),
      hiring: parseInt(hiring[0]?.count || '0'),
      unique: parseInt(unique[0]?.count || '0'),
      active: parseInt(active[0]?.count || '0'),
    }
  } catch (e) {
    console.error('[db] Failed to get contact messages summary:', e)
    return { total: 0, today: 0, hiring: 0, unique: 0, active: 0 }
  }
}

// ─── Admin Sessions ──────────────────────────────────────────────────────────
export async function dbInitSecurity() {
  const db = await getDB()
  await db`CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    last_active BIGINT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
  )`
  await db`CREATE TABLE IF NOT EXISTS suspicious_activity (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    device TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    fingerprint TEXT NOT NULL DEFAULT '',
    user_name TEXT NOT NULL DEFAULT '',
    user_email TEXT NOT NULL DEFAULT ''
  )`
  // ── Migrate existing suspicious_activity tables missing the new columns ──────
  try { await db`ALTER TABLE suspicious_activity ADD COLUMN IF NOT EXISTS fingerprint TEXT NOT NULL DEFAULT ''` } catch {}
  try { await db`ALTER TABLE suspicious_activity ADD COLUMN IF NOT EXISTS user_name TEXT NOT NULL DEFAULT ''` } catch {}
  try { await db`ALTER TABLE suspicious_activity ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL DEFAULT ''` } catch {}
  try { await db`ALTER TABLE suspicious_activity ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE` } catch {}
  await db`CREATE TABLE IF NOT EXISTS blocked_ips (
    ip TEXT PRIMARY KEY,
    reason TEXT NOT NULL DEFAULT '',
    blocked_at BIGINT NOT NULL,
    unblock_at BIGINT NOT NULL DEFAULT 0
  )`
  // Add unblock_at column to existing tables if missing (migration)
  try { await db`ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS unblock_at BIGINT NOT NULL DEFAULT 0` } catch {}
  // Add fingerprint, name, email, location, device columns for persistent cross-IP blocking
  try { await db`ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS fingerprint TEXT NOT NULL DEFAULT ''` } catch {}
  try { await db`ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS user_name TEXT NOT NULL DEFAULT ''` } catch {}
  try { await db`ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL DEFAULT ''` } catch {}
  try { await db`ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS user_location TEXT NOT NULL DEFAULT ''` } catch {}
  try { await db`ALTER TABLE blocked_ips ADD COLUMN IF NOT EXISTS user_device TEXT NOT NULL DEFAULT ''` } catch {}
  // Appeal table — blocked users can request unblock
  await db`CREATE TABLE IF NOT EXISTS blocked_appeals (
    id TEXT PRIMARY KEY,
    ip TEXT NOT NULL DEFAULT '',
    fingerprint TEXT NOT NULL DEFAULT '',
    user_name TEXT NOT NULL DEFAULT '',
    user_email TEXT NOT NULL DEFAULT '',
    comment TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL DEFAULT 0
  )`
  // Add archived column to suspicious_activity if missing
  try { await db`ALTER TABLE suspicious_activity ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE` } catch {}
}

export async function dbSaveAdminSession(session: {
  id: string; username: string; ip: string; device: string; location: string; created_at: number; last_active: number
}) {
  const db = await getDB()
  await dbInitSecurity()
  await db`INSERT INTO admin_sessions (id, username, ip, device, location, created_at, last_active) VALUES (${session.id}, ${session.username}, ${session.ip}, ${session.device}, ${session.location}, ${session.created_at}, ${session.last_active}) ON CONFLICT (id) DO UPDATE SET last_active = EXCLUDED.last_active, active = TRUE`
}

export async function dbGetActiveSessions() {
  const db = await getDB()
  await dbInitSecurity()
  return db`SELECT * FROM admin_sessions WHERE active = TRUE ORDER BY last_active DESC`
}

export async function dbRevokeSession(id: string) {
  const db = await getDB()
  await dbInitSecurity()
  await db`UPDATE admin_sessions SET active = FALSE WHERE id = ${id}`
}

export async function dbUpdateSessionActivity(id: string) {
  const db = await getDB()
  await dbInitSecurity()
  await db`UPDATE admin_sessions SET last_active = ${Date.now()} WHERE id = ${id}`
}

export async function dbSaveSuspiciousActivity(activity: {
  id: string; type: string; ip: string; location: string; device: string; details: string; created_at: number; blocked: boolean;
  fingerprint?: string; user_name?: string; user_email?: string;
}) {
  const db = await getDB()
  await dbInitSecurity()
  await db`INSERT INTO suspicious_activity
    (id, type, ip, location, device, details, created_at, blocked, fingerprint, user_name, user_email)
    VALUES (
      ${activity.id}, ${activity.type}, ${activity.ip}, ${activity.location},
      ${activity.device}, ${activity.details}, ${activity.created_at}, ${activity.blocked},
      ${activity.fingerprint||''}, ${activity.user_name||''}, ${activity.user_email||''}
    ) ON CONFLICT (id) DO NOTHING`
}

export async function dbGetSuspiciousActivities(limit = 50, includeArchived = false) {
  const db = await getDB()
  await dbInitSecurity()
  if (includeArchived) {
    return db`SELECT * FROM suspicious_activity ORDER BY created_at DESC LIMIT ${limit}`
  }
  return db`SELECT * FROM suspicious_activity WHERE archived = FALSE OR archived IS NULL ORDER BY created_at DESC LIMIT ${limit}`
}

export async function dbResolveSuspiciousActivity(id: string) {
  const db = await getDB()
  await dbInitSecurity()
  await db`UPDATE suspicious_activity SET resolved = TRUE WHERE id = ${id}`
}

export async function dbBlockIP(ip: string, reason: string, unblockAt = 0) {
  const db = await getDB()
  await dbInitSecurity()
  await db`INSERT INTO blocked_ips (ip, reason, blocked_at, unblock_at) VALUES (${ip}, ${reason}, ${Date.now()}, ${unblockAt}) ON CONFLICT (ip) DO UPDATE SET reason = EXCLUDED.reason, blocked_at = EXCLUDED.blocked_at, unblock_at = EXCLUDED.unblock_at`
}

export async function dbUnblockIP(ip: string) {
  const db = await getDB()
  await dbInitSecurity()
  await db`DELETE FROM blocked_ips WHERE ip = ${ip}`
}

export async function dbIsIPBlocked(ip: string): Promise<boolean> {
  const db = await getDB()
  await dbInitSecurity()
  const rows = await db`SELECT ip, unblock_at FROM blocked_ips WHERE ip = ${ip}` as any[]
  if (rows.length === 0) return false
  const row = rows[0]
  // Auto-expire timed blocks
  if (row.unblock_at && row.unblock_at > 0 && Date.now() > Number(row.unblock_at)) {
    await db`DELETE FROM blocked_ips WHERE ip = ${ip}`
    return false
  }
  return true
}

export async function dbGetBlockedIPWithDetails(ip: string) {
  const db = await getDB()
  await dbInitSecurity()
  const rows = await db`SELECT * FROM blocked_ips WHERE ip = ${ip}` as any[]
  if (rows.length === 0) return null
  const row = rows[0]
  // Auto-expire
  if (row.unblock_at && row.unblock_at > 0 && Date.now() > Number(row.unblock_at)) {
    await db`DELETE FROM blocked_ips WHERE ip = ${ip}`
    return null
  }
  return row
}

export async function dbGetBlockedIPs() {
  const db = await getDB()
  await dbInitSecurity()
  // Auto-expire all timed blocks before returning
  await db`DELETE FROM blocked_ips WHERE unblock_at > 0 AND unblock_at < ${Date.now()}`
  return db`SELECT * FROM blocked_ips ORDER BY blocked_at DESC`
}

export async function dbArchiveSuspiciousActivities() {
  const db = await getDB()
  await dbInitSecurity()
  await db`UPDATE suspicious_activity SET archived = TRUE WHERE resolved = TRUE`
  return db`SELECT COUNT(*) as count FROM suspicious_activity WHERE archived = TRUE`
}

// ─── Visitor Analytics ────────────────────────────────────────────────────────
let visitorMigrated = false

async function ensureVisitorTable() {
  const db = await getDB()
  if (!visitorMigrated) {
    await db`
      CREATE TABLE IF NOT EXISTS visitor_sessions (
        session_id  TEXT    PRIMARY KEY,
        first_visit BIGINT  NOT NULL,
        last_active BIGINT  NOT NULL
      )`
    visitorMigrated = true
  }
  return db
}

/** Upsert a visitor session — returns { total, active } */
export async function dbRecordVisit(sessionId: string): Promise<{ total: number; active: number }> {
  const db = await ensureVisitorTable()
  const now = Date.now()
  await db`
    INSERT INTO visitor_sessions (session_id, first_visit, last_active)
    VALUES (${sessionId}, ${now}, ${now})
    ON CONFLICT (session_id) DO UPDATE SET last_active = EXCLUDED.last_active`
  return dbGetVisitorStats()
}

/** Active = last_active within the last 5 minutes */
export async function dbGetVisitorStats(): Promise<{ total: number; active: number; lastUpdated: number }> {
  const db = await ensureVisitorTable()
  const fiveMinAgo = Date.now() - 5 * 60 * 1000
  const [totalRow] = await db`SELECT COUNT(*) AS count FROM visitor_sessions`
  const [activeRow] = await db`SELECT COUNT(*) AS count FROM visitor_sessions WHERE last_active > ${fiveMinAgo}`
  return {
    total:       parseInt(totalRow?.count ?? '0'),
    active:      parseInt(activeRow?.count ?? '0'),
    lastUpdated: Date.now(),
  }
}

// ─── Journey Stories ──────────────────────────────────────────────────────────
let storiesMigrated = false

export async function ensureStoriesTable() {
  const db = await getDB()
  if (!storiesMigrated) {
    await db`CREATE TABLE IF NOT EXISTS journey_stories (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      label TEXT NOT NULL DEFAULT '',
      emoji TEXT NOT NULL DEFAULT '📸',
      media_id TEXT NOT NULL DEFAULT '',
      media_type TEXT NOT NULL DEFAULT 'image',
      created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )`
    storiesMigrated = true
  }
  return db
}

export async function dbGetStories() {
  const db = await ensureStoriesTable()
  return db`SELECT * FROM journey_stories ORDER BY created_at DESC`
}
export async function dbSaveStory(story: { id: string; title: string; label: string; emoji: string; media_id: string; media_type: string; created_at: number }) {
  const db = await ensureStoriesTable()
  await db`INSERT INTO journey_stories (id, title, label, emoji, media_id, media_type, created_at)
    VALUES (${story.id}, ${story.title}, ${story.label}, ${story.emoji}, ${story.media_id}, ${story.media_type}, ${story.created_at})
    ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, label=EXCLUDED.label, emoji=EXCLUDED.emoji, media_id=EXCLUDED.media_id, media_type=EXCLUDED.media_type`
}
export async function dbDeleteStory(id: string) {
  const db = await ensureStoriesTable()
  await db`DELETE FROM journey_stories WHERE id = ${id}`
}

// ─── Journey Followers ────────────────────────────────────────────────────────
let followersMigrated = false

export async function ensureFollowersTable() {
  const db = await getDB()
  if (!followersMigrated) {
    await db`CREATE TABLE IF NOT EXISTS journey_followers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '',
      fingerprint TEXT NOT NULL DEFAULT '',
      followed_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
    )`
    followersMigrated = true
  }
  return db
}

export async function dbGetFollowersCount(): Promise<number> {
  const db = await ensureFollowersTable()
  const rows = await db`SELECT COUNT(*) as count FROM journey_followers`
  return parseInt(rows[0]?.count ?? '0')
}
export async function dbCheckFollower(fingerprint: string): Promise<boolean> {
  const db = await ensureFollowersTable()
  const rows = await db`SELECT id FROM journey_followers WHERE fingerprint = ${fingerprint}`
  return rows.length > 0
}
export async function dbAddFollower(follower: { id: string; name: string; email: string; ip: string; fingerprint: string; followed_at: number }) {
  const db = await ensureFollowersTable()
  await db`INSERT INTO journey_followers (id, name, email, ip, fingerprint, followed_at)
    VALUES (${follower.id}, ${follower.name}, ${follower.email}, ${follower.ip}, ${follower.fingerprint}, ${follower.followed_at})
    ON CONFLICT (id) DO NOTHING`
}
export async function dbRemoveFollower(fingerprint: string) {
  const db = await ensureFollowersTable()
  await db`DELETE FROM journey_followers WHERE fingerprint = ${fingerprint}`
}
export async function dbGetFollowers(limit = 100) {
  const db = await ensureFollowersTable()
  return db`SELECT id, name, email, ip, followed_at FROM journey_followers ORDER BY followed_at DESC LIMIT ${limit}`
}

// ─── Fingerprint-aware blocking ───────────────────────────────────────────────
export async function dbBlockIPWithMeta(ip: string, reason: string, unblockAt = 0, meta?: { fingerprint?: string; user_name?: string; user_email?: string; user_location?: string; user_device?: string }) {
  const db = await getDB()
  await dbInitSecurity()
  const fp = meta?.fingerprint || ''
  const uname = meta?.user_name || ''
  const uemail = meta?.user_email || ''
  const uloc = meta?.user_location || ''
  const udev = meta?.user_device || ''
  await db`INSERT INTO blocked_ips (ip, reason, blocked_at, unblock_at, fingerprint, user_name, user_email, user_location, user_device)
    VALUES (${ip}, ${reason}, ${Date.now()}, ${unblockAt}, ${fp}, ${uname}, ${uemail}, ${uloc}, ${udev})
    ON CONFLICT (ip) DO UPDATE SET
      reason = EXCLUDED.reason, blocked_at = EXCLUDED.blocked_at, unblock_at = EXCLUDED.unblock_at,
      fingerprint = COALESCE(NULLIF(EXCLUDED.fingerprint,''), blocked_ips.fingerprint),
      user_name = COALESCE(NULLIF(EXCLUDED.user_name,''), blocked_ips.user_name),
      user_email = COALESCE(NULLIF(EXCLUDED.user_email,''), blocked_ips.user_email),
      user_location = COALESCE(NULLIF(EXCLUDED.user_location,''), blocked_ips.user_location),
      user_device = COALESCE(NULLIF(EXCLUDED.user_device,''), blocked_ips.user_device)`
  // Shadow row keyed by fingerprint — persists across IP changes
  if (fp) {
    await db`INSERT INTO blocked_ips (ip, reason, blocked_at, unblock_at, fingerprint, user_name, user_email, user_location, user_device)
      VALUES (${'fp:' + fp}, ${reason}, ${Date.now()}, ${unblockAt}, ${fp}, ${uname}, ${uemail}, ${uloc}, ${udev})
      ON CONFLICT (ip) DO UPDATE SET reason = EXCLUDED.reason, blocked_at = EXCLUDED.blocked_at, unblock_at = EXCLUDED.unblock_at`.catch(() => {})
  }
}

export async function dbGetBlockedByFingerprint(fingerprint: string) {
  if (!fingerprint) return null
  const db = await getDB()
  await dbInitSecurity()
  const rows = await db`SELECT * FROM blocked_ips WHERE fingerprint = ${fingerprint} OR ip = ${'fp:' + fingerprint} LIMIT 1` as any[]
  if (rows.length === 0) return null
  const row = rows[0]
  if (row.unblock_at && row.unblock_at > 0 && Date.now() > Number(row.unblock_at)) {
    await db`DELETE FROM blocked_ips WHERE fingerprint = ${fingerprint} OR ip = ${'fp:' + fingerprint}`
    return null
  }
  return row
}

export async function dbUnblockByFingerprint(fingerprint: string) {
  const db = await getDB()
  await dbInitSecurity()
  await db`DELETE FROM blocked_ips WHERE fingerprint = ${fingerprint} OR ip = ${'fp:' + fingerprint}`
}

// ─── Appeal Functions ─────────────────────────────────────────────────────────
export async function dbSaveAppeal(appeal: { id: string; ip: string; fingerprint: string; user_name: string; user_email: string; comment: string; created_at: number }) {
  const db = await getDB()
  await dbInitSecurity()
  await db`INSERT INTO blocked_appeals (id, ip, fingerprint, user_name, user_email, comment, status, admin_note, created_at, updated_at)
    VALUES (${appeal.id}, ${appeal.ip}, ${appeal.fingerprint}, ${appeal.user_name}, ${appeal.user_email}, ${appeal.comment}, 'pending', '', ${appeal.created_at}, ${Date.now()})
    ON CONFLICT (id) DO NOTHING`
}

export async function dbGetAppeals(limit = 100) {
  const db = await getDB()
  await dbInitSecurity()
  return db`SELECT * FROM blocked_appeals ORDER BY created_at DESC LIMIT ${limit}`
}

export async function dbUpdateAppeal(id: string, status: string, admin_note: string) {
  const db = await getDB()
  await dbInitSecurity()
  await db`UPDATE blocked_appeals SET status = ${status}, admin_note = ${admin_note}, updated_at = ${Date.now()} WHERE id = ${id}`
}

// ─── Push Subscription DB Functions ──────────────────────────────────────────

export async function dbSavePushSubscription(sub: {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}) {
  const sql = await initDb()
  await sql`
    INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, created_at)
    VALUES (${sub.id}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, ${Date.now()})
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = ${sub.p256dh}, auth = ${sub.auth}
  `
}

export async function dbGetPushSubscriptions() {
  const sql = await initDb()
  const rows = await sql`SELECT * FROM push_subscriptions ORDER BY created_at DESC`
  return rows
}

export async function dbDeletePushSubscription(endpoint: string) {
  const sql = await initDb()
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`
}

// ─── Admin Credentials (DB-backed) ───────────────────────────────────────────

export interface AdminCredentials {
  username: string
  password: string   // bcrypt hash when stored in DB
  email:    string
}

/**
 * Load admin credentials from DB. Falls back to env vars only when the DB
 * row doesn't exist yet (first boot / fresh deployment).
 */
export async function dbGetAdminCredentials(): Promise<AdminCredentials | null> {
  try {
    const db = await getDB()
    const rows = await db`SELECT username, password, email FROM admin_credentials WHERE id = 'main' LIMIT 1`
    if (rows.length === 0) return null
    return { username: rows[0].username, password: rows[0].password, email: rows[0].email }
  } catch {
    return null
  }
}

/**
 * Upsert admin credentials in DB.  Password must be a bcrypt hash.
 */
export async function dbSetAdminCredentials(creds: AdminCredentials) {
  const db = await getDB()
  await db`
    INSERT INTO admin_credentials (id, username, password, email, updated_at)
    VALUES ('main', ${creds.username}, ${creds.password}, ${creds.email}, ${Date.now()})
    ON CONFLICT (id) DO UPDATE SET
      username   = EXCLUDED.username,
      password   = EXCLUDED.password,
      email      = COALESCE(NULLIF(EXCLUDED.email,''), admin_credentials.email),
      updated_at = EXCLUDED.updated_at
  `
}

// ─── Visitor Push Subscriptions ───────────────────────────────────────────────

export async function dbSaveVisitorPushSubscription(sub: {
  id: string
  endpoint: string
  p256dh: string
  auth: string
  fingerprint?: string
  user_name?: string
  user_email?: string
}) {
  const db = await getDB()
  await db`
    INSERT INTO visitor_push_subscriptions (id, endpoint, p256dh, auth, fingerprint, user_name, user_email, created_at)
    VALUES (${sub.id}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth}, ${sub.fingerprint||''}, ${sub.user_name||''}, ${sub.user_email||''}, ${Date.now()})
    ON CONFLICT (endpoint) DO UPDATE SET
      p256dh      = EXCLUDED.p256dh,
      auth        = EXCLUDED.auth,
      fingerprint = COALESCE(NULLIF(EXCLUDED.fingerprint,''), visitor_push_subscriptions.fingerprint),
      user_name   = COALESCE(NULLIF(EXCLUDED.user_name,''),   visitor_push_subscriptions.user_name),
      user_email  = COALESCE(NULLIF(EXCLUDED.user_email,''),  visitor_push_subscriptions.user_email)
  `
}

export async function dbGetAllVisitorPushSubscriptions() {
  const db = await getDB()
  const rows = await db`SELECT * FROM visitor_push_subscriptions ORDER BY created_at DESC`
  return rows as any[]
}

export async function dbDeleteVisitorPushSubscription(endpoint: string) {
  const db = await getDB()
  await db`DELETE FROM visitor_push_subscriptions WHERE endpoint = ${endpoint}`
}

export async function dbGetVisitorPushSubscriptionsByFingerprint(fingerprint: string) {
  if (!fingerprint) return []
  const db = await getDB()
  const rows = await db`SELECT * FROM visitor_push_subscriptions WHERE fingerprint = ${fingerprint}`
  return rows as any[]
}

// ─── Meeting Reminders ─────────────────────────────────────────────────────────

export async function dbCreateReminder(bookingId: string, scheduledAt: Date) {
  const db = await getDB()
  const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
  // Prevent duplicates: only create if no pending reminder for this booking
  const existing = await db`
    SELECT id FROM meeting_reminders WHERE booking_id = ${bookingId} AND sent = false AND failed = false LIMIT 1
  `
  if (existing.length > 0) return existing[0] as any
  const rows = await db`
    INSERT INTO meeting_reminders (id, booking_id, scheduled_at)
    VALUES (${id}, ${bookingId}, ${scheduledAt.toISOString()})
    RETURNING *
  `
  return rows[0] as any
}

export async function dbGetDueReminders(): Promise<any[]> {
  const db = await getDB()
  const rows = await db`
    SELECT r.*, b.name, b.email, b.proposed_date, b.timezone, b.meeting_link, b.type, b.platform
    FROM meeting_reminders r
    JOIN meeting_bookings b ON b.id = r.booking_id
    WHERE r.sent = false AND r.failed = false AND r.retry_count < 3
      AND r.scheduled_at <= NOW()
      AND b.status = 'approved'
    ORDER BY r.scheduled_at ASC
    LIMIT 20
  `
  return rows as any[]
}

export async function dbMarkReminderSent(id: string) {
  const db = await getDB()
  await db`UPDATE meeting_reminders SET sent = true, sent_at = NOW() WHERE id = ${id}`
}

export async function dbMarkReminderFailed(id: string, reason: string) {
  const db = await getDB()
  await db`
    UPDATE meeting_reminders
    SET retry_count = retry_count + 1,
        fail_reason = ${reason},
        failed = CASE WHEN retry_count >= 2 THEN true ELSE false END
    WHERE id = ${id}
  `
}

export async function dbGetRemindersByBooking(bookingId: string) {
  const db = await getDB()
  const rows = await db`SELECT * FROM meeting_reminders WHERE booking_id = ${bookingId} ORDER BY created_at DESC`
  return rows as any[]
}

export async function dbGetAllReminders(limit = 50) {
  const db = await getDB()
  const rows = await db`
    SELECT r.*, b.name, b.email, b.proposed_date, b.type
    FROM meeting_reminders r
    LEFT JOIN meeting_bookings b ON b.id = r.booking_id
    ORDER BY r.scheduled_at DESC LIMIT ${limit}
  `
  return rows as any[]
}

// ─── Project Media ──────────────────────────────────────────────────────────────

export async function dbCreateProjectMedia(data: {
  project_id: string; media_type: string; media_url: string
  thumbnail_url?: string; title?: string; description?: string; display_order?: number
}) {
  const db = await getDB()
  const id = `media_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
  const rows = await db`
    INSERT INTO project_media (id, project_id, media_type, media_url, thumbnail_url, title, description, display_order)
    VALUES (${id}, ${data.project_id}, ${data.media_type}, ${data.media_url},
            ${data.thumbnail_url||null}, ${data.title||''}, ${data.description||''},
            ${data.display_order??0})
    RETURNING *
  `
  return rows[0] as any
}

export async function dbGetProjectMedia(projectId: string) {
  const db = await getDB()
  const rows = await db`
    SELECT * FROM project_media WHERE project_id = ${projectId} ORDER BY display_order ASC, uploaded_at ASC
  `
  return rows as any[]
}

export async function dbGetAllProjectMedia() {
  const db = await getDB()
  const rows = await db`SELECT * FROM project_media ORDER BY project_id, display_order ASC`
  return rows as any[]
}

export async function dbUpdateProjectMedia(id: string, data: {
  title?: string; description?: string; display_order?: number; thumbnail_url?: string
}) {
  const db = await getDB()
  await db`
    UPDATE project_media SET
      title = COALESCE(${data.title??null}, title),
      description = COALESCE(${data.description??null}, description),
      display_order = COALESCE(${data.display_order??null}, display_order),
      thumbnail_url = COALESCE(${data.thumbnail_url??null}, thumbnail_url)
    WHERE id = ${id}
  `
}

export async function dbDeleteProjectMedia(id: string) {
  const db = await getDB()
  await db`DELETE FROM project_media WHERE id = ${id}`
}

export async function dbReorderProjectMedia(items: { id: string; display_order: number }[]) {
  const db = await getDB()
  for (const item of items) {
    await db`UPDATE project_media SET display_order = ${item.display_order} WHERE id = ${item.id}`
  }
}

// ─── Chatbot Abuse ──────────────────────────────────────────────────────────────

export async function dbGetAbuseRecord(fingerprint: string, ipAddress: string): Promise<any|null> {
  const db = await getDB()
  if (fingerprint) {
    const rows = await db`SELECT * FROM chatbot_abuse WHERE fingerprint = ${fingerprint} LIMIT 1`
    if (rows.length > 0) return rows[0]
  }
  if (ipAddress) {
    const rows = await db`SELECT * FROM chatbot_abuse WHERE ip_address = ${ipAddress} LIMIT 1`
    if (rows.length > 0) return rows[0]
  }
  return null
}

export async function dbRecordAbuse(fingerprint: string, ipAddress: string): Promise<any> {
  const db = await getDB()
  const existing = await dbGetAbuseRecord(fingerprint, ipAddress)
  if (existing) {
    const newCount = existing.abuse_count + 1
    const blocked = newCount >= 2
    const rows = await db`
      UPDATE chatbot_abuse
      SET abuse_count = ${newCount}, warn_shown = true, last_abuse_at = NOW(),
          blocked = ${blocked}, blocked_at = CASE WHEN ${blocked} AND blocked_at IS NULL THEN NOW() ELSE blocked_at END
      WHERE id = ${existing.id}
      RETURNING *
    `
    return rows[0]
  }
  const id = `abuse_${Date.now()}_${Math.random().toString(36).slice(2,7)}`
  const rows = await db`
    INSERT INTO chatbot_abuse (id, fingerprint, ip_address, abuse_count, warn_shown)
    VALUES (${id}, ${fingerprint||''}, ${ipAddress||''}, 1, false)
    RETURNING *
  `
  return rows[0]
}

export async function dbMarkWarnShown(fingerprint: string, ipAddress: string) {
  const db = await getDB()
  if (fingerprint) {
    await db`UPDATE chatbot_abuse SET warn_shown = true WHERE fingerprint = ${fingerprint}`
  } else if (ipAddress) {
    await db`UPDATE chatbot_abuse SET warn_shown = true WHERE ip_address = ${ipAddress}`
  }
}

export async function dbUnblockAbuse(id: string) {
  const db = await getDB()
  await db`UPDATE chatbot_abuse SET blocked = false, abuse_count = 0, warn_shown = false WHERE id = ${id}`
}

/** Clears any chatbot-abuse record tied to this fingerprint/IP (used for whitelisted visitors). */
export async function dbClearAbuseRecord(fingerprint: string, ipAddress: string) {
  const db = await getDB()
  if (fingerprint) {
    await db`UPDATE chatbot_abuse SET blocked = false, abuse_count = 0, warn_shown = false WHERE fingerprint = ${fingerprint}`
  }
  if (ipAddress) {
    await db`UPDATE chatbot_abuse SET blocked = false, abuse_count = 0, warn_shown = false WHERE ip_address = ${ipAddress}`
  }
}

export async function dbGetAllAbuseRecords() {
  const db = await getDB()
  const rows = await db`SELECT * FROM chatbot_abuse ORDER BY last_abuse_at DESC`
  return rows as any[]
}
