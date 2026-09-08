/**
 * lib/scheduling-store.ts
 * Brand-new scheduling system — clean slate.
 * Uses the existing neon sql client from lib/db.ts (getDB).
 * Tables: schedule_requests, admin_availability
 * Zero impact on any existing table.
 */

import { getDB } from './db'

export type RequestStatus  = 'pending' | 'approved' | 'rejected' | 'cancelled'
export type MeetingPurpose = 'interview' | 'consultation' | 'freelance' | 'other'
export type Platform       = 'google_meet' | 'zoom' | 'teams' | 'jitsi'

export interface ScheduleRequest {
  id: string
  name: string
  email: string
  company?: string
  role?: string
  purpose: MeetingPurpose
  message?: string
  preferred_date: string          // ISO string e.g. "2025-06-20T10:00"
  timezone: string
  platform: Platform
  duration_mins: number           // 30 | 45 | 60
  status: RequestStatus
  meeting_link?: string
  calendly_event_id?: string
  calendly_event_url?: string
  rejection_reason?: string
  admin_notes?: string
  approved_at?: string
  rejected_at?: string
  notified: boolean
  created_at: string
  updated_at: string
}

export interface AdminAvailability {
  id: string
  day_of_week: number             // 0=Sun … 6=Sat
  start_time: string              // "09:00"
  end_time: string                // "18:00"
  is_active: boolean
  timezone: string
  created_at: string
}

/* ── One-time migration guard ──────────────────────────────────────────────── */
let _ready = false

