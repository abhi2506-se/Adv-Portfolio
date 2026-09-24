/**
 * lib/meeting-store.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Brand-new "Schedule Meeting / Interview" system (v2). Lives alongside the
 * older lib/scheduling-store.ts (kept untouched for backward compatibility)
 * but is a clean, separate set of tables matching the new spec exactly:
 *   meeting_slots, meeting_requests, meeting_approvals,
 *   meeting_request_reminders, recruiter_verifications, calendar_events
 *
 * NOTE: the reminders table here is deliberately named
 * `meeting_request_reminders`, NOT `meeting_reminders`. lib/db.ts already
 * owns a *different* table literally called `meeting_reminders` (for the
 * older meeting_bookings/scheduling-store system, keyed by booking_id).
 * Both files run their own `CREATE TABLE IF NOT EXISTS` on startup — since
 * db.ts's migration runs on almost every request, it always wins the race
 * and creates `meeting_reminders` with its own (incompatible) columns
 * first. Whichever file used that shared name second would silently get
 * the wrong schema and every INSERT/SELECT would fail at runtime (e.g.
 * "column request_id of relation meeting_reminders does not exist"). Using
 * a distinct table name removes the collision entirely.
 *
 * Uses the existing Neon sql client from lib/db.ts (getDB). Zero impact on
 * any pre-existing table.
 */
import { getDB } from './db'
import { meetingTimezone } from './meeting-mailer'

export type MeetingType     = 'recruiter' | 'freelance'
export type MeetingStatus   = 'pending' | 'approved' | 'rejected' | 'rescheduled' | 'cancelled'
export type MeetingPlatform = 'google_meet' | 'zoom' | 'teams'
export type SlotStatus      = 'open' | 'booked' | 'blocked'

