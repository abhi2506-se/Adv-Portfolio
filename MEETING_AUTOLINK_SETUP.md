# Meeting Link Auto-Generation — Setup Guide

## What was added

| File | Change |
|------|--------|
| `lib/meeting-store.ts` | Added `platform` column (user preference: google_meet / zoom / teams / any). Safe migration — `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. |
| `app/api/meetings/generate-link/route.ts` | **New** — POST endpoint that generates a Google Meet or Zoom link based on the booking's platform preference. |
| `app/api/meetings/[id]/route.ts` | On approval, if no link is pasted, the server calls `/api/meetings/generate-link` automatically. Richer HTML confirmation email sent instantly. |
| `components/meeting-booking-form.tsx` | Platform preference selector (Google Meet / Zoom / MS Teams / Any) added to the booking form. |
| `components/MeetingsAdminSection.tsx` | Drop-in replacement for `MeetingsAdminSection` in the dashboard. Shows platform badge, "Auto-Generate Link" button, and approves without requiring a manual link. |

---

## Environment variables to add to `.env.local`

```env
# ── Google Meet (via Google Calendar API) ──────────────────────────────────
# 1. Go to console.cloud.google.com → create a project
# 2. Enable "Google Calendar API"
# 3. Create a Service Account → download JSON key
# 4. Share your Google Calendar with the service account email

GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GOOGLE_CALENDAR_ID=primary
# (or use a specific calendar ID, e.g. abc123@group.calendar.google.com)

# ── Zoom (Server-to-Server OAuth) ──────────────────────────────────────────
# 1. Go to marketplace.zoom.us → Build App → Server-to-Server OAuth
# 2. Add scopes: meeting:write:meeting, meeting:read:meeting
# 3. Activate the app

ZOOM_ACCOUNT_ID=your_account_id
ZOOM_CLIENT_ID=your_client_id
ZOOM_CLIENT_SECRET=your_client_secret
```

---

## npm package to install

```bash
# For Google Meet support:
npm install googleapis

# (Zoom uses native fetch — no extra package needed)
```

Add to your `package.json`:
```json
{
  "dependencies": {
    "googleapis": "^144.0.0"
  }
}
```

---

## How it works end-to-end

```
User fills booking form
  └─ selects preferred platform (Google Meet / Zoom / Teams / Any)
  └─ submits → POST /api/meetings (saves booking + platform to DB)
  └─ admin gets notified by email

Admin opens dashboard → sees booking with platform badge
  └─ clicks "Approve"
      ├─ clicks "✨ Auto-Generate Link" button
      │   └─ POST /api/meetings/generate-link
      │       ├─ Google Meet: creates Calendar event with conferenceData → returns meet.google.com/xxx link
      │       └─ Zoom: gets OAuth token → creates meeting → returns zoom.us/j/xxx link
      │   └─ Link pre-fills in the input
      └─ clicks "Approve & Send Email"
          └─ PATCH /api/meetings/[id] { action: 'approve', meetingLink: '...' }
              └─ saves link to DB, marks status = 'approved'
              └─ sends rich HTML confirmation email via Resend INSTANTLY
                  ✅ includes date/time, timezone, platform icon, join button
```

---

## Fallback behaviour

If Google/Zoom credentials are **not** configured:
- "Auto-Generate" returns a message: "Could not auto-generate. Please paste one manually."
- Admin can still paste any link and approve normally.
- No functionality is broken — the feature is additive.

---

## Dashboard integration

Replace the existing `MeetingsAdminSection` function in  
`app/admin/dashboard/page.tsx` with the contents of  
`components/MeetingsAdminSection.tsx`.

The component uses the same props, the same `SectionCard`, `Label`, `Input`,
`Textarea`, `Button`, `Loader2`, `CheckCircle`, `Trash2`, `RefreshCw`, `X`,
`Calendar`, `AnimatePresence`, `motion` — all already imported in that file.
