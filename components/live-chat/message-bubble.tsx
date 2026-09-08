'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import {
  Check, CheckCheck, Clock, RotateCw, Reply, Pencil, Trash2, Eye, EyeOff, ImageIcon, VideoIcon,
  Play, Pause, Copy, Forward as ForwardIcon, Star, Sparkles, FolderOpen,
} from 'lucide-react'
import { isEmojiOnlyText } from '@/lib/chat-format'

/** WhatsApp-style date separator pill shown once above the first message of a given day. */
export function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-2.5 px-2">
      <span className="text-[11px] font-medium text-muted-foreground bg-muted rounded-full px-3 py-1 shadow-sm">
        {label}
      </span>
    </div>
  )
}

/** Centered pill for a "system" message (AI hand-off notices, etc). */
export function SystemMessagePill({ text }: { text: string }) {
  return (
    <div className="flex justify-center my-2 px-4">
      <span className="text-[11px] text-center text-muted-foreground bg-muted/70 rounded-xl px-3 py-1.5 max-w-[85%]">
        {text}
      </span>
    </div>
  )
}

export const QUICK_REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '😢']

export interface LiveChatMessage {
  id: string
  chat_id: string
  role: 'user' | 'admin' | 'ai' | 'system'
  content: string
  created_at: number | string
  client_id?: string | null
  reply_to_id?: string | null
  edited_at?: number | string | null
  unsent_at?: number | string | null
  status?: 'sent' | 'delivered' | 'read' | 'failed'
  _pending?: boolean // set optimistically on client before server ack
  // ── Media (image/video are view-once; audio/gif always visible) ───────
  media_url?: string | null       // only ever present for the sender's own copy of view-once media
  has_media?: boolean             // present once media_url has been masked for transport
  media_type?: 'image' | 'video' | 'audio' | 'gif' | 'sticker' | null
  media_view_limit?: number
  media_view_count?: number
  media_locked?: boolean
  /** Sender chose "Keep in chat media" — always visible, never locks,
   *  and appears in the shared Chat Media gallery for both sides. */
  media_keep?: boolean
  is_sender?: boolean
  duration_ms?: number | string | null
  // ── Reactions / starring / forwarding ──────────────────────────────────
  user_reaction?: string | null
  admin_reaction?: string | null
  starred_by_user?: boolean
  starred_by_admin?: boolean
  forwarded?: boolean
}

const EDIT_WINDOW_MS = 60_000
const UNSEND_WINDOW_MS = 15_000

function DeliveryTick({ status, pending, muted }: { status?: string; pending?: boolean; muted?: boolean }) {
  const base = muted ? 'text-muted-foreground' : 'text-white/70'
  if (pending) return <Clock className={`w-3.5 h-3.5 ${base}`} />
  if (status === 'read') return <CheckCheck className={`w-3.5 h-3.5 ${muted ? 'text-sky-500' : 'text-sky-300'}`} />
  if (status === 'delivered') return <CheckCheck className={`w-3.5 h-3.5 ${base}`} />
  return <Check className={`w-3.5 h-3.5 ${base}`} />
}

interface MessageBubbleProps {
  message: LiveChatMessage
  isMine: boolean
  viewerRole: 'user' | 'admin'
  replyToMessage?: LiveChatMessage | null
  onReply: (msg: LiveChatMessage) => void
  onEdit: (msg: LiveChatMessage, newContent: string) => void
  onUnsend: (msg: LiveChatMessage) => void
  onRetry?: (msg: LiveChatMessage) => void
  onJumpToReply: (id: string) => void
  formatTime: (ts: any) => string
  onViewMedia?: (msg: LiveChatMessage) => void
  onReact?: (msg: LiveChatMessage, emoji: string) => void
  onStar?: (msg: LiveChatMessage) => void
  onForward?: (msg: LiveChatMessage) => void
}