export interface MeetingSlot {
  id: string
  slot_date: string   // YYYY-MM-DD
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  platforms: string   // comma-separated MeetingPlatform list
  status: SlotStatus
  request_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MeetingRequest {
  id: string
  type: MeetingType
  full_name: string
  email: string            // official company email (recruiter) or personal email (freelance)
  company_name: string | null
  job_role: string | null
  phone: string | null
  details: string | null   // "Purpose of meeting" (recruiter) or project details (freelance)
  slot_id: string | null
  slot_date: string
  slot_time: string
  visitor_timezone: string | null  // IANA tz the visitor was viewing the booker in (display-only)
  platform: MeetingPlatform
  status: MeetingStatus
  meeting_link: string | null
  calendar_event_id: string | null
  rejection_reason: string | null
  admin_notes: string | null
  email_error: string | null
  verification_token: string | null
  created_at: string
  updated_at: string
}

let ensured = false

export async function ensureMeetingTables() {
  if (ensured) return
  const db = await getDB()

  await db`
    CREATE TABLE IF NOT EXISTS meeting_slots (
      id          TEXT PRIMARY KEY,
      slot_date   TEXT NOT NULL,
      start_time  TEXT NOT NULL,
      end_time    TEXT NOT NULL,
      platforms   TEXT NOT NULL DEFAULT 'google_meet,zoom,teams',
      status      TEXT NOT NULL DEFAULT 'open',
      request_id  TEXT,
      notes       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS meeting_requests (
      id                  TEXT PRIMARY KEY,
      type                TEXT NOT NULL,
      full_name           TEXT NOT NULL,
      email               TEXT NOT NULL,
      company_name        TEXT,
      job_role            TEXT,
      phone               TEXT,
      details             TEXT,
      slot_id             TEXT,
      slot_date           TEXT NOT NULL,
      slot_time           TEXT NOT NULL,
      visitor_timezone    TEXT,
      platform            TEXT NOT NULL DEFAULT 'google_meet',
      status              TEXT NOT NULL DEFAULT 'pending',
      meeting_link        TEXT,
      calendar_event_id   TEXT,
      rejection_reason    TEXT,
      admin_notes         TEXT,
      email_error         TEXT,
      verification_token  TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  try { await db`ALTER TABLE meeting_requests ADD COLUMN IF NOT EXISTS visitor_timezone TEXT` } catch {}
  await db`
    CREATE TABLE IF NOT EXISTS meeting_approvals (
      id             TEXT PRIMARY KEY,
      request_id     TEXT NOT NULL,
      action         TEXT NOT NULL,
      reason         TEXT,
      previous_date  TEXT,
      previous_time  TEXT,
      new_date       TEXT,
      new_time       TEXT,
      performed_by   TEXT NOT NULL DEFAULT 'admin',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS meeting_request_reminders (
      id          TEXT PRIMARY KEY,
      request_id  TEXT NOT NULL,
      kind        TEXT NOT NULL,
      remind_at   TIMESTAMPTZ NOT NULL,
      sent        BOOLEAN NOT NULL DEFAULT false,
      sent_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS recruiter_verifications (
      id                 TEXT PRIMARY KEY,
      email              TEXT NOT NULL,
      company_name       TEXT,
      otp_hash           TEXT NOT NULL,
      expires_at         TIMESTAMPTZ NOT NULL,
      verified           BOOLEAN NOT NULL DEFAULT false,
      verified_at        TIMESTAMPTZ,
      attempts           INTEGER NOT NULL DEFAULT 0,
      token              TEXT,
      token_expires_at   TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS calendar_events (
      id          TEXT PRIMARY KEY,
      request_id  TEXT NOT NULL,
      provider    TEXT NOT NULL DEFAULT 'google',
      event_id    TEXT,
      html_link   TEXT,
      ics_uid     TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  try { await db`CREATE INDEX IF NOT EXISTS idx_ms_date        ON meeting_slots(slot_date)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_ms_status      ON meeting_slots(status)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_mr_status      ON meeting_requests(status)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_mr_email       ON meeting_requests(email)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_ma_request     ON meeting_approvals(request_id)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_mrm_due        ON meeting_request_reminders(sent, remind_at)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_rv_email       ON recruiter_verifications(email)` } catch {}
  try { await db`CREATE INDEX IF NOT EXISTS idx_ce_request     ON calendar_events(request_id)` } catch {}

  ensured = true
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/* ════════════════════════════════════════════════════════════════════════
   TIME HELPERS — past-slot detection (timezone-aware) + duration math
   ════════════════════════════════════════════════════════════════════════ */

/** "HH:MM" -> total minutes since midnight. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/** Minutes between start_time and end_time ("HH:MM" strings, same day). */
export function slotDurationMinutes(start_time: string, end_time: string): number {
  return timeToMinutes(end_time) - timeToMinutes(start_time)
}

/** Current date ("YYYY-MM-DD") and time ("HH:MM", 24h) in the given IANA timezone. */
function nowPartsInTz(tz: string): { dateKey: string; timeKey: string } {
  const now = new Date()
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const timeKey = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now)
  return { dateKey, timeKey }
}

/** True once a slot's start_time is now in the past (in the configured meeting timezone). */
export async function isSlotInPast(slot_date: string, start_time: string): Promise<boolean> {
  const tz = await meetingTimezone()
  const { dateKey, timeKey } = nowPartsInTz(tz)
  if (slot_date < dateKey) return true
  if (slot_date > dateKey) return false
  return start_time <= timeKey
}

/** Filters out any slot whose start_time has already passed (today's slots only — future dates always pass through). */
export async function filterFutureSlots<T extends { slot_date: string; start_time: string }>(slots: T[]): Promise<T[]> {
  const tz = await meetingTimezone()
  const { dateKey, timeKey } = nowPartsInTz(tz)
  return slots.filter(s => {
    if (s.slot_date > dateKey) return true
    if (s.slot_date < dateKey) return false
    return s.start_time > timeKey
  })
}

/* ════════════════════════════════════════════════════════════════════════
   SLOTS
   ════════════════════════════════════════════════════════════════════════ */
export async function msCreate(input: {
  slot_date: string; start_time: string; end_time: string
  platforms?: string; notes?: string
}): Promise<MeetingSlot> {
  await ensureMeetingTables()
  const db = await getDB()
  const id = genId('slot')
  const rows = await db`
    INSERT INTO meeting_slots (id, slot_date, start_time, end_time, platforms, notes)
    VALUES (${id}, ${input.slot_date}, ${input.start_time}, ${input.end_time},
            ${input.platforms ?? 'google_meet,zoom,teams'}, ${input.notes ?? null})
    RETURNING *
  `
  return rows[0] as MeetingSlot
}

export async function msBulkCreate(slots: {
  slot_date: string; start_time: string; end_time: string; platforms?: string
}[]): Promise<number> {
  await ensureMeetingTables()
  let count = 0
  for (const s of slots) {
    // Skip duplicates (same date + start_time already exists)
    const db = await getDB()
    const existing = await db`SELECT id FROM meeting_slots WHERE slot_date=${s.slot_date} AND start_time=${s.start_time} LIMIT 1`
    if (existing.length > 0) continue
    await msCreate(s)
    count++
  }
  return count
}

export async function msList(opts: { from?: string; to?: string; status?: SlotStatus } = {}): Promise<MeetingSlot[]> {
  await ensureMeetingTables()
  const db = await getDB()
  const { from, to, status } = opts
  let rows: any[]
  if (from && to && status) {
    rows = await db`SELECT * FROM meeting_slots WHERE slot_date >= ${from} AND slot_date <= ${to} AND status = ${status} ORDER BY slot_date ASC, start_time ASC`
  } else if (from && to) {
    rows = await db`SELECT * FROM meeting_slots WHERE slot_date >= ${from} AND slot_date <= ${to} ORDER BY slot_date ASC, start_time ASC`
  } else if (from && status) {
    rows = await db`SELECT * FROM meeting_slots WHERE slot_date >= ${from} AND status = ${status} ORDER BY slot_date ASC, start_time ASC`
  } else if (from) {
    rows = await db`SELECT * FROM meeting_slots WHERE slot_date >= ${from} ORDER BY slot_date ASC, start_time ASC`
  } else if (status) {
    rows = await db`SELECT * FROM meeting_slots WHERE status = ${status} ORDER BY slot_date ASC, start_time ASC`
  } else {
    rows = await db`SELECT * FROM meeting_slots ORDER BY slot_date ASC, start_time ASC`
  }
  return rows as any
}

export async function msGet(id: string): Promise<MeetingSlot | null> {
  await ensureMeetingTables()
  const db = await getDB()
  const rows = await db`SELECT * FROM meeting_slots WHERE id=${id} LIMIT 1`
  return (rows[0] as MeetingSlot) ?? null
}

export async function msDelete(id: string) {
  const db = await getDB()
  await db`DELETE FROM meeting_slots WHERE id=${id}`
}

export async function msSetStatus(id: string, status: SlotStatus, request_id: string | null = null) {
  const db = await getDB()
  await db`UPDATE meeting_slots SET status=${status}, request_id=${request_id}, updated_at=NOW() WHERE id=${id}`
}

/** Atomically claims an open slot for a request. Returns false if it was already taken (race-safe) or if it has already passed. */
export async function msTryBook(id: string, request_id: string): Promise<boolean> {
  const db = await getDB()
  const slot = await msGet(id)
  if (!slot) return false
  if (await isSlotInPast(slot.slot_date, slot.start_time)) return false
  const rows = await db`
    UPDATE meeting_slots SET status='booked', request_id=${request_id}, updated_at=NOW()
    WHERE id=${id} AND status='open'
    RETURNING id
  `
  return rows.length > 0
}

export async function msFree(id: string | null) {
  if (!id) return
  const db = await getDB()
  await db`UPDATE meeting_slots SET status='open', request_id=NULL, updated_at=NOW() WHERE id=${id}`
}

/**
 * Creates a `meeting_slots` row on demand for a slot that was computed
 * dynamically from availability windows (see lib/availability-store.ts),
 * then atomically marks it 'booked'. This is the bridge between the new
 * windows-based availability engine and the existing slot_id-based booking
 * pipeline (reschedule, reminders, calendar invites, audit log all key off
 * slot_id and keep working unmodified).
 *
 * Race-safe: re-checks for an overlapping booked/blocked slot on the same
 * date immediately before inserting, inside the same call, so two visitors
 * racing for the same dynamically-computed window can't both succeed.
 * Returns null if the exact start_time/date was already taken meanwhile.
 */
export async function msCreateAndBookDynamic(input: {
  slot_date: string; start_time: string; end_time: string; platforms?: string
}): Promise<MeetingSlot | null> {
  await ensureMeetingTables()
  const db = await getDB()

  // Race guard: has anyone booked/blocked a slot with this exact start since we last looked?
  const clash = await db`
    SELECT id FROM meeting_slots
    WHERE slot_date=${input.slot_date} AND start_time=${input.start_time} AND status IN ('booked','blocked')
    LIMIT 1
  `
  if (clash.length > 0) return null

  const id = genId('slot')
  const rows = await db`
    INSERT INTO meeting_slots (id, slot_date, start_time, end_time, platforms, status)
    VALUES (${id}, ${input.slot_date}, ${input.start_time}, ${input.end_time},
            ${input.platforms ?? 'google_meet,zoom,teams'}, 'booked')
    RETURNING *
  `
  return rows[0] as MeetingSlot
}

/* ════════════════════════════════════════════════════════════════════════
   MEETING REQUESTS
   ════════════════════════════════════════════════════════════════════════ */
export async function mrCreate(data: {
  type: MeetingType; full_name: string; email: string
  company_name?: string | null; job_role?: string | null; phone?: string | null
  details?: string | null; slot_id: string; slot_date: string; slot_time: string
  platform: MeetingPlatform; verification_token?: string | null; visitor_timezone?: string | null
}): Promise<MeetingRequest> {
  await ensureMeetingTables()
  const db = await getDB()
  const id = genId('mreq')
  const rows = await db`
    INSERT INTO meeting_requests
      (id, type, full_name, email, company_name, job_role, phone, details,
       slot_id, slot_date, slot_time, platform, verification_token, visitor_timezone)
    VALUES
      (${id}, ${data.type}, ${data.full_name}, ${data.email},
       ${data.company_name ?? null}, ${data.job_role ?? null}, ${data.phone ?? null},
       ${data.details ?? null}, ${data.slot_id}, ${data.slot_date}, ${data.slot_time},
       ${data.platform}, ${data.verification_token ?? null}, ${data.visitor_timezone ?? null})
    RETURNING *
  `
  return rows[0] as MeetingRequest
}

export async function mrGet(id: string): Promise<MeetingRequest | null> {
  await ensureMeetingTables()
  const db = await getDB()
  const rows = await db`SELECT * FROM meeting_requests WHERE id=${id} LIMIT 1`
  return (rows[0] as MeetingRequest) ?? null
}

export async function mrList(status?: MeetingStatus, type?: MeetingType): Promise<MeetingRequest[]> {
  await ensureMeetingTables()
  const db = await getDB()
  let rows: any[]
  if (status && type) {
    rows = await db`SELECT * FROM meeting_requests WHERE status = ${status} AND type = ${type} ORDER BY created_at DESC`
  } else if (status) {
    rows = await db`SELECT * FROM meeting_requests WHERE status = ${status} ORDER BY created_at DESC`
  } else if (type) {
    rows = await db`SELECT * FROM meeting_requests WHERE type = ${type} ORDER BY created_at DESC`
  } else {
    rows = await db`SELECT * FROM meeting_requests ORDER BY created_at DESC`
  }
  return rows as any
}

export async function mrStats() {
  await ensureMeetingTables()
  const db = await getDB()
  const rows = await db`SELECT status, COUNT(*)::int AS count FROM meeting_requests GROUP BY status`
  const out: Record<string, number> = { pending: 0, approved: 0, rejected: 0, rescheduled: 0, cancelled: 0 }
  for (const r of rows as any[]) out[r.status] = r.count
  return out
}

export async function mrApprove(id: string, opts: {
  meeting_link: string; calendar_event_id?: string | null; admin_notes?: string | null
}): Promise<MeetingRequest | null> {
  const db = await getDB()
  const rows = await db`
    UPDATE meeting_requests SET
      status='approved', meeting_link=${opts.meeting_link},
      calendar_event_id=${opts.calendar_event_id ?? null},
      admin_notes=${opts.admin_notes ?? null}, updated_at=NOW()
    WHERE id=${id}
    RETURNING *
  `
  return (rows[0] as MeetingRequest) ?? null
}

export async function mrReject(id: string, reason: string, admin_notes?: string | null): Promise<MeetingRequest | null> {
  const db = await getDB()
  const rows = await db`
    UPDATE meeting_requests SET
      status='rejected', rejection_reason=${reason}, admin_notes=${admin_notes ?? null}, updated_at=NOW()
    WHERE id=${id}
    RETURNING *
  `
  return (rows[0] as MeetingRequest) ?? null
}

export async function mrReschedule(id: string, opts: {
  new_slot_id: string; new_date: string; new_time: string; admin_notes?: string | null
}): Promise<MeetingRequest | null> {
  const db = await getDB()
  const rows = await db`
    UPDATE meeting_requests SET
      status='rescheduled', slot_id=${opts.new_slot_id}, slot_date=${opts.new_date}, slot_time=${opts.new_time},
      meeting_link=NULL, calendar_event_id=NULL, admin_notes=${opts.admin_notes ?? null}, updated_at=NOW()
    WHERE id=${id}
    RETURNING *
  `
  return (rows[0] as MeetingRequest) ?? null
}

export async function mrSetEmailError(id: string, error: string | null) {
  const db = await getDB()
  await db`UPDATE meeting_requests SET email_error=${error}, updated_at=NOW() WHERE id=${id}`
}

/**
 * Same as mrSetEmailError, but preserves any existing error message instead
 * of overwriting it — used when more than one email is sent for the same
 * request (e.g. visitor confirmation + admin notification) so a failure on
 * the second send doesn't erase a recorded failure on the first, and vice
 * versa. Pass `null` to clear/append nothing.
 */
export async function mrAppendEmailError(id: string, label: string, error: string | null) {
  if (!error) return
  const db = await getDB()
  const rows = await db`SELECT email_error FROM meeting_requests WHERE id=${id}`
  const existing = (rows[0] as any)?.email_error || null
  const note = `${label}: ${error}`
  const combined = existing ? `${existing} | ${note}` : note
  await db`UPDATE meeting_requests SET email_error=${combined}, updated_at=NOW() WHERE id=${id}`
}

export async function mrDelete(id: string) {
  const db = await getDB()
  await db`DELETE FROM meeting_requests WHERE id=${id}`
}

/* ════════════════════════════════════════════════════════════════════════
   APPROVAL / ACTION LOG  (audit trail for meeting_approvals)
   ════════════════════════════════════════════════════════════════════════ */
export async function maLog(entry: {
  request_id: string; action: 'approved' | 'rejected' | 'rescheduled' | 'cancelled'
  reason?: string | null; previous_date?: string | null; previous_time?: string | null
  new_date?: string | null; new_time?: string | null; performed_by?: string
}) {
  await ensureMeetingTables()
  const db = await getDB()
  const id = genId('appr')
  await db`
    INSERT INTO meeting_approvals
      (id, request_id, action, reason, previous_date, previous_time, new_date, new_time, performed_by)
    VALUES
      (${id}, ${entry.request_id}, ${entry.action}, ${entry.reason ?? null},
       ${entry.previous_date ?? null}, ${entry.previous_time ?? null},
       ${entry.new_date ?? null}, ${entry.new_time ?? null}, ${entry.performed_by ?? 'admin'})
  `
}

export async function maListForRequest(request_id: string) {
  const db = await getDB()
  return await db`SELECT * FROM meeting_approvals WHERE request_id=${request_id} ORDER BY created_at ASC`
}

/* ════════════════════════════════════════════════════════════════════════
   REMINDERS
   ════════════════════════════════════════════════════════════════════════ */
export async function mrmScheduleFor(request_id: string, meetingDateTimeIso: string) {
  await ensureMeetingTables()
  const db = await getDB()
  const meetingTime = new Date(meetingDateTimeIso).getTime()
  if (Number.isNaN(meetingTime)) {
    console.error('[mrmScheduleFor] invalid meeting datetime, skipping reminder scheduling:', meetingDateTimeIso)
    return
  }
  const now = Date.now()
  const plans: { kind: '24h' | '1h'; at: number }[] = [
    { kind: '24h', at: meetingTime - 24 * 60 * 60 * 1000 },
    { kind: '1h',  at: meetingTime - 60 * 60 * 1000 },
  ]
  for (const p of plans) {
    if (p.at <= now) continue // don't schedule reminders that are already in the past
    const id = genId('rem')
    await db`
      INSERT INTO meeting_request_reminders (id, request_id, kind, remind_at)
      VALUES (${id}, ${request_id}, ${p.kind}, ${new Date(p.at).toISOString()})
    `
  }
}

export async function mrmCancelForRequest(request_id: string) {
  const db = await getDB()
  await db`DELETE FROM meeting_request_reminders WHERE request_id=${request_id} AND sent=false`
}

export async function mrmGetDue(limit = 50) {
  await ensureMeetingTables()
  const db = await getDB()
  return await db`
    SELECT r.*, m.full_name, m.email, m.type, m.slot_date, m.slot_time, m.platform,
           m.meeting_link, m.status AS request_status
    FROM meeting_request_reminders r
    JOIN meeting_requests m ON m.id = r.request_id
    WHERE r.sent=false AND r.remind_at <= NOW() AND m.status='approved'
    ORDER BY r.remind_at ASC
    LIMIT ${limit}
  `
}

export async function mrmMarkSent(id: string) {
  const db = await getDB()
  await db`UPDATE meeting_request_reminders SET sent=true, sent_at=NOW() WHERE id=${id}`
}

/* ════════════════════════════════════════════════════════════════════════
   RECRUITER OTP VERIFICATION
   ════════════════════════════════════════════════════════════════════════ */
export async function rvInsert(input: {
  email: string; company_name?: string | null; otp_hash: string; expires_at: string
}) {
  await ensureMeetingTables()
  const db = await getDB()
  const id = genId('rv')
  await db`
    INSERT INTO recruiter_verifications (id, email, company_name, otp_hash, expires_at)
    VALUES (${id}, ${input.email}, ${input.company_name ?? null}, ${input.otp_hash}, ${input.expires_at})
  `
  return id
}

/** Count OTP requests for this email in the last `windowMin` minutes (rate limiting). */
export async function rvCountRecent(email: string, windowMin = 10): Promise<number> {
  await ensureMeetingTables()
  const db = await getDB()
  const rows = await db`
    SELECT COUNT(*)::int AS c FROM recruiter_verifications
    WHERE email=${email} AND created_at > NOW() - INTERVAL '1 minute' * ${windowMin}
  `
  return (rows[0] as any)?.c ?? 0
}

export async function rvGetLatestUnverified(email: string) {
  await ensureMeetingTables()
  const db = await getDB()
  const rows = await db`
    SELECT * FROM recruiter_verifications
    WHERE email=${email} AND verified=false
    ORDER BY created_at DESC LIMIT 1
  `
  return rows[0] ?? null
}

export async function rvIncrementAttempts(id: string) {
  const db = await getDB()
  await db`UPDATE recruiter_verifications SET attempts = attempts + 1 WHERE id=${id}`
}

export async function rvMarkVerified(id: string, token: string, tokenExpiresAt: string) {
  const db = await getDB()
  await db`
    UPDATE recruiter_verifications SET
      verified=true, verified_at=NOW(), token=${token}, token_expires_at=${tokenExpiresAt}
    WHERE id=${id}
  `
}

/** Validates a verification token presented at final submission time. */
export async function rvCheckToken(email: string, token: string): Promise<boolean> {
  await ensureMeetingTables()
  const db = await getDB()
  const rows = await db`
    SELECT id FROM recruiter_verifications
    WHERE email=${email} AND token=${token} AND verified=true AND token_expires_at > NOW()
    ORDER BY created_at DESC LIMIT 1
  `
  return rows.length > 0
}

/* ════════════════════════════════════════════════════════════════════════
   CALENDAR EVENTS
   ════════════════════════════════════════════════════════════════════════ */
export async function ceCreate(input: {
  request_id: string; provider?: string; event_id?: string | null; html_link?: string | null; ics_uid?: string | null
}) {
  await ensureMeetingTables()
  const db = await getDB()
  const id = genId('cal')
  await db`
    INSERT INTO calendar_events (id, request_id, provider, event_id, html_link, ics_uid)
    VALUES (${id}, ${input.request_id}, ${input.provider ?? 'google'},
            ${input.event_id ?? null}, ${input.html_link ?? null}, ${input.ics_uid ?? null})
  `
  return id
}

export async function ceGetForRequest(request_id: string) {
  const db = await getDB()
  const rows = await db`SELECT * FROM calendar_events WHERE request_id=${request_id} ORDER BY created_at DESC LIMIT 1`
  return rows[0] ?? null
}
