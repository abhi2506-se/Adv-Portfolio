'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ImageIcon, VideoIcon, Mic, Play, Pause, Loader2, FolderOpen } from 'lucide-react'

export interface ChatMediaItem {
  id: string
  chat_id: string
  role: 'user' | 'admin' | 'ai' | 'system'
  media_url: string
  media_type: 'image' | 'video' | 'audio'
  duration_ms?: number | string | null
  created_at: number | string
}

interface ChatMediaGalleryProps {
  open: boolean
  chatId: string | null
  /** Use dark (slate-900) chrome — matches the admin panel's theme. */
  dark?: boolean
  onClose: () => void
  /** Called with the tapped item's url/type so the caller can open it in
   *  its full-screen viewer (kept photos/videos never lock, so this can
   *  just show the real URL directly — no view_media round-trip needed). */
  onOpenItem: (item: ChatMediaItem) => void
}

function fmtDuration(ms?: number | string | null) {
  const n = typeof ms === 'string' ? parseInt(ms, 10) : (ms || 0)
  if (!n) return ''
  const secs = Math.round(n / 1000)
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
}

/**
 * Shared "Chat Media" gallery — every photo/video either side chose to
 * "keep", plus every voice note (which is always kept). Both the user
 * and admin can open this from their chat header to browse everything
 * shared in the conversation so far, tabbed by Photos / Videos / Audio.
 */
export function ChatMediaGallery({ open, chatId, dark, onClose, onOpenItem }: ChatMediaGalleryProps) {
  const [tab, setTab] = useState<'photos' | 'videos' | 'audio'>('photos')
  const [items, setItems] = useState<ChatMediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)

  const toggleAudio = (item: ChatMediaItem) => {
    if (playingId === item.id) {
      audioEl?.pause()
      setPlayingId(null)
      return
    }
    audioEl?.pause()
    const el = new Audio(item.media_url)
    el.onended = () => setPlayingId(null)
    el.play().catch(() => {})
    setAudioEl(el)
    setPlayingId(item.id)
  }

  useEffect(() => {
    if (!open) { audioEl?.pause(); setPlayingId(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open || !chatId) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/live-chat?chatId=${encodeURIComponent(chatId)}&media=1`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (!cancelled) setItems(data.media || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, chatId])

  if (!open) return null

  const photos = items.filter(i => i.media_type === 'image')
  const videos = items.filter(i => i.media_type === 'video')
  const audios = items.filter(i => i.media_type === 'audio')
  const active = tab === 'photos' ? photos : tab === 'videos' ? videos : audios

  const cardBg = dark ? 'bg-slate-900 border-white/10 text-white' : 'bg-background border-border text-foreground'
  const subText = dark ? 'text-white/50' : 'text-muted-foreground'
  const tabBtn = (t: typeof tab, label: string, count: number) => (
    <button
      onClick={() => setTab(t)}
      className={`flex-1 text-xs font-medium py-2 rounded-lg transition-colors ${tab === t
        ? (dark ? 'bg-white/15 text-white' : 'bg-foreground/10 text-foreground')
        : (dark ? 'text-white/50 hover:text-white/80' : 'text-muted-foreground hover:text-foreground')}`}
    >
      {label} {count > 0 && <span className="opacity-70">({count})</span>}
    </button>
  )

  return createPortal(
    <div className="fixed inset-0 z-[100003] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${cardBg}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            <p className="font-semibold text-sm">Chat Media</p>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-full ${dark ? 'hover:bg-white/10' : 'hover:bg-foreground/10'}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 px-3 pt-2">
          {tabBtn('photos', 'Photos', photos.length)}
          {tabBtn('videos', 'Videos', videos.length)}
          {tabBtn('audio', 'Audio', audios.length)}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className={`w-6 h-6 animate-spin ${subText}`} /></div>
          ) : active.length === 0 ? (
            <p className={`text-center text-xs py-10 ${subText}`}>
              No {tab} kept in this chat yet. Send a photo or video and choose "Keep in chat media" to save it here.
            </p>
          ) : tab === 'audio' ? (
            <div className="space-y-1.5">
              {active.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleAudio(item)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left ${dark ? 'hover:bg-white/10' : 'hover:bg-foreground/5'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${dark ? 'bg-white/10' : 'bg-foreground/10'}`}>
                    {playingId === item.id ? <Pause className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium">{item.role === 'admin' ? 'Abhishek' : 'Visitor'}</p>
                    <p className={`text-[10px] ${subText}`}>{fmtDuration(item.duration_ms)}{playingId === item.id ? ' • Playing…' : ''}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {active.map(item => (
                <button key={item.id} onClick={() => onOpenItem(item)} className="relative aspect-square rounded-lg overflow-hidden">
                  {item.media_type === 'video' ? (
                    <>
                      <video src={item.media_url} className="w-full h-full object-cover" muted />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <Play className="w-5 h-5 text-white" />
                      </div>
                    </>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.media_url} alt="Shared media" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function ChatMediaButton({ onClick, dark }: { onClick: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onClick}
      title="Chat media"
      className={`p-2 rounded-lg hover:bg-white/10 ${dark ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <ImageIcon className="w-4 h-4" />
    </button>
  )
}
