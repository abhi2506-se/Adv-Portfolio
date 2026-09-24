# Live Chat v2 — Setup Guide

Everything is wired into your existing app. Nothing was rebuilt; this is
additive. Do these 3 things before deploying:

## 1. Install the one new dependency
```
npm install
```
(Added `@supabase/supabase-js` to package.json already.)

## 2. Create a free Supabase project (Realtime transport only)
Your data stays in Neon — Supabase is used only for instant delivery of
messages/typing/presence/call signals.

1. https://supabase.com → New Project (free tier).
2. Project Settings → API → copy `Project URL`, `anon public` key, and
   `service_role` key.
3. Project Settings → Realtime → make sure Broadcast is enabled (on by default).
4. Add to your env (Vercel → Settings → Environment Variables, and your local `.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxx
   SUPABASE_SERVICE_ROLE_KEY=xxxx        # server-only, keep secret
   ```
No Supabase tables/SQL needed — Broadcast doesn't require a database.
If you skip this step, the app still works via the existing polling —
messages/calls just won't feel instant.

## 3. Create a free TURN server (for calls to work everywhere)
STUN alone fails behind many NATs/firewalls; TURN is what makes calls
reliable for real visitors.

1. https://dashboard.metered.ca → sign up (free tier: ~50GB/month).
2. Create an "App" (a TURN Server product) — note the App Name + API Key.
3. Add to env:
   ```
   METERED_APP_NAME=your-app-name
   METERED_API_KEY=your-api-key
   ```
Without these, calls fall back to STUN-only (works on same/open networks,
may fail on stricter ones).

## Existing env vars — unchanged
`DATABASE_URL`, `SESSION_SECRET`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_EMAIL`
etc. all still work exactly as before. Nothing about your Neon schema was
removed; only new columns/tables were added (auto-migrates on first request,
same pattern your code already used).

## What changed, file by file
**New files** (safe to review independently):
- `lib/device-id.ts` — signed visitor-ID cookie
- `lib/supabase-realtime.ts` — realtime broadcast helper
- `lib/live-chat-db.ts` — schema + all new query logic
- `app/api/live-chat/presence/route.ts`
- `app/api/live-chat/turn/route.ts`
- `app/api/live-chat/call-log/route.ts`
- `hooks/use-presence.ts`, `hooks/use-live-chat-realtime.ts`, `hooks/use-webrtc-call.ts`
- `components/live-chat/*` (call modal, message bubble, reply preview, presence badge, user panel, admin panel)

**Modified files** (minimal, surgical):
- `app/api/live-chat/route.ts` — extended with new actions, same existing actions still work
- `components/ai-assistant.tsx` — the old inline "active chat" JSX block was replaced with `<UserChatPanel />`; the pre-chat name/email form is untouched
- `app/admin/dashboard/page.tsx` — `LiveChatSection()` now renders `<AdminChatPanel />`; everything else in the 7,000-line file is untouched
- `package.json` — added `@supabase/supabase-js`

## Verified before handoff
- `tsc --noEmit`: 746 errors — identical count to your original, unmodified
  codebase (verified by diffing against a fresh baseline build). Zero new
  type errors introduced.
- `next build`: succeeds end-to-end (all pages + all new API routes compile
  and are correctly registered). The only build hiccup in this sandbox was
  Google Fonts being unreachable from the sandbox network — unrelated to
  these changes and will not occur on Vercel.
- `next lint` (via build): clean.

## Known simplifications (documented, not hidden)
- Calling is 1:1 only (matches your requirement — User ↔ Admin).
- Typing indicator keeps a small in-memory map as a fallback layer; real
  delivery is via Supabase broadcast, so this is not a reliability risk.
- "Continue Chat" eligibility = the visitor had at least one *admin-approved*
  session in their last 3 sessions (per your spec). Adjust
  `CONTINUE_LOOKBACK` / `eligible` logic in `lib/live-chat-db.ts` if you want
  a different rule.
- Auto-cleanup keeps the latest 10 messages once a chat passes that count,
  and is skipped entirely for saved chats — exactly as specified.
