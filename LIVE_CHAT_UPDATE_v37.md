# Live Chat Update (v37)

No new env vars or manual DB migration needed — `ensureLiveChatSchema()` in
`lib/live-chat-db.ts` auto-adds the new columns (`IF NOT EXISTS`) the first
time the live-chat API runs after you deploy this build.

## 1. End Chat — instant notice + reason, sudden-close detection, hide/show history

- **Messages are never deleted.** They already weren't in this codebase —
  ending a chat only flips its status to `closed`; every message stays in
  Postgres forever and is always reachable via the Archive.
- **Reason on End Chat**: the confirmation dialog (both sides) now has an
  optional reason field with quick-pick chips ("Query resolved", "Took too
  long", etc.) plus free text. When the *user* ends the chat, the reason is
  sent instantly to the admin:
  - Realtime toast in the admin panel (top-right) if the admin is looking at
    that chat, disappearing after ~8s.
  - The chat's list entry shows an "Ended" tag and the reason as its preview
    line, and stays visible in the admin's Active list for 30 minutes after
    closing (previously it vanished immediately) so the admin has time to see
    it even if they weren't looking.
  - Opening a closed chat shows a red banner with who ended it and why.
  - An admin push notification is also sent (reusing the existing push setup).
- **Sudden close/away detection**: `hooks/use-presence.ts` now uses
  `navigator.sendBeacon` on `pagehide`/`beforeunload`/tab-hide, instead of a
  best-effort `fetch()` that browsers can cancel mid-flight when a tab or app
  is closed. This makes the visitor flip to "Away" on the admin's presence
  badge immediately when they close the site/PC/phone — no reason is shown
  for this case (as requested), since it's a disconnect, not a real "end").
- **Admin: hide previous chat from the user's side.** New buttons in the
  admin chat header:
  - **Hide history** — the visitor's client immediately stops showing
    everything before that moment (still fully intact in the DB/admin view).
    The visitor sees "🔒 Earlier messages in this chat were cleared by Admin".
  - **Unhide** — instantly restores it for the visitor.
  - A small archive icon button also lets the admin **grant full archive
    access to the visitor at any time**, not just in response to a request
    (the existing request/approve flow for visitor-initiated requests still
    works exactly as before).

## 2. WhatsApp-style date separators + naked emoji bubbles

- New shared helper `lib/chat-format.ts`:
  - `formatDateSeparator(ts)` → `"Today" / "Yesterday" / "05 Sep 2026"`.
  - `isEmojiOnlyText(text)` → true for messages that are just 1–8 emoji.
- Both chat panels (user + admin) and both archive viewers now render a
  centered date pill once above the first message of each calendar day,
  and message bubbles only show the time (admin bubbles used to show the
  full date+time on every message — that's now just the time, matching the
  user side).
- `components/live-chat/message-bubble.tsx` — a message that's only emoji
  (no text, no media, not being edited/replied to) renders "naked": large
  (44px) emoji with no bubble background, just a small timestamp/tick under
  it, exactly like WhatsApp. Everything else (text, media, replies, edited
  messages) keeps the normal bubble.

## Files touched
- `lib/live-chat-db.ts` — schema + `endChat(reason)` + hide/show history
- `lib/chat-format.ts` — new shared helpers
- `app/api/live-chat/route.ts` — reason on end_chat, hide_history/unhide_history
  actions, widened admin list query, historyHidden in the user GET response
- `hooks/use-presence.ts` — sendBeacon for instant away-on-close
- `hooks/use-live-chat-realtime.ts` — reason + history_hidden event plumbing
- `components/live-chat/reply-preview.tsx` — reason field in EndChatConfirm
- `components/live-chat/message-bubble.tsx` — DateSeparator + naked emoji
- `components/live-chat/user-chat-panel.tsx` — wiring for all of the above
- `components/live-chat/admin-chat-panel.tsx` — wiring for all of the above
