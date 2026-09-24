/**
 * lib/chat-format.ts
 *
 * Small shared helpers used by both the user-side and admin-side Live Chat
 * panels: WhatsApp-style "Today / Yesterday / DD Mon YYYY" date separators,
 * and detection of "emoji-only" messages so they can render full-size
 * without a chat-bubble background (also WhatsApp-style).
 */

const TZ = 'Asia/Kolkata'

function toMs(ts: number | string): number {
  return typeof ts === 'string' ? parseInt(ts, 10) : Number(ts)
}

/** Calendar-day key (YYYY-MM-DD) for a timestamp, in the app's display timezone. */
export function chatDayKey(ts: number | string): string {
  const d = new Date(toMs(ts))
  return d.toLocaleDateString('en-CA', { timeZone: TZ })
}

/** "Today" / "Yesterday" / "05 Sep 2026" — WhatsApp-style date separator label. */
export function formatDateSeparator(ts: number | string): string {
  const key = chatDayKey(ts)
  const now = Date.now()
  const todayKey = chatDayKey(now)
  const yesterdayKey = chatDayKey(now - 24 * 60 * 60 * 1000)
  if (key === todayKey) return 'Today'
  if (key === yesterdayKey) return 'Yesterday'
  const d = new Date(toMs(ts))
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ })
}

// Matches pictographic / emoji-presentation characters, skin-tone modifiers,
// ZWJ sequences and variation selectors, plus incidental whitespace.
const EMOJI_ONLY_RE = /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|[\u200D\uFE0F\u20E3]|[\u{1F3FB}-\u{1F3FF}]|\s)+$/u

/**
 * True if `text` is made up entirely of emoji (optionally several of them,
 * up to `maxCount`) and nothing else — used to decide whether a message
 * bubble should render "naked" (large, no background) like WhatsApp does.
 */
export function isEmojiOnlyText(text: string | null | undefined, maxCount = 8): boolean {
  if (!text) return false
  const trimmed = text.trim()
  if (!trimmed) return false
  if (!EMOJI_ONLY_RE.test(trimmed)) return false

  let count = 0
  try {
    const Segmenter = (Intl as any)?.Segmenter
    if (Segmenter) {
      const seg = new Segmenter('en', { granularity: 'grapheme' })
      for (const _ of seg.segment(trimmed)) count++
    } else {
      count = Array.from(trimmed).length
    }
  } catch {
    count = Array.from(trimmed).length
  }
  return count > 0 && count <= maxCount
}
