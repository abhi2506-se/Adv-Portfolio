/**
 * lib/ics.ts — generates a standard .ics calendar invite.
 *
 * The .ics format is supported by Google Calendar, Outlook, Apple Calendar
 * and virtually every other calendar app. Attaching it to the confirmation
 * email gives the attendee a one-click "Add to Calendar" experience.
 *
 * We also expose buildGoogleCalendarUrl() so the email can include a
 * direct "Add to Google Calendar" button — this is the most reliable way
 * to ensure the event actually lands in the user's calendar even if their
 * mail client doesn't auto-process .ics attachments (common on mobile).
 */

function pad(n: number): string { return String(n).padStart(2, '0') }

function toUtcStamp(d: Date): string {
  return (
    d.getUTCFullYear().toString() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
    'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'
  )
}

// Google Calendar uses a slightly different compact format (no dashes/colons)
function toGCalStamp(d: Date): string {
  return (
    d.getUTCFullYear().toString() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
    'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'
  )
}

function escapeIcs(text: string): string {
  return (text || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export interface IcsOpts {
  uid: string
  title: string
  description: string
  startIso: string     // ISO datetime — converted to UTC internally
  durationMinutes: number
  location: string      // meeting link URL
  organizerEmail: string
  organizerName?: string
  attendeeEmail: string
  attendeeName?: string
}

export function buildIcs(opts: IcsOpts): string {
  const start = new Date(opts.startIso)
  const end   = new Date(start.getTime() + opts.durationMinutes * 60_000)
  const now   = new Date()

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Portfolio Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${toUtcStamp(now)}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${escapeIcs(opts.title)}`,
    `DESCRIPTION:${escapeIcs(opts.description)}`,
    `LOCATION:${escapeIcs(opts.location)}`,
    `ORGANIZER;CN=${escapeIcs(opts.organizerName || 'Organizer')}:mailto:${opts.organizerEmail}`,
    `ATTENDEE;CN=${escapeIcs(opts.attendeeName || 'Attendee')};RSVP=TRUE:mailto:${opts.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n')
}

/**
 * Returns the raw .ics string as a Buffer — the correct format for nodemailer
 * attachments. Previously we were passing a base64 string which nodemailer
 * treated as UTF-8 text and produced a garbled .ics file, causing calendar
 * apps to show "Unable to load event".
 *
 * nodemailer attachment `content` field accepts: string (UTF-8), Buffer, or
 * ReadableStream. Passing a Buffer with `encoding: 'base64'` alongside a
 * base64 string also works, but the simplest correct approach is a plain Buffer.
 */
export function icsBuffer(ics: string): Buffer {
  return Buffer.from(ics, 'utf-8')
}

/** @deprecated Use icsBuffer() for nodemailer attachments */
export function icsBase64(ics: string): string {
  return Buffer.from(ics, 'utf-8').toString('base64')
}

/**
 * Builds a Google Calendar "add event" URL.
 * When the user clicks this link they are taken directly to Google Calendar
 * with all event details pre-filled — they just hit Save.
 * This is the most reliable cross-device way to add an event for Gmail users.
 */
export function buildGoogleCalendarUrl(opts: IcsOpts): string {
  const start = new Date(opts.startIso)
  const end   = new Date(start.getTime() + opts.durationMinutes * 60_000)

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${toGCalStamp(start)}/${toGCalStamp(end)}`,
    details: `${opts.description}\n\nJoin: ${opts.location}`,
    location: opts.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Builds an Outlook Web "add event" URL.
 * Works for Outlook.com and Office 365 users.
 */
export function buildOutlookCalendarUrl(opts: IcsOpts): string {
  const start = new Date(opts.startIso)
  const end   = new Date(start.getTime() + opts.durationMinutes * 60_000)

  const params = new URLSearchParams({
    rru: 'addevent',
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    subject: opts.title,
    body: `${opts.description}\n\nJoin: ${opts.location}`,
    location: opts.location,
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}
