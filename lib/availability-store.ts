/**
 * lib/availability-store.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Dynamic, Calendly-style availability engine.
 *
 * Replaces the old model (admin pre-creates one row per bookable slot in
 * `meeting_slots`) with the model the spec actually asks for:
 *
 *   1. Admin sets AVAILABILITY WINDOWS only — arbitrary open/close ranges
 *      per day of week, as many per day as needed
 *      (e.g. Mon: 08:00–10:00, 13:00–14:00, 20:00–23:00).
 *   2. A visitor picks a DURATION (15/30/45/60 min) and a DATE.
 *   3. Bookable start times are *computed on the fly* for that exact
 *      (date, duration) pair from:
 *        admin windows  →  minus already-booked ranges (+ buffer)  →  minus
 *        a duration-sized step that would run past the window's end.
 *
 * Storage is intentionally split exactly as the spec requires:
 *   - `availability_windows`  — admin-configured open hours (source of truth
 *     for "when am I willing to take a meeting"), decoupled from bookings.
 *   - `meeting_slots` / `meeting_requests` (existing tables, untouched
 *     schema) — still hold the actual booked rows. A `meeting_slots` row is
 *     now created lazily, at the moment of booking, from the dynamically
 *     computed slot the visitor picked — every downstream feature that
 *     already keys off `slot_id` (reschedule, reminders, calendar invites,
 *     approve/reject audit log) keeps working unmodified.
 *
 * Buffer: a single global "minutes of rest after every meeting" setting,
 * configurable by the admin (default 10), stored in `scheduler_settings`.
 * It is applied uniformly after every booked meeting when computing what's
 * still free — nothing else needs to know about it.
 */
import { getDB } from './db'

export interface AvailabilityWindow {
  id: string
  day_of_week: number      // 0=Sun … 6=Sat
  start_time: string       // "08:00"
  end_time: string         // "10:00"
  is_active: boolean
  created_at: string
}

export interface SchedulerSettings {
  buffer_minutes: number
  timezone: string         // the timezone the admin's windows are defined in
  min_notice_minutes: number // how soon someone can book (avoids "book 1 min from now")
}

let _ready = false

export async function ensureAvailabilityTables() {
  if (_ready) return
  const db = await getDB()

  await db`
    CREATE TABLE IF NOT EXISTS availability_windows (
      id           TEXT PRIMARY KEY,
      day_of_week  INTEGER NOT NULL,
      start_time   TEXT NOT NULL,
      end_time     TEXT NOT NULL,
      is_active    BOOLEAN NOT NULL DEFAULT true,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  await db`
    CREATE TABLE IF NOT EXISTS scheduler_settings (
      id                  TEXT PRIMARY KEY DEFAULT 'main',
      buffer_minutes      INTEGER NOT NULL DEFAULT 10,
      timezone            TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      min_notice_minutes  INTEGER NOT NULL DEFAULT 60,
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `
  try { await db`CREATE INDEX IF NOT EXISTS idx_aw_day ON availability_windows(day_of_week)` } catch {}

  /* Seed defaults once, on first run only */
  const existingSettings = await db`SELECT id FROM scheduler_settings WHERE id='main'`
  if (existingSettings.length === 0) {
    await db`
      INSERT INTO scheduler_settings (id, buffer_minutes, timezone, min_notice_minutes)
      VALUES ('main', 10, 'Asia/Kolkata', 60)
      ON CONFLICT DO NOTHING
    `
  }
  const existingWindows = await db`SELECT id FROM availability_windows LIMIT 1`
  if (existingWindows.length === 0) {
    // Sensible default: Mon–Fri, one window 09:00–18:00 — admin can change freely.
    for (const day of [1, 2, 3, 4, 5]) {
      const id = `aw_${day}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      await db`
        INSERT INTO availability_windows (id, day_of_week, start_time, end_time, is_active)
        VALUES (${id}, ${day}, '09:00', '18:00', true)
      `
    }
  }

  _ready = true
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/* ════════════════════════════════════════════════════════════════════════
   SETTINGS  (global buffer + scheduling timezone + minimum notice)
   ════════════════════════════════════════════════════════════════════════ */
export async function getSchedulerSettings(): Promise<SchedulerSettings> {
  await ensureAvailabilityTables()
  const db = await getDB()
  const rows = await db`SELECT * FROM scheduler_settings WHERE id='main' LIMIT 1`
  const r = rows[0] as any
  return {
    buffer_minutes: Number(r?.buffer_minutes ?? 10),
    timezone: r?.timezone ?? 'Asia/Kolkata',
    min_notice_minutes: Number(r?.min_notice_minutes ?? 60),
  }
}

