# Live Chat Update (v38) — Voice notes, reactions, GIFs/stickers, context menu, AI hybrid chat

## New environment variables (all optional — features degrade gracefully without them)

| Variable | Used for | If missing |
|---|---|---|
| `ANTHROPIC_API_KEY` | AI auto-responder while you're offline | AI simply doesn't reply; visitor's message is still saved and the "leave a message" banner still shows |
| `GIPHY_API_KEY` | GIF search tab | Falls back to Giphy's public demo key (fine for light use — get your own free key at developers.giphy.com for real traffic) |

No DB migration step needed — `ensureLiveChatSchema()` auto-adds every new column/table on first run.

## 1. Voice notes (WhatsApp-style)
- Tap the mic icon in either chat panel to record. While recording you get
  a live waveform (real mic amplitude via Web Audio's AnalyserNode), a
  timer, a trash icon to cancel, and a stop button.
- Stopping moves to a **preview** step — play it back, discard, or send.
- Sent voice notes render as a proper player bubble: play/pause, a
  deterministic waveform, a **1x / 1.5x / 2x speed** toggle, and elapsed
  time — on both the visitor's and admin's side.
- Voice notes reuse the existing media pipeline (`/api/live-chat/media-upload`,
  now also accepting `audio/*`) but are **not** view-once like photos/videos —
  they play freely, any number of times, like a normal message.

## 2. Emoji picker, GIFs, stickers, reactions
- New 😊 button next to the composer opens a 3-tab picker: **Emoji** (a
  curated categorized grid), **GIF** (search via Giphy, server-proxied so no
  key ships to the browser), **Stickers** (a bundled set of large expressive
  emoji combos — sending one renders "naked" full-size, reusing the emoji
  bubble style from the last update).
- **Reactions**: ❤️ 😂 👍 🔥 😮 😢 — available from the long-press/right-click
  menu's quick-react row. Tapping the same one again removes it. Shows as a
  small pill hanging off the bottom of the bubble, visible to both sides.

## 3. Long-press / right-click context menu
Holding a message ~450ms on mobile, or right-clicking on desktop, opens a
menu with: **Reply, Copy, Forward, Star/Unstar, Delete** (Delete only shows
within the existing 15s unsend window, same rule as before), plus the quick
reaction row at the top.
- **Forward** (admin only — visitors only have the one conversation, so
  there's nowhere for them to forward into) opens a picker of your other
  active chats and drops a copy of that message in, tagged "Forwarded".
- **Star** is per-side (your star doesn't show as starred for the other
  person) and shows a small ⭐ on the bubble.

## 4. Voice + text offline fallback
- A single global "is Abhishek online" flag (`/api/live-chat/admin-status`),
  kept alive by a heartbeat from the admin dashboard while it's open.
- When you're not online, visitors see: **"🔴 Abhishek is currently
  unavailable — leave a message (text or voice note) and he'll get back to
  you."** They can still send anything as normal — text, voice notes, media —
  it's all saved exactly as before.

## 5. AI + You — hybrid chat with handoff
- While you're offline, every text message from a visitor automatically
  gets an AI reply (via the Anthropic API), clearly labeled **"🤖 AI
  Assistant (for Abhishek)"** above the bubble so it's never mistaken for you.
- The AI is a normal, professional, helpful stand-in — it answers questions
  about your work, is upfront that it's an AI, and firmly does **not** adopt
  sexual/romantic personas or content under any name or framing, regardless
  of how a visitor asks — it stays on the "how can I help" track and redirects
  instead.
- The instant you come back online (admin dashboard heartbeat) or send a
  reply yourself, every AI-active conversation gets an automatic system
  message: **"Abhishek just joined the conversation. I'll let him take over
  from here. 🙂"** — shown as a centered system pill in the chat, exactly
  like a WhatsApp system notice.
- Everything — the visitor's messages, the AI's replies, and the handoff
  notice — are ordinary rows in the same `live_chat_messages` table, so the
  full transcript is automatically saved and you can open the chat in the
  admin panel and see the entire AI conversation instantly, with nothing
  to export or configure.

## Files added
- `lib/live-chat-ai.ts` — AI responder (Anthropic API call + safety-scoped system prompt)
- `app/api/live-chat/admin-status/route.ts` — online heartbeat + AI→human handoff trigger
- `app/api/live-chat/gif-search/route.ts` — server-side Giphy proxy
- `components/live-chat/voice-recorder.tsx`
- `components/live-chat/emoji-picker.tsx`
- `components/live-chat/forward-picker.tsx`

## Files substantially extended
- `lib/live-chat-db.ts` — new columns (reactions, stars, duration, ai_active, admin status table), `toggleReaction`, `toggleStar`, `forwardMessage`, `adminHeartbeat`/`getAdminOnlineStatus`/`getAiActiveChats`/`setAiActive`, voice/gif/sticker media handling, un-masked transport for non-view-once media
- `app/api/live-chat/route.ts` — `message`/`admin_reply` now accept audio/gif/sticker + trigger the AI responder or handoff; new `toggle_reaction`/`toggle_star`/`forward_message` actions; user GET now returns `adminOnline`
- `app/api/live-chat/media-upload/route.ts` — accepts audio mime types + `type=audio`
- `components/live-chat/message-bubble.tsx` — voice note player, GIF tile, reaction pills, star badge, AI/system message styles, long-press/right-click context menu
- `components/live-chat/user-chat-panel.tsx` / `admin-chat-panel.tsx` — wired up all of the above (composer row, offline banner, admin heartbeat, forward picker)
