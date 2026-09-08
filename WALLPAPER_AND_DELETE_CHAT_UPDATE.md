# What's new in this update

## 1. Chat wallpaper (both sides, live-synced, permanent per phone number)

- New file **`lib/live-chat-wallpapers.ts`** — the full catalogue: solid
  colors, gradients, and 3 animated "live" wallpapers (Love ❤️, Roses 🌹,
  Celebration 🎉). Each entry auto-derives readable message-bubble colors
  so text always stays legible against the new background.
- **DB** (`lib/live-chat-db.ts`): added `wallpaper_id` (+ metadata) to
  `live_chats`, and a new `live_chat_wallpaper_prefs` table keyed by phone
  number. `setChatWallpaper()` updates the chat *and* saves the
  preference by phone; `applyReturningWallpaper()` restores it the next
  time that phone number starts/resumes a chat, even on a brand-new
  device/browser.
- **API** (`app/api/live-chat/route.ts`): new `set_wallpaper` action
  (either side may call it; broadcasts `wallpaper_changed` over realtime
  so the other side updates instantly), and the returning-visitor
  wallpaper lookup is now wired into the `start` action.
- **UI**: new `components/live-chat/wallpaper-picker.tsx` (grid picker +
  `LiveWallpaperOverlay` for the animated wallpapers, CSS keyframes added
  to `app/globals.css`). Wired into both `user-chat-panel.tsx` (🎨 icon in
  the header) and `admin-chat-panel.tsx` (🎨 in the "More options" menu,
  and next to Saved/Ended chat actions). `message-bubble.tsx` now reads
  its colors from CSS variables set by the active wallpaper, with the
  original violet/blue look as the fallback.
- Anyone (user or admin) can change the wallpaper at any time — the
  "permanent" part just means it's remembered per visitor phone number
  until they pick something else.

## 2. Admin: delete a chat permanently

- **DB**: `deleteChatPermanently()` removes the chat row and every
  attached message, presence, and call-log row.
- **API**: new `admin_delete_chat` action (admin-auth required), which
  broadcasts `chat_deleted` first (so an open user tab reacts instantly)
  then deletes.
- **UI**: a new "Delete Chat" option appears in Active chats' "More
  options" menu, and a "Delete" button next to Saved/Ended chat actions.
  All of them open the new `DeleteChatConfirm` dialog
  (`components/live-chat/reply-preview.tsx`) — an explicit "Are you
  sure?" step before anything is removed. This is irreversible, unlike
  "End Chat" (closes only) or "Hide History" (hides from the user only).

No existing tables, columns, or behavior were removed — everything here
is additive, following the same migration pattern already used
throughout `lib/live-chat-db.ts`.
