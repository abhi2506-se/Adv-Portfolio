# Live Chat Fix (v40) — Same phone number now always continues the same chat thread

## The bug
A phone number only auto-resumed a **still-open** chat. If the previous
conversation with that number had already been ended (closed), the visitor
typing the same number in again silently started a brand-new chat instead —
so the admin saw two separate threads for the same person.

## The fix
A phone number is now treated as a permanent identity for one continuous
conversation:
- `getReturningUserInfo` (in `lib/live-chat-db.ts`) no longer filters phone
  matches down to "still open" — it always returns that number's single
  most recent chat, whatever its status.
- If that chat had been closed, the `start` action now **reopens** it
  (new `reopenChat()`: status flips back to active/pending, the "ended"
  flags/reason are cleared) before appending the visitor's new message —
  so it shows back up as a live conversation in the admin's Active list
  within moments, with the admin notified by push.
- All of the prior history stays exactly where it was — reopening never
  touches or deletes any existing message.
- Matching is also more forgiving of formatting now: `+91 98765 43210`,
  `9876543210`, and `919876543210` are all recognized as the same number
  (exact match first, then a last-10-digits fallback) so small typing
  differences between visits don't break the continuity.

Device-cookie-only matching (no phone given) is unchanged — that still only
auto-resumes a chat that's still open, same as before, since a device
cookie alone is a weaker identity signal than a phone number.

No DB migration or env changes needed.