export async function updateSchedulerSettings(input: Partial<SchedulerSettings>) {
  await ensureAvailabilityTables()
  const db = await getDB()
  const current = await getSchedulerSettings()
  const next = { ...current, ...input }
  await db`
    UPDATE scheduler_settings SET
      buffer_minutes = ${next.buffer_minutes},
      timezone = ${next.timezone},
      min_notice_minutes = ${next.min_notice_minutes},
      updated_at = NOW()
    WHERE id='main'
  `
  return next
}

/* ════════════════════════════════════════════════════════════════════════
   AVAILABILITY WINDOWS  (admin config — CRUD)
   ════════════════════════════════════════════════════════════════════════ */
export async function awGetAll(): Promise<AvailabilityWindow[]> {
  await ensureAvailabilityTables()
  const db = await getDB()
  return (await db`
    SELECT * FROM availability_windows ORDER BY day_of_week ASC, start_time ASC
  `) as any
}

export async function awGetActiveForDay(day_of_week: number): Promise<AvailabilityWindow[]> {
  await ensureAvailabilityTables()
  const db = await getDB()
  return (await db`
    SELECT * FROM availability_windows
    WHERE day_of_week=${day_of_week} AND is_active=true
    ORDER BY start_time ASC
  `) as any
}

/** Replaces ALL windows with the given list (full save from the admin UI). */
export async function awReplaceAll(windows: {
  day_of_week: number; start_time: string; end_time: string; is_active?: boolean
}[]): Promise<AvailabilityWindow[]> {
  await ensureAvailabilityTables()
  const db = await getDB()
  await db`DELETE FROM availability_windows`
  for (const w of windows) {
    if (w.end_time <= w.start_time) continue // skip invalid ranges defensively
    const id = genId('aw')
    await db`
      INSERT INTO availability_windows (id, day_of_week, start_time, end_time, is_active)
      VALUES (${id}, ${w.day_of_week}, ${w.start_time}, ${w.end_time}, ${w.is_active ?? true})
    `
  }
  return awGetAll()
}

export async function awCreate(input: {
  day_of_week: number; start_time: string; end_time: string; is_active?: boolean
}): Promise<AvailabilityWindow> {
  await ensureAvailabilityTables()
  const db = await getDB()
  const id = genId('aw')
  const rows = await db`
    INSERT INTO availability_windows (id, day_of_week, start_time, end_time, is_active)
    VALUES (${id}, ${input.day_of_week}, ${input.start_time}, ${input.end_time}, ${input.is_active ?? true})
    RETURNING *
  `
  return rows[0] as AvailabilityWindow
}

export async function awDelete(id: string) {
  await ensureAvailabilityTables()
  const db = await getDB()
  await db`DELETE FROM availability_windows WHERE id=${id}`
}

export async function awUpdate(id: string, input: Partial<{
  day_of_week: number; start_time: string; end_time: string; is_active: boolean
}>): Promise<AvailabilityWindow | null> {
  await ensureAvailabilityTables()
  const db = await getDB()
  const existingRows = await db`SELECT * FROM availability_windows WHERE id=${id}`
  const existing = existingRows[0] as any
  if (!existing) return null
  const merged = { ...existing, ...input }
  const rows = await db`
    UPDATE availability_windows SET
      day_of_week=${merged.day_of_week}, start_time=${merged.start_time},
      end_time=${merged.end_time}, is_active=${merged.is_active}
    WHERE id=${id}
    RETURNING *
  `
  return (rows[0] as AvailabilityWindow) ?? null
}

/* ════════════════════════════════════════════════════════════════════════
   TIME HELPERS
   ════════════════════════════════════════════════════════════════════════ */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
export function minutesToTime(total: number): string {
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** Current date ("YYYY-MM-DD") and time ("HH:MM", 24h) in the given IANA timezone. */
export function nowPartsInTz(tz: string): { dateKey: string; timeKey: string; minutesNow: number } {
  const now = new Date()
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const timeKey = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now)
  return { dateKey, timeKey, minutesNow: timeToMinutes(timeKey) }
}

/** Day-of-week (0=Sun..6=Sat) for a "YYYY-MM-DD" string, independent of server-local TZ quirks. */
function dayOfWeekFor(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  // Use UTC noon to dodge any DST/local-offset edge case shifting the calendar day.
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay()
}

/* ════════════════════════════════════════════════════════════════════════
   BOOKED RANGES  (reads existing meeting_slots/meeting_requests — the
   tables booking already lives in — so nothing else has to change)
   ════════════════════════════════════════════════════════════════════════ */

