import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

const sql = neon(process.env.DATABASE_URL!)
let schemaReady = false

export const MAX_LOGIN_ATTEMPTS = 3

// All 23 permission keys map 1:1 to the real admin's dashboard sections.
export const PERMISSION_KEYS = [
  'hero', 'about', 'skills', 'experience', 'education', 'projects', 'certifications',
  'journey', 'languages_admin', 'messages', 'live_chat', 'chatbot', 'ai_conversations',
  'settings', 'legal', 'security', 'github_settings', 'portfolio_blogs',
  'testimonials_admin', 'meetings', 'reminders', 'chatbot_abuse', 'version',
] as const

export const PERMISSION_LABELS: Record<string, string> = {
  hero: 'Edit Hero', about: 'Edit About', skills: 'Edit Skills', experience: 'Edit Experience',
  education: 'Edit Education', projects: 'Edit Projects', certifications: 'Edit Certifications',
  journey: 'Edit Journey', languages_admin: 'Edit Languages', messages: 'Edit Messages',
  live_chat: 'Edit Live Chats', chatbot: 'Edit Chatbot Setup', ai_conversations: 'Edit AI Conversations',
  settings: 'Edit Settings', legal: 'Edit Legal Content', security: 'Edit Security',
  github_settings: 'Edit GitHub Settings', portfolio_blogs: 'Edit Blog & Articles',
  testimonials_admin: 'Edit Testimonials', meetings: 'Edit Meetings & Interviews',
  reminders: 'Edit Reminder Status', chatbot_abuse: 'Edit Blocked Users', version: 'Edit Version & Changelog',
}

export const RELATIONS = ['Wife', 'Brother', 'Sister', 'Friend', 'Child', 'Parent', 'Other'] as const

export async function ensureCoAdminSchema() {
  if (schemaReady) return
  await sql`CREATE TABLE IF NOT EXISTS co_admins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    relation TEXT NOT NULL,
    security_question TEXT NOT NULL,
    security_answer TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    blocked BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    enable_requested_at BIGINT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
    last_login_at BIGINT
  )`
  await sql`CREATE TABLE IF NOT EXISTS co_admin_activity (
    id TEXT PRIMARY KEY,
    co_admin_id TEXT NOT NULL,
    co_admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    section TEXT,
    detail TEXT,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
  )`
  schemaReady = true
}

function genId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export async function listCoAdmins() {
  await ensureCoAdminSchema()
  const rows = await sql`SELECT id, name, username, relation, permissions, enabled, blocked, failed_attempts, enable_requested_at, created_at, last_login_at FROM co_admins ORDER BY created_at DESC`
  return rows
}

export async function createCoAdmin(opts: {
  name: string; username: string; password: string; relation: string
  securityQuestion: string; securityAnswer: string; permissions: string[]
}) {
  await ensureCoAdminSchema()
  const existing = await sql`SELECT id FROM co_admins WHERE username = ${opts.username}`
  if (existing.length) throw new Error('That username is already taken.')
  const id = genId('coadmin')
  const passwordHash = await bcrypt.hash(opts.password, 10)
  const answerHash = await bcrypt.hash(opts.securityAnswer.trim().toLowerCase(), 10)
  const permissions = opts.permissions.filter(p => (PERMISSION_KEYS as readonly string[]).includes(p))
  await sql`INSERT INTO co_admins (id, name, username, password, relation, security_question, security_answer, permissions, enabled, blocked, failed_attempts)
    VALUES (${id}, ${opts.name}, ${opts.username}, ${passwordHash}, ${opts.relation}, ${opts.securityQuestion}, ${answerHash}, ${JSON.stringify(permissions)}, TRUE, FALSE, 0)`
  return { id }
}

export async function updateCoAdmin(id: string, opts: Partial<{
  name: string; relation: string; permissions: string[]; password: string
  securityQuestion: string; securityAnswer: string
}>) {
  await ensureCoAdminSchema()
  if (opts.name !== undefined) await sql`UPDATE co_admins SET name = ${opts.name} WHERE id = ${id}`
  if (opts.relation !== undefined) await sql`UPDATE co_admins SET relation = ${opts.relation} WHERE id = ${id}`
  if (opts.permissions !== undefined) {
    const permissions = opts.permissions.filter(p => (PERMISSION_KEYS as readonly string[]).includes(p))
    await sql`UPDATE co_admins SET permissions = ${JSON.stringify(permissions)} WHERE id = ${id}`
  }
  if (opts.password) {
    const hash = await bcrypt.hash(opts.password, 10)
    await sql`UPDATE co_admins SET password = ${hash} WHERE id = ${id}`
  }
  if (opts.securityQuestion !== undefined) await sql`UPDATE co_admins SET security_question = ${opts.securityQuestion} WHERE id = ${id}`
  if (opts.securityAnswer) {
    const hash = await bcrypt.hash(opts.securityAnswer.trim().toLowerCase(), 10)
    await sql`UPDATE co_admins SET security_answer = ${hash} WHERE id = ${id}`
  }
}