export function MessageBubble({
  message, isMine, viewerRole, replyToMessage, onReply, onEdit, onUnsend, onRetry, onJumpToReply,
  formatTime, onViewMedia, onReact, onStar, onForward,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(message.content)
  const [, forceTick] = useState(0)
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null)
  const [showReactorList, setShowReactorList] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressMoved = useRef(false)
  const x = useMotionValue(0)
  const replyIconOpacity = useTransform(x, [0, 60], [0, 1])

  const isSystemRole = message.role === 'system'
  const isAiRole = message.role === 'ai'
  const myReaction = viewerRole === 'user' ? message.user_reaction : message.admin_reaction
  const isStarred = viewerRole === 'user' ? message.starred_by_user : message.starred_by_admin
  const reactionPills = [message.user_reaction, message.admin_reaction].filter(Boolean) as string[]
  // Who reacted with what — WhatsApp-style, shown when the reaction badge is tapped.
  const reactors: Array<{ label: string; emoji: string }> = [
    ...(message.user_reaction ? [{ label: viewerRole === 'user' ? 'You' : 'Visitor', emoji: message.user_reaction }] : []),
    ...(message.admin_reaction ? [{ label: viewerRole === 'admin' ? 'You' : 'Abhishek Singh', emoji: message.admin_reaction }] : []),
  ]

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }, [])

  const openMenuAt = (clientX: number, clientY: number) => {
    const pad = 8
    const w = 190, h = 260
    const x2 = Math.min(Math.max(clientX, pad), window.innerWidth - w - pad)
    const y2 = Math.min(Math.max(clientY, pad), window.innerHeight - h - pad)
    setMenu({ x: x2, y: y2 })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSystemRole) return
    longPressMoved.current = false
    const touch = e.touches[0]
    longPressTimer.current = setTimeout(() => {
      if (!longPressMoved.current && touch) {
        if (navigator.vibrate) navigator.vibrate(15)
        openMenuAt(touch.clientX, touch.clientY)
      }
    }, 450)
  }
  const handleTouchMove = () => { longPressMoved.current = true; clearLongPress() }
  const handleTouchEnd = () => clearLongPress()
  const handleContextMenu = (e: React.MouseEvent) => {
    if (isSystemRole) return
    e.preventDefault()
    openMenuAt(e.clientX, e.clientY)
  }

  const age = Date.now() - Number(message.created_at)
  const canEdit = isMine && !message.unsent_at && age < EDIT_WINDOW_MS
  const canUnsend = isMine && !message.unsent_at && age < UNSEND_WINDOW_MS

  // WhatsApp-style "naked" emoji rendering: a message that's just one or a
  // few emoji, with no media/reply/edit in progress, shows full-size with
  // no bubble background at all — just the emoji and a small timestamp.
  const isNakedEmoji = !editing && !replyToMessage && !message.has_media && !message.media_url && isEmojiOnlyText(message.content)

  // Re-render every second while edit/unsend windows are close to expiring,
  // so the action menu disappears live rather than only on next interaction.
  useEffect(() => {
    if (!isMine || message.unsent_at) return
    const t = setInterval(() => forceTick(v => v + 1), 1000)
    return () => clearInterval(t)
  }, [isMine, message.unsent_at])

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 60
    if (Math.abs(info.offset.x) > threshold) onReply(message)
    x.set(0)
  }

  if (message.unsent_at) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} px-2 py-1`}>
        <div className="italic text-xs text-muted-foreground bg-muted rounded-full px-3 py-1.5">🚫 Message unsent</div>
      </div>
    )
  }

  if (isSystemRole) {
    return <SystemMessagePill text={message.content} />
  }

  const closeMenu = () => setMenu(null)
  const handleCopy = () => { if (message.content) navigator.clipboard?.writeText(message.content).catch(() => {}); closeMenu() }
  const handleReact = (emoji: string) => { onReact?.(message, emoji); closeMenu() }
  const handleStar = () => { onStar?.(message); closeMenu() }
  const handleForward = () => { onForward?.(message); closeMenu() }
  const handleReplyFromMenu = () => { onReply(message); closeMenu() }
  const handleDeleteFromMenu = () => { onUnsend(message); closeMenu() }

  return (
    <div className={`group relative flex ${isMine ? 'justify-end' : 'justify-start'} px-2 py-1`}>
      {/* Swipe-to-reply icon (mobile) */}
      <motion.div style={{ opacity: replyIconOpacity }} className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
        <Reply className="w-5 h-5 text-muted-foreground" />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="max-w-[78%] touch-pan-y"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {isAiRole && (
          <p className={`text-[10px] font-medium mb-0.5 flex items-center gap-1 ${isMine ? 'justify-end' : ''} text-teal-500`}>
            <Sparkles className="w-3 h-3" /> AI Assistant (for Abhishek)
          </p>
        )}
        {/* Bubble colors read from --lc-mine-from/--lc-mine-to/--lc-their-bg
            CSS vars (set by the active chat wallpaper on an ancestor
            element — see lib/live-chat-wallpapers.ts). Falls back to the
            original violet/blue + muted look when no wallpaper is active. */}
        <div className={isNakedEmoji ? 'relative bg-transparent px-1 py-1' : `relative rounded-2xl px-3.5 py-2 ${isAiRole ? 'bg-gradient-to-br from-teal-600 to-cyan-600 text-white' : isMine ? 'bg-gradient-to-br from-[var(--lc-mine-from,#7c3aed)] to-[var(--lc-mine-to,#2563eb)] text-[var(--lc-mine-text,#ffffff)]' : 'bg-[var(--lc-their-bg,var(--muted))] text-[var(--lc-their-text,var(--foreground))]'}`}>
          {replyToMessage && (
            <button
              onClick={() => onJumpToReply(replyToMessage.id)}
              className={`block w-full text-left mb-1.5 pl-2 border-l-2 rounded-md px-2 py-1 ${isMine || isAiRole ? 'border-white/40 bg-black/15' : 'border-foreground/30 bg-foreground/5'}`}
            >
              <p className={`text-[11px] font-semibold ${isMine || isAiRole ? 'text-white/80' : 'text-foreground/80'}`}>{replyToMessage.role === 'admin' ? 'Abhishek' : replyToMessage.role === 'ai' ? 'AI Assistant' : 'You'}</p>
              <p className={`text-xs truncate ${isMine || isAiRole ? 'text-white/70' : 'text-muted-foreground'}`}>{replyToMessage.unsent_at ? 'Message unsent' : replyToMessage.content}</p>
            </button>
          )}

          {message.forwarded && (
            <p className={`text-[10px] italic mb-1 flex items-center gap-1 ${isMine || isAiRole ? 'text-white/60' : 'text-muted-foreground'}`}>
              <ForwardIcon className="w-3 h-3" /> Forwarded
            </p>
          )}

          {message.media_type === 'audio' && (message.has_media || message.media_url) ? (
            <VoiceNoteBubble message={message} isMine={isMine || isAiRole} />
          ) : message.media_type === 'gif' && (message.has_media || message.media_url) ? (
            <GifTile url={message.media_url || ''} />
          ) : (message.has_media || message.media_url) && message.media_keep ? (
            <KeptMediaTile message={message} onOpen={() => onViewMedia?.(message)} />
          ) : (message.has_media || message.media_url) ? (
            <ViewOnceMediaTile message={message} isMine={isMine || isAiRole} onOpen={() => onViewMedia?.(message)} />
          ) : null}

          {editing ? (
            <div className="space-y-1.5">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className={`w-full rounded-lg px-2 py-1.5 text-sm outline-none resize-none ${isMine ? 'bg-black/20 text-white' : 'bg-background text-foreground border border-border'}`}
                rows={2}
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs">
                <button onClick={() => { setEditing(false); setEditText(message.content) }} className={isMine ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground'}>Cancel</button>
                <button onClick={() => { onEdit(message, editText.trim()); setEditing(false) }} className="font-semibold hover:underline">Save</button>
              </div>
            </div>
          ) : isNakedEmoji ? (
            <p className="text-[2.75rem] leading-none whitespace-pre-wrap break-words">{message.content}</p>
          ) : message.content ? (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          ) : null}

          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            {isStarred && <Star className={`w-3 h-3 fill-current ${isNakedEmoji ? 'text-amber-500' : isMine || isAiRole ? 'text-amber-300' : 'text-amber-500'}`} />}
            {message.edited_at && <span className={`text-[10px] italic ${isNakedEmoji ? 'text-muted-foreground' : isMine || isAiRole ? 'text-white/60' : 'text-muted-foreground'}`}>edited</span>}
            <span className={`text-[10px] ${isNakedEmoji ? 'text-muted-foreground' : isMine || isAiRole ? 'text-white/60' : 'text-muted-foreground'}`}>{formatTime(message.created_at)}</span>
            {isMine && message.status === 'failed' ? (
              <button onClick={() => onRetry?.(message)} className="flex items-center gap-0.5 text-[10px] text-red-300 hover:text-red-200 ml-1">
                <RotateCw className="w-3 h-3" /> Send again
              </button>
            ) : isMine ? (
              <DeliveryTick status={message.status} pending={message._pending} muted={isNakedEmoji} />
            ) : null}
          </div>

          {/* Reaction badge — sits on the OUTER top corner of the bubble
              (overlapping the border from outside), never inside the
              message text. Tapping it reveals who reacted, WhatsApp-style. */}
          {reactionPills.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowReactorList(v => !v) }}
              className={`absolute -top-2.5 z-10 bg-background border border-border rounded-full pl-1 pr-1.5 py-0.5 text-xs shadow-sm flex items-center gap-0.5 hover:scale-110 transition-transform ${isMine ? 'left-1.5' : 'right-1.5'}`}
            >
              {reactionPills.map((r, i) => <span key={i}>{r}</span>)}
              {reactionPills.length > 1 && <span className="text-[9px] text-muted-foreground">{reactionPills.length}</span>}
            </button>
          )}

          {showReactorList && reactors.length > 0 && (
            <div
              className={`absolute -top-11 z-20 bg-popover border border-border rounded-lg shadow-lg px-2.5 py-1.5 text-xs space-y-1 whitespace-nowrap ${isMine ? 'left-1.5' : 'right-1.5'}`}
              onMouseLeave={() => setShowReactorList(false)}
            >
              {reactors.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span>{r.emoji}</span>
                  <span className="text-foreground/90">{r.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop hover actions */}
        {!editing && (
          <div className={`hidden sm:flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'justify-end' : 'justify-start'}`}>
            <button onClick={() => onReply(message)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Reply">
              <Reply className="w-3.5 h-3.5" />
            </button>
            {canEdit && (
              <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit (60s window)">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {canUnsend && (
              <button onClick={() => onUnsend(message)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-400" title="Delete (15s window)">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </motion.div>

      {menu && (
        <MessageContextMenu
          x={menu.x} y={menu.y}
          onClose={closeMenu}
          onReply={handleReplyFromMenu}
          onReact={handleReact}
          onCopy={message.content ? handleCopy : undefined}
          onForward={onForward ? handleForward : undefined}
          onStar={onStar ? handleStar : undefined}
          isStarred={!!isStarred}
          onDelete={canUnsend ? handleDeleteFromMenu : undefined}
          myReaction={myReaction || null}
        />
      )}
    </div>
  )
}

/** Long-press (mobile) / right-click (desktop) message menu: Reply, React, Copy, Forward, Star, Delete. */
function MessageContextMenu({
  x, y, onClose, onReply, onReact, onCopy, onForward, onStar, isStarred, onDelete, myReaction,
}: {
  x: number; y: number; onClose: () => void
  onReply: () => void
  onReact: (emoji: string) => void
  onCopy?: () => void
  onForward?: () => void
  onStar?: () => void
  isStarred: boolean
  onDelete?: () => void
  myReaction: string | null
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[10050]" onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose() }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ position: 'fixed', left: x, top: y }}
        className="w-[190px] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden py-1.5"
      >
        <div className="flex items-center justify-around px-2 pb-1.5 mb-1 border-b border-border">
          {QUICK_REACTIONS.map(emoji => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className={`text-lg leading-none p-1 rounded-full hover:scale-125 transition-transform ${myReaction === emoji ? 'bg-muted' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <MenuItem icon={<Reply className="w-4 h-4" />} label="Reply" onClick={onReply} />
        {onCopy && <MenuItem icon={<Copy className="w-4 h-4" />} label="Copy" onClick={onCopy} />}
        {onForward && <MenuItem icon={<ForwardIcon className="w-4 h-4" />} label="Forward" onClick={onForward} />}
        {onStar && <MenuItem icon={<Star className={`w-4 h-4 ${isStarred ? 'fill-current text-amber-500' : ''}`} />} label={isStarred ? 'Unstar' : 'Star'} onClick={onStar} />}
        {onDelete && <MenuItem icon={<Trash2 className="w-4 h-4" />} label="Delete" onClick={onDelete} danger />}
      </div>
    </div>,
    document.body
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors ${danger ? 'text-red-500' : 'text-foreground'}`}
    >
      {icon}
      {label}
    </button>
  )
}

/** A GIF — always visible immediately (not view-once), like a normal media tile. */
function GifTile({ url }: { url: string }) {
  if (!url) return null
  return (
    <img src={url} alt="GIF" className="rounded-lg max-w-[220px] max-h-[220px] mb-1 object-cover" loading="lazy" />
  )
}

/** WhatsApp-style voice note player: waveform, play/pause, elapsed time, 1x/1.5x/2x speed. */
function VoiceNoteBubble({ message, isMine }: { message: LiveChatMessage; isMine: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1)
  const durationMs = Number(message.duration_ms) || 0
  const url = message.media_url

  // Deterministic pseudo-waveform derived from the message id, so it looks
  // consistent across re-renders without needing real amplitude analysis.
  const bars = useWaveformBars(message.id)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0)
    const onEnd = () => { setPlaying(false); setProgress(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd) }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.playbackRate = speed; audio.play().catch(() => {}); setPlaying(true) }
  }

  const cycleSpeed = () => {
    const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const elapsedMs = durationMs ? progress * durationMs : 0
  const fmtDur = (ms: number) => {
    const s = Math.round(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  const iconWrapBg = isMine ? 'bg-white/15 hover:bg-white/25' : 'bg-foreground/10 hover:bg-foreground/15'
  const iconColor = isMine ? 'text-white' : 'text-foreground'
  const barColorActive = isMine ? 'bg-white' : 'bg-foreground'
  const barColorInactive = isMine ? 'bg-white/35' : 'bg-foreground/25'
  const subColor = isMine ? 'text-white/70' : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-2 min-w-[200px] py-1">
      {url && <audio ref={audioRef} src={url} preload="metadata" />}
      <button type="button" onClick={toggle} className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${iconWrapBg}`}>
        {playing ? <Pause className={`w-3.5 h-3.5 ${iconColor}`} /> : <Play className={`w-3.5 h-3.5 ml-0.5 ${iconColor}`} />}
      </button>
      <div className="flex-1 flex items-end gap-[2px] h-6 min-w-[90px]">
        {bars.map((h, i) => {
          const active = bars.length ? i / bars.length < progress : false
          return <span key={i} className={`w-[3px] rounded-full ${active ? barColorActive : barColorInactive}`} style={{ height: `${Math.max(15, h * 100)}%` }} />
        })}
      </div>
      <button type="button" onClick={cycleSpeed} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${iconWrapBg} ${iconColor}`}>
        {speed}x
      </button>
      <span className={`text-[10px] flex-shrink-0 tabular-nums ${subColor}`}>{fmtDur(playing || progress > 0 ? elapsedMs : durationMs)}</span>
    </div>
  )
}

function useWaveformBars(seed: string, count = 28): number[] {
  const [bars] = useState(() => {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    const rand = () => { h = (h * 1103515245 + 12345) >>> 0; return (h / 0xffffffff) }
    return Array.from({ length: count }, () => 0.25 + rand() * 0.75)
  })
  return bars
}

/** An always-visible "kept" photo/video tile — shown inline like a normal
 *  photo/video, never locks, and can be reopened any number of times by
 *  either side. Also surfaces in the Chat Media gallery. */
function KeptMediaTile({ message, onOpen }: { message: LiveChatMessage; onOpen: () => void }) {
  const isVideo = message.media_type === 'video'
  const url = message.media_url
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block w-full max-w-[220px] rounded-xl overflow-hidden mb-1.5"
    >
      {url && isVideo ? (
        <video src={url} className="w-full max-h-56 object-cover" muted />
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Shared media" className="w-full max-h-56 object-cover" />
      ) : (
        <div className="w-full h-28 flex items-center justify-center bg-foreground/10">
          {isVideo ? <VideoIcon className="w-6 h-6 text-muted-foreground" /> : <ImageIcon className="w-6 h-6 text-muted-foreground" />}
        </div>
      )}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <Play className="w-8 h-8 text-white drop-shadow" />
        </div>
      )}
      <span className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/55 text-white text-[10px] px-1.5 py-0.5 rounded-full">
        <FolderOpen className="w-3 h-3" /> Kept
      </span>
    </button>
  )
}

/** A locked/unlocked "view once" photo/video tile inside a chat bubble. */
function ViewOnceMediaTile({ message, onOpen, isMine }: { message: LiveChatMessage; onOpen: () => void; isMine: boolean }) {
  const isVideo = message.media_type === 'video'
  const locked = !!message.media_locked && !message.is_sender
  const limit = message.media_view_limit ?? 2
  const count = message.media_view_count ?? 0
  const remaining = Math.max(0, limit - count)

  // My own bubble is always on a violet/blue gradient regardless of theme,
  // so it keeps the white-on-black-overlay treatment. The other party's
  // bubble sits on the theme's muted background, so it needs theme-aware
  // colors to stay readable in both light and dark mode.
  const tileBg = isMine
    ? (locked ? 'bg-black/20 cursor-not-allowed opacity-70' : 'bg-black/25 hover:bg-black/35')
    : (locked ? 'bg-foreground/10 cursor-not-allowed opacity-70' : 'bg-foreground/10 hover:bg-foreground/15')
  const iconWrapBg = isMine ? 'bg-white/10' : 'bg-foreground/10'
  const iconColor = isMine ? 'text-white' : 'text-foreground'
  const iconMutedColor = isMine ? 'text-white/60' : 'text-muted-foreground'
  const titleColor = isMine ? 'text-white' : 'text-foreground'
  const subColor = isMine ? 'text-white/60' : 'text-muted-foreground'

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={locked}
      className={`flex items-center gap-2.5 w-full min-w-[180px] rounded-xl px-3 py-2.5 mb-1.5 text-left transition-colors ${tileBg}`}
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconWrapBg}`}>
        {locked ? <EyeOff className={`w-4 h-4 ${iconMutedColor}`} /> : isVideo ? <VideoIcon className={`w-4 h-4 ${iconColor}`} /> : <ImageIcon className={`w-4 h-4 ${iconColor}`} />}
      </div>
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${titleColor}`}>
          {locked ? 'Media no longer available' : isVideo ? 'Video' : 'Photo'}
        </p>
        <p className={`text-[11px] ${subColor}`}>
          {locked
            ? 'Already viewed the max number of times'
            : message.is_sender
              ? `You sent this • ${remaining} view${remaining === 1 ? '' : 's'} left for them`
              : `Tap to view • ${remaining} view${remaining === 1 ? '' : 's'} left`}
        </p>
      </div>
      {!locked && <Eye className={`w-3.5 h-3.5 ml-auto flex-shrink-0 ${iconMutedColor}`} />}
    </button>
  )
}