/** Busy [start,end) minute ranges (already buffer-padded) for one date, across active bookings. */
async function getBusyRangesForDate(dateKey: string, bufferMinutes: number): Promise<{ start: number; end: number }[]> {
  const db = await getDB()
  // meeting_slots rows with status IN ('booked','blocked') represent committed time.
  // (Pending requests also hold a 'booked' slot via msTryBook, so this naturally
  // covers pending + approved — exactly "existing booked meetings" per the spec.)
  let rows: any[] = []
  try {
    rows = await db`
      SELECT start_time, end_time FROM meeting_slots
      WHERE slot_date = ${dateKey} AND status IN ('booked', 'blocked')
    `
  } catch {
    rows = []
  }
  return rows.map(r => ({
    start: timeToMinutes(r.start_time),
    end: timeToMinutes(r.end_time) + bufferMinutes, // reserve duration + buffer after every meeting
  }))
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/* ════════════════════════════════════════════════════════════════════════
   CORE: dynamic slot generation
   ════════════════════════════════════════════════════════════════════════ */
export interface GeneratedSlot {
  start_time: string   // "08:00"
  end_time: string      // "08:45"
  buffer_until: string  // "08:55" — end_time + buffer, informational for the UI
}

/**
 * Computes every bookable start time for `dateKey` at the given duration,
 * directly from admin windows minus busy ranges (already buffer-padded).
 *
 *   Availability: 08:00–10:00, duration 45, buffer 10
 *   → 08:00–08:45 (free until 08:55), 08:55–09:40 (free until 09:50)
 *     [09:50–10:00 isn't enough room for another 45-min meeting, so the
 *      window naturally stops producing slots there]
 */
export async function generateAvailableSlots(
  dateKey: string,
  durationMinutes: number,
): Promise<GeneratedSlot[]> {
  await ensureAvailabilityTables()
  const settings = await getSchedulerSettings()
  const buffer = Math.max(0, settings.buffer_minutes)
  const dow = dayOfWeekFor(dateKey)

  const windows = await awGetActiveForDay(dow)
  if (windows.length === 0) return []

  const busy = await getBusyRangesForDate(dateKey, buffer)

  const { dateKey: todayKey, minutesNow } = nowPartsInTz(settings.timezone)
  const isToday = dateKey === todayKey
  const isPast = dateKey < todayKey
  if (isPast) return []
  const earliestAllowed = isToday ? minutesNow + settings.min_notice_minutes : -Infinity

  const out: GeneratedSlot[] = []

  for (const w of windows) {
    const winStart = timeToMinutes(w.start_time)
    const winEnd = timeToMinutes(w.end_time)
    let cursor = winStart

    while (cursor + durationMinutes <= winEnd) {
      const slotEnd = cursor + durationMinutes
      const slotEndWithBuffer = slotEnd + buffer

      // Skip if this candidate start is before the minimum-notice cutoff (today only).
      if (cursor < earliestAllowed) {
        cursor += 5 // nudge forward in small steps so we don't skip a later still-valid start
        continue
      }

      // Skip if it collides with any existing booked/blocked range (already buffer-padded).
      const collides = busy.some(b => rangesOverlap(cursor, slotEnd, b.start, b.end))
      if (collides) {
        // Jump cursor past the colliding busy range entirely, then continue scanning —
        // this is what keeps slot start times clean (e.g. 08:55, not 08:56, 08:57…)
        // when a meeting earlier in the window pushes everything after it.
        const collidingRange = busy.find(b => rangesOverlap(cursor, slotEnd, b.start, b.end))!
        cursor = Math.max(cursor + 5, collidingRange.end)
        continue
      }

      out.push({
        start_time: minutesToTime(cursor),
        end_time: minutesToTime(slotEnd),
        buffer_until: minutesToTime(slotEndWithBuffer),
      })
      // Step past this meeting AND its buffer before the next slot can start —
      // this is what produces 08:00–08:45 then 08:55–09:40 (45min + 10min buffer),
      // never back-to-back slots with zero breathing room.
      cursor = slotEnd + buffer
    }
  }

  return out
}

/** Convenience: which dates (within a range) have at least one free slot for a given duration. Used to paint the calendar. */
export async function getAvailableDateSummary(
  fromDateKey: string,
  toDateKey: string,
  durationMinutes: number,
): Promise<Record<string, number>> {
  const summary: Record<string, number> = {}
  const start = new Date(`${fromDateKey}T00:00:00Z`)
  const end = new Date(`${toDateKey}T00:00:00Z`)
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0]
    const slots = await generateAvailableSlots(dateKey, durationMinutes)
    if (slots.length > 0) summary[dateKey] = slots.length
  }
  return summary
}
