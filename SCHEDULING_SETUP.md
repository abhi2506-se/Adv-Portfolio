# Scheduling System — Setup Guide

> **Note on this doc's history:** an earlier version of this file described a
> `lib/scheduling-store.ts` / `app/api/schedule/*` system as the "new, live"
> system and claimed `lib/meeting-store.ts` had been removed. That was never
> actually true in this codebase — `lib/scheduling-store.ts` and
> `components/schedule-section.tsx` exist but are **not mounted anywhere** on
> the live site. The system that's actually wired into the Hero button and
> the admin dashboard has always been `lib/meeting-store.ts` +
> `app/api/meetings/*` + `components/meeting-scheduler.tsx`. This doc now
> describes **that** system, including the windows-based availability engine
> added on top of it.

## What's live today

| File | Purpose |
|------|---------|
| `lib/meeting-store.ts` | Bookings — `meeting_requests` (one row per request) + `meeting_slots` (one row per booked/blocked time, created either by the admin manually or, now, on demand by the availability engine) |
| `lib/availability-store.ts` | **New.** Admin availability windows (`availability_windows`) + global settings (`scheduler_settings`: buffer, min notice, timezone) + the dynamic slot generator |
| `app/api/meetings/route.ts` | POST (visitor submits a request) + GET (admin list) |
| `app/api/meetings/[id]/route.ts` | PATCH (approve/reject/reschedule) + DELETE |
| `app/api/meetings/availability/route.ts` | **New.** Public GET — dynamically generated bookable slots for a `(date, duration)` pair, or a month summary for painting the calendar |
| `app/api/admin/availability/route.ts` | **New.** Admin GET/PUT — manage availability windows + buffer/notice/timezone settings |
| `app/api/admin/meeting-slots/*` | Legacy/manual slot tooling — still works, now positioned as an "override" path (see below) |
| `components/meeting-scheduler.tsx` | The booking UI — Calendly-style: Duration → Date → Time → Details → Review → Confirmation |
| `components/dashboard/MeetingsAdminSectionV2.tsx` | Admin UI — **Requests**, **Availability** (new, primary), **Manual Slots** (legacy) tabs |
| `components/schedule-modal.tsx`, `components/hero.tsx` | Unchanged — still the entry point that opens `MeetingScheduler` |

`lib/scheduling-store.ts`, `components/schedule-section.tsx`, and
`app/api/schedule/*` remain in the repo but are dead code (nothing imports or
renders them). They're harmless to delete if you want a smaller diff, but
nothing in this guide depends on them.

## 1. How availability now works (the new engine)

Two tables, decoupled exactly as intended:

- **`availability_windows`** — the admin's "open hours." Each row is
  `(day_of_week 0–6, start_time, end_time, is_active)`. Any number of windows
  per day (e.g. `08:00–10:00`, `13:00–14:00`, `20:00–23:00` all on the same
  day) — just add more rows for that day.
- **`scheduler_settings`** — one row: `buffer_minutes` (rest time inserted
  after every meeting), `min_notice_minutes` (how soon someone can book from
  "now"), `timezone` (the timezone the windows above are defined in).

Both auto-create on first use with sensible defaults (Mon–Fri 09:00–18:00,
10-minute buffer, 60-minute notice, `Asia/Kolkata`) — no manual migration
needed, same pattern as the rest of this codebase's tables.

**Bookable slots are never pre-created.** When a visitor picks a date and
duration, `generateAvailableSlots()` computes valid start times live:
windows → minus already-booked ranges (each padded with the buffer) → minus
any step that would run past a window's end or inside the minimum-notice
cutoff for today. Example: window `08:00–10:00`, duration 45 min, buffer 10
min → `08:00–08:45`, then `08:55–09:40` (not `08:55, 08:56, …` — the next
slot only starts once the previous meeting's buffer has cleared).

Only at the moment someone actually submits a booking does a real
`meeting_slots` row get created (`msCreateAndBookDynamic`), with a
race-safety re-check immediately before insert so two people can't win the
same slot. From that point on it's a completely normal row — reschedule,
reminders, calendar invites (.ics, Google Calendar, Outlook links), and the
approve/reject audit log all work exactly as they did before, untouched.

## 2. Admin: setting availability
1. Go to **Admin Dashboard → Meetings & Interviews → Availability** tab.
2. For each day, add one or more windows (`start_time`–`end_time`). Toggle a
   window to "Paused" to keep it defined but temporarily disable it, or
   delete it outright. "Copy to Mon–Fri" duplicates one day's windows across
   the work week.
3. Set the **buffer** (rest time after each meeting), **minimum notice**
   (e.g. don't let someone book starting 2 minutes from now), and the
   **scheduling timezone** (the timezone your start/end times above are in).
4. Save — takes effect immediately; the very next slot request reflects it.

The old **Manual Slots** tab is still there for one-off overrides (blocking
a specific time, hand-creating a slot outside your normal windows) but isn't
needed for day-to-day use anymore.

## 3. Visitor booking flow
1. Visitor clicks **Schedule Meeting / Interview** (hero).
2. **Step 1 — Duration**: 15 / 30 / 45 / 60 minutes.
3. **Step 2 — Date**: a month calendar; days with any room are highlighted
   (computed via the `summary=1` endpoint so the whole month loads in one
   request instead of one per day).
4. **Step 3 — Time**: the dynamically generated slots for that exact date +
   duration, plus a line showing exactly when the meeting ends and the
   buffer-padded time the next slot can start. Platform choice (Meet/Zoom/
   Teams) is also made here.
5. **Step 4 — Details**: Recruiter/Interview (official-domain email + OTP
   verification, company, role) or Freelance/Consultation (email, project
   details) — same validation as before.
6. **Step 5 — Review**: every field including start/end time, buffer, the
   visitor's own detected timezone, and duration, before final submit.
7. **Step 6 — Confirmation**: pending-review state; visitor gets an email,
   admin gets a push notification + email.
8. Admin approves in the dashboard → meeting link auto-generated → visitor
   emailed the link, calendar invite, and (if they supplied a different
   timezone than the admin's scheduling timezone) their own local time for
   the meeting alongside the admin-timezone time.

## 4. Timezone conversion
The visitor's browser timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`)
is auto-detected and sent along with the booking. Both the initial
confirmation email and the later approval email show the meeting time
converted into that timezone (computed from the same UTC instant, so it's
correct across any DST difference), alongside the time in the admin's
configured scheduling timezone.

## 5. Environment variables
Unchanged — see `.env.scheduling.example`. The new availability tables use
the same `getDB()` connection as everything else; no new env vars required.

## 6. Backward compatibility notes
- Existing `meeting_slots` rows created by the old manual/bulk-generate tool
  keep working exactly as before — the dynamic engine and the manual tool
  both write to the same table, so a manually blocked slot is correctly
  excluded from dynamically generated availability too.
- `POST /api/meetings` accepts **either** the legacy `{ slot_id }` shape
  *or* the new `{ slot_date, start_time, duration_minutes }` shape — nothing
  that already calls this endpoint with a `slot_id` breaks.
