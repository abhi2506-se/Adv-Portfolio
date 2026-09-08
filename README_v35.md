# Portfolio v35 — Complete Feature Update

## What's New vs v34

### A. Email System (Fully Fixed)

**Meeting Request Flow:**
- User submits form → DB saved → Admin email sent immediately → User acknowledgment sent
- All emails use Resend with graceful failure (request never fails just because email failed)

**Approval Email:**
- Sent to user when admin approves booking
- Includes: meeting title, date, time, platform (Google Meet / Zoom / Teams), join link, calendar details

**Rejection Email:**
- Sent to user when admin rejects booking
- Includes rejection reason

**Test Email Button:**
- Added to Admin → Settings → Email section
- Shows full diagnostics (API key status, from email, admin email)
- Instant verification without needing a real booking

**Setup required:**
```
RESEND_API_KEY=re_xxxxxxxxxxxx
ADMIN_EMAIL=your@email.com
RESEND_FROM_EMAIL=Your Name <noreply@yourdomain.com>
```

---

### B. Reminder System (30-min Before Meeting)

**Database:** `meeting_reminders` table with full status tracking

**Auto-scheduling:** Reminder is scheduled automatically when admin approves a booking

**Cron job:** `GET /api/cron/reminders` — processes all due reminders

**Vercel Cron:** `vercel.json` configured to run every minute

**Features:**
- Prevents duplicate reminders per booking
- Retries failed sends (up to 3 attempts)
- Logs sent/failed/pending status
- Handles timezone correctly (uses meeting's stored timezone)
- Supports Google Meet, Zoom, Teams, Jitsi

**Admin Dashboard → Reminder Status:**
- View all scheduled/sent/failed reminders
- Manual trigger button ("Trigger Now")
- Setup instructions for non-Vercel hosts

---

### C. Blog Dates (Fully Fixed)

**API (`/api/portfolio-blogs`):**
- `created_at` and `updated_at` columns added via safe `ALTER TABLE IF NOT EXISTS`
- Returns `formatted_created`, `formatted_updated`, `display_date` fields
- Format: `"June 8, 2026 • 5:45 PM"`

**Frontend (`components/blog.tsx`):**
- Shows human-readable publish date
- Shows "Updated" timestamp if article was edited after creation

**Admin Dashboard → Blog & Articles:**
- Shows `📅 Published` and `✏️ Updated` timestamps per post

---

### D. Project Media Management System

**New API routes:**
- `GET/POST/PATCH/DELETE /api/admin/project-media` — full CRUD
- `GET /api/admin/project-media?projectId=xxx` — per-project media
- `POST /api/blob-upload` — uploads to Vercel Blob storage

**New DB table:** `project_media`
- Fields: `id`, `project_id`, `media_type`, `media_url`, `thumbnail_url`, `title`, `description`, `display_order`, `uploaded_at`

**Admin → Project Media:**
- Browse all projects → click to manage media
- Drag & drop uploader (images, GIFs, videos)
- Multiple file upload at once
- Progress indicator
- Drag-to-reorder (Framer Motion Reorder)
- Edit title/description per item
- Delete with confirmation
- Preview modal (lightbox)

**Frontend component (`components/project-media-showcase.tsx`):**
- Hero carousel with smooth transitions
- Thumbnail strip
- Full lightbox with keyboard navigation (←/→/Esc)
- Right-click disabled on media
- `controlsList="nodownload"` on videos
- Mobile optimized

**Blob storage setup:**
```
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxx
```

---

### E. Chatbot Abuse Detection

**New DB table:** `chatbot_abuse`
- Fields: `id`, `fingerprint`, `ip_address`, `abuse_count`, `blocked`, `warn_shown`, `last_abuse_at`, `blocked_at`

**Detection patterns:** Profanity, threats, directed abuse

**Two-strike system:**
1. First offense → warning message shown once (stored, not re-shown on refresh)
2. Second offense → user blocked (persists across refreshes via fingerprint + IP)

**Blocked message:**
> "🚫 Your access to this chatbot has been restricted due to repeated violations..."

**Warning message:**
> "⚠️ Warning: Please maintain respectful communication. Continued abuse will result in access restriction."

**Admin → Blocked Users:**
- View all abuse records with filter (All / Blocked)
- See fingerprint, IP, abuse count, timestamps
- One-click Unblock button
- Auto-refreshes

---

### F. Portfolio Knowledge Engine

**Enhanced AI context building (`app/api/ai/route.ts`):**
- Extracts and structures: education (degree, institution, CGPA), experience, skills, projects, certifications
- Builds a structured `=== COMPLETE KNOWLEDGE BASE ===` section injected into system prompt
- Intent detection expanded: `education`, `skills`, `experience` intents
- Portfolio data is always prioritized before generic AI responses

**Questions now answered accurately:**
- "What's your graduation year?" → exact data from DB
- "What's your CGPA?" → exact data
- "What university did you attend?" → exact data
- "What skills do you have?" → full categorized skills list
- "Tell me about your projects" → project details from DB

---

### G. Admin Dashboard Enhancements

**Overview section:**
- Live auto-updating clock (date + time, updates every second)
- Timezone-aware display

**Meetings section:**
- Summary cards: Pending / Approved / Rejected counts
- Improved filter tab labels with emoji

**New nav items:**
- `Bell` → Reminder Status
- `Image` → Project Media
- `Ban` → Blocked Users

---

## Database Safety

All new tables use `CREATE TABLE IF NOT EXISTS` — no existing data is ever touched.

All schema migrations use `ALTER TABLE … ADD COLUMN IF NOT EXISTS` — safe to run on existing databases.

---

## New Files

| File | Purpose |
|------|---------|
| `app/api/cron/reminders/route.ts` | Reminder cron job |
| `app/api/admin/project-media/route.ts` | Project media CRUD |
| `app/api/admin/chatbot-abuse/route.ts` | Abuse management |
| `app/api/admin/test-email/route.ts` | Email diagnostic test |
| `app/api/blob-upload/route.ts` | File upload to Vercel Blob |
| `app/api/reminders/route.ts` | Reminder status for admin |
| `components/project-media-manager.tsx` | Admin media manager UI |
| `components/project-media-showcase.tsx` | Public carousel/lightbox |
| `vercel.json` | Cron schedule (every minute) |

---

## Environment Variables Required

```env
# Email (required for all email features)
RESEND_API_KEY=re_xxxxxxxxxxxx
ADMIN_EMAIL=your@email.com
RESEND_FROM_EMAIL=Your Name <noreply@yourdomain.com>

# File uploads (required for project media)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx

# Cron security (optional but recommended)
CRON_SECRET=your-random-secret-here

# Database (existing)
DATABASE_URL=postgresql://...

# AI (existing)
ANTHROPIC_API_KEY=sk-ant-...
```
