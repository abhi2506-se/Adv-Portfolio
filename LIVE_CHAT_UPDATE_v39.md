# Live Chat Update (v39) — Contact number continuation, 10-min archive approval, Abhishek branding + last seen

No env vars or DB migration needed — `ensureLiveChatSchema()` auto-adds the new `user_phone` column on first run.

## 1. Contact number on chat start
- The "Start Live Chat" form now has an optional **Phone number** field
  under Email.
- If left blank, only the visitor's name is ever shown to the admin (as
  before).
- If filled in, the admin sidebar shows a small 📞 icon next to that
  visitor's name (number itself stays hidden there). Clicking the visitor's
  **name** in the open chat's header reveals the number inline
  (tap again to hide it).
- **Smart continuation**: if a new chat request comes in with a phone number
  that matches one used in that visitor's last 3 sessions (on *any* device
  or browser), it automatically resumes that same conversation — exactly
  like the existing device-cookie "Continue Chat" behavior, just keyed on
  phone number too (checked first, since it's a stronger identity signal
  than a device cookie).

## 2. Archive approval now expires after 10 minutes
- When the admin approves a visitor's request to see their full chat
  archive, that approval is now only valid for **10 minutes**
  (`ARCHIVE_GRANT_TTL_MS` in `lib/live-chat-db.ts`).
- Enforced server-side in `getArchiveStatus` — the grant is lazily cleared
  the moment it's read past the deadline, so there's no separate cleanup
  job needed.
- The visitor sees a live countdown ("🔓 expires in 8m 12s") while it's
  valid, and once it lapses they get a **"Request access again"** prompt
  instead of a silently-broken "granted" state.
- Nothing about the underlying messages is ever affected — this only gates
  the visitor's *view* of their own older history; the admin can always see
  everything, any time, via the Archive button.

## 3. "Abhishek" branding + WhatsApp-style last seen
- The visitor now sees **"Abhishek"** (not "Admin") as the name at the top
  of the chat, in "Abhishek is typing…", in the widget title bar ("Live
  Chat with Abhishek"), and in reply-quote labels.
- `getPresence()` now returns each side's `lastActiveAt` timestamp, and
  `PresenceBadge` shows a proper WhatsApp-style line instead of a flat
  "Offline":
  - **"last seen just now" / "last seen 12 min ago"** for anything under an hour
  - **"last seen today at 3:45 PM"**
  - **"last seen yesterday at 3:45 PM"**
  - **"last seen 03 Sep at 3:45 PM"** for anything older
- This shows for both directions: the visitor sees Abhishek's last seen,
  and the admin sees the visitor's last seen (including a returning
  visitor from a previous session, since it's stored per chat and phone/
  device-matched chats continue the same conversation and presence history).

## Files changed
- `lib/live-chat-db.ts` — `user_phone` column, `getReturningUserInfo` now
  phone-aware, `getPresence` returns `lastActiveAt`, `getArchiveStatus`
  enforces the 10-minute TTL
- `app/api/live-chat/route.ts` — `start` action accepts/stores `userPhone`
  and resumes by phone match first
- `hooks/use-presence.ts` — `PresenceInfo.lastActiveAt` + new `formatLastSeen()` helper
- `components/live-chat/presence-badge.tsx` — shows "last seen …" instead of "Offline"
- `components/live-chat/admin-chat-panel.tsx` — click-to-reveal phone number, 📞 list icon, 10-min notes on archive approval
- `components/live-chat/user-chat-panel.tsx` — "Abhishek" branding, archive expiry countdown + re-request prompt
- `components/live-chat/message-bubble.tsx`, `reply-preview.tsx` — "Abhishek" label in reply quotes
- `components/ai-assistant.tsx` — phone number field on the start-chat form, "Abhishek" in the widget title