export async function ensureSchedulingTables() {
  if (_ready) return
  const db = await getDB()

  await db`
    CREATE TABLE IF NOT EXISTS schedule_requests (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      email             TEXT NOT NULL,
      company           TEXT,
      role              TEXT,
      purpose           TEXT NOT NULL DEFAULT 'other',
      message           TEXT,
      preferred_date    TEXT NOT NULL,
      timezone          TEXT NOT NULL DEFAULT 'UTC',
      platform          TEXT NOT NULL DEFAULT 'google_meet',
      duration_mins     INTEGER NOT NULL DEFAULT 30,
      status            TEXT NOT NULL DEFAULT 'pending',
      meeting_link      TEXT,
      calendly_event_id TEXT,
      calendly_event_url TEXT,
      rejection_reason  TEXT,
      admin_notes       TEXT,
      approved_at       TIMESTAMPTZ,
      rejected_at       TIMESTAMPTZ,
      notified          BOOLEAN NOT NULL DEFAULT false,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  await db`
    CREATE TABLE IF NOT EXISTS admin_availability (
      id           TEXT PRIMARY KEY,
      day_of_week  INTEGER NOT NULL,
      start_time   TEXT NOT NULL DEFAULT '09:00',
      end_time     TEXT NOT NULL DEFAULT '18:00',
      is_active    BOOLEAN NOT NULL DEFAULT true,
      timezone     TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  try { await db`CREATE INDEX IF NOT EXISTS idx_sr_status      ON schedule_requests(status)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_sr_email       ON schedule_requests(email)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_sr_date        ON schedule_requests(preferred_date)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_aa_day         ON admin_availability(day_of_week)` } catch {}

  /* Seed default availability Mon–Fri 9am–6pm IST if empty */
  const existing = await db`SELECT id FROM admin_availability LIMIT 1`
  if (existing.length === 0) {
    for (const day of [1, 2, 3, 4, 5]) {   // Mon–Fri
      const id = `av_${day}_${Date.now()}`
      await db`
        INSERT INTO admin_availability (id, day_of_week, start_time, end_time, is_active, timezone)
        VALUES (${id}, ${day}, '09:00', '18:00', true, 'Asia/Kolkata')
        ON CONFLICT DO NOTHING
      `
    }
  }

  _ready = true
}

/* ══════════════════════════════════════════════════════════════════════════════
   SCHEDULE REQUESTS
   ══════════════════════════════════════════════════════════════════════════════ */

export async function srCreate(data: Omit<ScheduleRequest,
  'id' | 'status' | 'meeting_link' | 'calendly_event_id' | 'calendly_event_url' |
  'rejection_reason' | 'admin_notes' | 'approved_at' | 'rejected_at' |
  'notified' | 'created_at' | 'updated_at'>
): Promise<ScheduleRequest> {
  await ensureSchedulingTables()
  const db = await getDB()
  const id = `sr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  const rows = await db`
    INSERT INTO schedule_requests
      (id, name, email, company, role, purpose, message,
       preferred_date, timezone, platform, duration_mins)
    VALUES
      (${id}, ${data.name}, ${data.email}, ${data.company ?? null},
       ${data.role ?? null}, ${data.purpose}, ${data.message ?? null},
       ${data.preferred_date}, ${data.timezone}, ${data.platform}, ${data.duration_mins})
    RETURNING *
  `
  return rows[0] as ScheduleRequest
}

export async function srList(status?: RequestStatus): Promise<ScheduleRequest[]> {
  await ensureSchedulingTables()
  const db = await getDB()
  if (status) {
    return db`SELECT * FROM schedule_requests WHERE status = ${status} ORDER BY created_at DESC` as any
  }
  return db`SELECT * FROM schedule_requests ORDER BY created_at DESC` as any
}

export async function srGet(id: string): Promise<ScheduleRequest | null> {
  await ensureSchedulingTables()
  const db = await getDB()
  const rows = await db`SELECT * FROM schedule_requests WHERE id = ${id}`
  return (rows[0] as ScheduleRequest) ?? null
}

export async function srStats() {
  await ensureSchedulingTables()
  const db = await getDB()
  const rows = await db`
    SELECT
      COUNT(*)                                            AS total,
      COUNT(*) FILTER (WHERE status='pending')            AS pending,
      COUNT(*) FILTER (WHERE status='approved')           AS approved,
      COUNT(*) FILTER (WHERE status='rejected')           AS rejected
    FROM schedule_requests
  `
  const r = rows[0] as any
  return {
    total:    Number(r?.total    ?? 0),
    pending:  Number(r?.pending  ?? 0),
    approved: Number(r?.approved ?? 0),
    rejected: Number(r?.rejected ?? 0),
  }
}

export async function srApprove(
  id: string,
  meetingLink: string,
  opts?: { calendlyEventId?: string; calendlyEventUrl?: string; adminNotes?: string }
): Promise<ScheduleRequest | null> {
  await ensureSchedulingTables()
  const db = await getDB()
  const rows = await db`
    UPDATE schedule_requests SET
      status             = 'approved',
      meeting_link       = ${meetingLink},
      calendly_event_id  = ${opts?.calendlyEventId  ?? null},
      calendly_event_url = ${opts?.calendlyEventUrl ?? null},
      admin_notes        = ${opts?.adminNotes       ?? null},
      approved_at        = NOW(),
      updated_at         = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return (rows[0] as ScheduleRequest) ?? null
}

export async function srReject(
  id: string,
  reason: string,
  adminNotes?: string
): Promise<ScheduleRequest | null> {
  await ensureSchedulingTables()
  const db = await getDB()
  const rows = await db`
    UPDATE schedule_requests SET
      status           = 'rejected',
      rejection_reason = ${reason},
      admin_notes      = ${adminNotes ?? null},
      rejected_at      = NOW(),
      updated_at       = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  return (rows[0] as ScheduleRequest) ?? null
}

export async function srMarkNotified(id: string) {
  const db = await getDB()
  await db`UPDATE schedule_requests SET notified=true, updated_at=NOW() WHERE id=${id}`
}

export async function srDelete(id: string) {
  await ensureSchedulingTables()
  const db = await getDB()
  await db`DELETE FROM schedule_requests WHERE id = ${id}`
}

/* ══════════════════════════════════════════════════════════════════════════════
   ADMIN AVAILABILITY
   ══════════════════════════════════════════════════════════════════════════════ */

export async function avGetAll(): Promise<AdminAvailability[]> {
  await ensureSchedulingTables()
  const db = await getDB()
  return db`SELECT * FROM admin_availability ORDER BY day_of_week ASC` as any
}

export async function avUpsert(slots: {
  day_of_week: number; start_time: string; end_time: string; is_active: boolean; timezone: string
}[]) {
  await ensureSchedulingTables()
  const db = await getDB()
  for (const s of slots) {
    const existing = await db`SELECT id FROM admin_availability WHERE day_of_week = ${s.day_of_week}`
    if (existing.length > 0) {
      await db`
        UPDATE admin_availability SET
          start_time = ${s.start_time},
          end_time   = ${s.end_time},
          is_active  = ${s.is_active},
          timezone   = ${s.timezone}
        WHERE day_of_week = ${s.day_of_week}
      `
    } else {
      const id = `av_${s.day_of_week}_${Date.now()}`
      await db`
        INSERT INTO admin_availability (id, day_of_week, start_time, end_time, is_active, timezone)
        VALUES (${id}, ${s.day_of_week}, ${s.start_time}, ${s.end_time}, ${s.is_active}, ${s.timezone})
      `
    }
  }
}

/* ── Returns booked slots for a given date (for UI) ─────────────────────────── */
export async function srGetBookedSlots(date: string): Promise<string[]> {
  await ensureSchedulingTables()
  const db = await getDB()
  const rows = await db`
    SELECT preferred_date FROM schedule_requests
    WHERE preferred_date LIKE ${date + '%'}
      AND status IN ('pending', 'approved')
  `
  return (rows as any[]).map(r => r.preferred_date)
}
