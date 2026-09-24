'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Smile, Loader2, Search } from 'lucide-react'

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: 'Smileys', emojis: ['😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😜', '🤔', '😎', '🥳', '😇', '🙃', '😴', '🤩', '😭', '😅', '😢', '😡', '🥺'] },
  { label: 'Gestures', emojis: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '💪', '✌️', '🤞', '👋', '🤙', '👌', '✋', '🫡'] },
  { label: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕', '💖', '💗', '😻'] },
  { label: 'Fire & Fun', emojis: ['🔥', '✨', '🎉', '🎊', '🎁', '⭐', '🌟', '💯', '🚀', '⚡', '🏆', '🎯'] },
  { label: 'Objects', emojis: ['💬', '📌', '📷', '🎵', '⏰', '💡', '📝', '✅', '❌', '⚠️', '❓', '❗'] },
]

// Small bundled "sticker" pack — bigger/expressive emoji combos, since a
// full custom sticker-art pipeline is out of scope. Tapping one just sends
// it as a naked, full-size emoji message (see message-bubble.tsx).
const STICKERS: string[] = ['🎉🎊', '❤️‍🔥', '🥳', '👏👏', '🙌', '😂😂', '🤝', '🔥🔥', '💯', '🙏', '😍', '🤩', '😢', '👍', '🎁', '⭐️⭐️']

interface GifItem { id: string; url: string; previewUrl: string }

interface EmojiPickerProps {
  onPickEmoji: (emoji: string) => void
  onPickGif: (url: string) => void
  onPickSticker: (sticker: string) => void
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement | null>
}

export function EmojiPicker({ onPickEmoji, onPickGif, onPickSticker, onClose, anchorRef }: EmojiPickerProps) {
  const [tab, setTab] = useState<'emoji' | 'gif' | 'sticker'>('emoji')
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) setPos({ left: Math.max(8, rect.left - 260 + rect.width), bottom: window.innerHeight - rect.top + 8 })
  }, [anchorRef])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node) && !anchorRef.current?.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [onClose, anchorRef])

  if (!pos) return null

  return createPortal(
    <div
      ref={popRef}
      style={{ position: 'fixed', left: pos.left, bottom: pos.bottom }}
      className="z-[100040] w-[320px] h-[360px] bg-popover border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="flex border-b border-border flex-shrink-0">
        {(['emoji', 'gif', 'sticker'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-xs font-medium py-2.5 capitalize ${tab === t ? 'text-foreground border-b-2 border-violet-500' : 'text-muted-foreground'}`}
          >
            {t === 'gif' ? 'GIF' : t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'emoji' && <EmojiTab onPick={onPickEmoji} />}
        {tab === 'gif' && <GifTab onPick={onPickGif} />}
        {tab === 'sticker' && <StickerTab onPick={onPickSticker} />}
      </div>
    </div>,
    document.body
  )
}

function EmojiTab({ onPick }: { onPick: (e: string) => void }) {
  return (
    <div className="p-2.5">
      {EMOJI_CATEGORIES.map(cat => (
        <div key={cat.label} className="mb-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 px-1">{cat.label}</p>
          <div className="grid grid-cols-8 gap-0.5">
            {cat.emojis.map(e => (
              <button key={e} onClick={() => onPick(e)} className="text-xl leading-none p-1.5 rounded-lg hover:bg-muted transition-colors">
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function StickerTab({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="p-3 grid grid-cols-4 gap-2">
      {STICKERS.map(s => (
        <button key={s} onClick={() => onPick(s)} className="text-2xl leading-none p-3 rounded-xl hover:bg-muted transition-colors bg-muted/40">
          {s}
        </button>
      ))}
    </div>
  )
}

function GifTab({ onPick }: { onPick: (url: string) => void }) {
  const [query, setQuery] = useState('')
  const [gifs, setGifs] = useState<GifItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = (q: string) => {
    setLoading(true)
    setErrored(false)
    fetch(`/api/live-chat/gif-search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => { setGifs(data.gifs || []); if (data.error) setErrored(true) })
      .catch(() => setErrored(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { search('') }, [])

  const handleChange = (v: string) => {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(v), 400)
  }

  return (
    <div className="p-2.5 flex flex-col h-full">
      <div className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 mb-2 flex-shrink-0">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          placeholder="Search GIFs…"
          className="flex-1 bg-transparent text-xs outline-none"
        />
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : errored || gifs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center mt-6 px-4">
          {errored ? "GIF search isn't available right now." : 'No GIFs found.'}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-1.5 overflow-y-auto">
          {gifs.map(g => (
            <button key={g.id} onClick={() => onPick(g.url)} className="rounded-lg overflow-hidden hover:ring-2 ring-violet-500">
              <img src={g.previewUrl} alt="" className="w-full h-20 object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function EmojiPickerButton({ onClick, buttonRef }: { onClick: () => void; buttonRef: React.RefObject<HTMLButtonElement | null> }) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      title="Emoji, GIFs & stickers"
      className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors"
    >
      <Smile className="w-4 h-4" />
    </button>
  )
}
