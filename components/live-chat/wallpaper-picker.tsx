'use client'

import { useMemo } from 'react'
import { X, Check, Palette } from 'lucide-react'
import { CHAT_WALLPAPERS, type ChatWallpaper } from '@/lib/live-chat-wallpapers'

/**
 * Wallpaper picker modal — shared by both the User and Admin chat panels.
 * Whichever side picks a wallpaper, it's saved on the chat itself and
 * broadcast instantly to the other side (see `set_wallpaper` in
 * app/api/live-chat/route.ts + `onWallpaperChanged` in the realtime hook).
 */
export function WallpaperPickerButton({ onClick, dark }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Change wallpaper"
      className={`p-2 rounded-lg hover:bg-white/10 ${dark ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <Palette className="w-4 h-4" />
    </button>
  )
}

export function WallpaperPicker({
  open, currentId, onSelect, onClose, dark,
}: {
  open: boolean
  currentId: string
  onSelect: (wallpaper: ChatWallpaper) => void
  onClose: () => void
  /** Use dark (slate-900) chrome — matches the admin panel's theme. */
  dark?: boolean
}) {
  if (!open) return null
  const cardBg = dark ? 'bg-slate-900 border-white/10 text-white' : 'bg-background border-border text-foreground'
  const subText = dark ? 'text-white/50' : 'text-muted-foreground'
  return (
    <div className="fixed inset-0 z-[10002] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${cardBg}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-inherit flex-shrink-0">
          <div>
            <p className="font-semibold text-sm">Chat wallpaper</p>
            <p className={`text-[11px] ${subText}`}>Applies for both sides of this chat</p>
          </div>
          <button onClick={onClose} className={`p-1 rounded hover:bg-foreground/10 ${dark ? 'text-white/60 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-3">
          {CHAT_WALLPAPERS.map(w => {
            const active = w.id === currentId
            return (
              <button
                key={w.id}
                onClick={() => onSelect(w)}
                className="flex flex-col items-center gap-1.5 group"
                title={w.name}
              >
                <div
                  className={`relative w-full aspect-square rounded-xl border-2 overflow-hidden transition-transform group-hover:scale-105 ${active ? 'border-violet-500' : 'border-transparent'}`}
                  style={{ background: w.swatch, boxShadow: active ? '0 0 0 2px rgba(139,92,246,0.4)' : undefined }}
                >
                  {w.live && (
                    <span className="absolute bottom-1 right-1 text-[10px] bg-black/40 text-white rounded-full px-1.5 py-0.5 leading-none">
                      LIVE
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Check className="w-5 h-5 text-white drop-shadow" />
                    </span>
                  )}
                </div>
                <span className={`text-[11px] ${active ? 'font-semibold' : subText}`}>{w.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/**
 * Animated decorative overlay rendered *behind* the messages for "live"
 * wallpapers (floating hearts / roses / confetti). Pure CSS keyframes
 * (defined globally in app/globals.css) — no images/network requests.
 */
export function LiveWallpaperOverlay({ type }: { type: 'hearts' | 'roses' | 'confetti' }) {
  const glyphs = type === 'hearts' ? ['❤️', '💕', '💗'] : type === 'roses' ? ['🌹', '🌸'] : ['🎉', '✨', '🎊']
  const items = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({
      id: i,
      glyph: glyphs[i % glyphs.length],
      left: Math.round((i * 137.5) % 100), // deterministic spread, no hydration mismatch
      delay: (i % 7) * 1.1,
      duration: 9 + (i % 5) * 1.6,
      size: 14 + (i % 4) * 6,
    })),
    [type] // eslint-disable-line react-hooks/exhaustive-deps
  )
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {items.map(it => (
        <span
          key={it.id}
          className="lc-live-wallpaper-glyph"
          style={{
            left: `${it.left}%`,
            fontSize: `${it.size}px`,
            animationDelay: `${it.delay}s`,
            animationDuration: `${it.duration}s`,
          }}
        >
          {it.glyph}
        </span>
      ))}
    </div>
  )
}
