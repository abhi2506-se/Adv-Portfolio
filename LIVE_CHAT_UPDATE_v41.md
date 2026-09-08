# Live Chat v41 — Send modes (View once / View twice / Keep in chat media) + Chat Media gallery

## What's new

**1. A "Send as" picker before every photo/video send**
When either the visitor or Abhishek attaches or captures a photo/video, they
now see a small "Send as" sheet with three choices before it goes out:

- **View once** — disappears after the recipient opens it once.
- **View twice** — disappears after the recipient opens it twice (the old
  default behavior, unchanged).
- **Keep in chat media** — never locks, is visible immediately like a normal
  photo/video, and is permanently saved for both sides.

**2. Shared "Chat Media" gallery**
Both the visitor's chat panel and the admin panel now have a Chat Media
button (next to the wallpaper picker, and in the admin's actions menu) that
opens a gallery with three tabs — **Photos**, **Videos**, **Audio** — showing
everything either side chose to "keep", plus every voice note (which was
already permanent). Tapping a photo/video opens it full-screen; tapping a
voice note plays it inline.

## What changed under the hood

- `live_chat_messages` gained a `media_keep` column. When set, `insertMessage`
  gives that message an effectively unlimited view count and it's excluded
  from the view-once locking logic entirely.
- `maskMediaForTransport` and `viewMedia` now short-circuit for kept media —
  it's never masked in transit and never consumes/locks a view for anyone.
- New `getChatMedia(chatId)` returns every kept photo/video plus every voice
  note in a chat, newest first — this backs the new `GET /api/live-chat?chatId=…&media=1`
  endpoint (same device/admin auth checks as everything else).
- Forwarding a message now carries its `media_keep` flag along with it.
- `MediaComposer` gained a `SendModePicker` step; `PendingMedia` now carries
  a `viewMode: 'once' | 'twice' | 'keep'`.
- `MessageBubble` renders kept media with a new always-visible `KeptMediaTile`
  (small "Kept" badge) instead of the locked view-once tile.
- New shared component: `components/live-chat/chat-media-gallery.tsx`.

Nothing about existing "View twice" messages changes — that remains the
default when the sender doesn't touch the new picker's default option.
