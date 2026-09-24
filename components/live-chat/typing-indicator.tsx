'use client'

/**
 * WhatsApp-style "typing…" bubble: a chat bubble with three dots that
 * bounce/fade in sequence. It uses the same "their message" colour
 * variables as MessageBubble, so it matches the wallpaper/theme on both the
 * visitor side and the admin side.
 */
export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div
      className="flex justify-start px-1 py-0.5 lc-typing-enter"
      role="status"
      aria-live="polite"
      aria-label={name ? `${name} is typing` : 'Typing'}
    >
      <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-[var(--lc-their-bg,var(--muted))] shadow-sm inline-flex items-center gap-1.5">
        <span className="lc-typing-dot" />
        <span className="lc-typing-dot" style={{ animationDelay: '0.18s' }} />
        <span className="lc-typing-dot" style={{ animationDelay: '0.36s' }} />
      </div>
    </div>
  )
}