export async function setCoAdminEnabled(id: string, enabled: boolean) {
  await ensureCoAdminSchema()
  await sql`UPDATE co_admins SET enabled = ${enabled}, enable_requested_at = NULL WHERE id = ${id}`
}

export async function unblockCoAdmin(id: string) {
  await ensureCoAdminSchema()
  await sql`UPDATE co_admins SET blocked = FALSE, failed_attempts = 0 WHERE id = ${id}`
}

export async function deleteCoAdmin(id: string) {
  await ensureCoAdminSchema()
  await sql`DELETE FROM co_admin_activity WHERE co_admin_id = ${id}`
  await sql`DELETE FROM co_admins WHERE id = ${id}`
}

export async function requestEnable(username: string) {
  await ensureCoAdminSchema()
  await sql`UPDATE co_admins SET enable_requested_at = ${Date.now()} WHERE username = ${username}`
}

export async function getCoAdminByUsername(username: string) {
  await ensureCoAdminSchema()
  const rows = await sql`SELECT * FROM co_admins WHERE username = ${username}`
  return rows[0] || null
}

export async function getCoAdminById(id: string) {
  await ensureCoAdminSchema()
  const rows = await sql`SELECT * FROM co_admins WHERE id = ${id}`
  return rows[0] || null
}

/** Step 1 of co-admin login: relation + username + password. */
export async function verifyCoAdminCredentials(relation: string, username: string, password: string) {
  const row = await getCoAdminByUsername(username)
  if (!row) return { status: 'invalid' as const }
  if (row.relation !== relation) return { status: 'invalid' as const }
  if (row.blocked) return { status: 'blocked' as const }
  if (!row.enabled) return { status: 'disabled' as const }
  const passOk = await bcrypt.compare(password, row.password)
  if (!passOk) return { status: 'invalid' as const }
  return { status: 'ok' as const, question: row.security_question, id: row.id }
}

/** Step 2 of co-admin login: security-question answer. On the 3rd wrong
 * answer the account is blocked until the real admin unblocks it. */
export async function verifyCoAdminAnswer(username: string, answer: string) {
  const row = await getCoAdminByUsername(username)
  if (!row) return { status: 'invalid' as const }
  if (row.blocked) return { status: 'blocked' as const }
  const ok = await bcrypt.compare(answer.trim().toLowerCase(), row.security_answer)
  if (ok) {
    await sql`UPDATE co_admins SET failed_attempts = 0, last_login_at = ${Date.now()} WHERE id = ${row.id}`
    return { status: 'ok' as const, id: row.id, name: row.name, permissions: (row.permissions || []) as string[] }
  }
  const attempts = Number(row.failed_attempts || 0) + 1
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    await sql`UPDATE co_admins SET failed_attempts = ${attempts}, blocked = TRUE WHERE id = ${row.id}`
    return { status: 'blocked' as const, name: row.name }
  }
  await sql`UPDATE co_admins SET failed_attempts = ${attempts} WHERE id = ${row.id}`
  return { status: 'wrong' as const, attemptsLeft: MAX_LOGIN_ATTEMPTS - attempts }
}

export async function logCoAdminActivity(coAdminId: string, coAdminName: string, action: string, section?: string, detail?: string) {
  await ensureCoAdminSchema()
  const id = genId('act')
  await sql`INSERT INTO co_admin_activity (id, co_admin_id, co_admin_name, action, section, detail)
    VALUES (${id}, ${coAdminId}, ${coAdminName}, ${action}, ${section || null}, ${detail || null})`
}

export async function getCoAdminActivity(limit = 100) {
  await ensureCoAdminSchema()
  return sql`SELECT * FROM co_admin_activity ORDER BY created_at DESC LIMIT ${limit}`
}
