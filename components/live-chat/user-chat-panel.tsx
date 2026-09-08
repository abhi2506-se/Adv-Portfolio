'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, Minus } from 'lucide-react'
import { usePresence } from '@/hooks/use-presence'
import { useLiveChatRealtime } from '@/hooks/use-live-chat-realtime'
import { useWebRTCCall } from '@/hooks/use-webrtc-call'
import { useIsMobile } from '@/hooks/use-mobile'
import { PresenceBadge } from './presence-badge'
import { MessageBubble, DateSeparator, type LiveChatMessage } from './message-bubble'
import { ReplyPreview, EndChatConfirm } from './reply-preview'
import { CallModal, CallStartButtons } from './call-modal'
import { MediaComposer, type PendingMedia } from './media-composer'
import { MediaViewerModal } from './media-viewer-modal'
import { VoiceRecorder, type PendingVoiceNote } from './voice-recorder'
import { EmojiPicker, EmojiPickerButton } from './emoji-picker'
import { WallpaperPicker, WallpaperPickerButton, LiveWallpaperOverlay } from './wallpaper-picker'
import { ChatMediaGallery, ChatMediaButton, type ChatMediaItem } from './chat-media-gallery'
import { getWallpaper, wallpaperCssVars } from '@/lib/live-chat-wallpapers'
import { chatDayKey, formatDateSeparator } from '@/lib/chat-format'

function fmtTime(ts: any) {
  const n = typeof ts === 'string' ? parseInt(ts, 10) : Number(ts)
  const d = new Date(n)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
}

function newClientId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/** Small ticking countdown shown atop the archive view: "Access expires in 8m 12s". */
function ArchiveExpiryNotice({ expiresAt }: { expiresAt: number }) {
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, expiresAt - Date.now()))
  useEffect(() => {
    const t = setInterval(() => setRemainingMs(Math.max(0, expiresAt - Date.now())), 1000)
    return () => clearInterval(t)
  }, [expiresAt])
  const mins = Math.floor(remainingMs / 60000)
  const secs = Math.floor((remainingMs % 60000) / 1000)
  return (
    <div className="mx-3 mb-2 text-center text-[11px] text-amber-500 bg-amber-500/10 rounded-lg py-1.5">
      🔓 Admin's approval is valid for a little longer — expires in {mins}m {secs}s
    </div>
  )
}

interface UserChatPanelProps {
  chatId: string
  onClose: () => void
  onEnded?: () => void
  /** Hide (minimize) the chat without closing/ending it — same as onClose,
   *  exposed separately so callers can label it distinctly in the UI. */
  onMinimize?: () => void
  /**
   * Optionally supply a `useWebRTCCall` instance owned by a persistent
   * ancestor (e.g. the root AIAssistant component) instead of letting this
   * panel create its own. This is what lets an in-progress call survive the
   * user closing/minimizing the chat widget or navigating elsewhere in the
   * app — the hook (and the peer connection it holds) keeps living at the
   * ancestor's level even while this panel unmounts. When provided, this
   * panel will NOT render its own <CallModal/> (the ancestor is expected to
   * render one globally) to avoid mounting the call UI twice.
   */
  externalCall?: ReturnType<typeof useWebRTCCall>
  /**
   * Called (with the channel's `sendCallSignal` function) once this panel's
   * single Realtime subscription is live, and again with a no-op on
   * unmount. Lets a parent that owns an `externalCall` instance send
   * WebRTC signaling through THIS panel's channel instead of opening a
   * second subscription to the same chat topic (which is unreliable — see
   * the comment in ai-assistant.tsx for why).
   */
  onCallSignalChannelReady?: (send: (payload: any) => void) => void
}

/** Drop-in replacement for the old inline live-chat block inside the AI assistant widget. */
export function UserChatPanel({ chatId, onClose, onEnded, onMinimize, externalCall, onCallSignalChannelReady }: UserChatPanelProps) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([])
  const [input, setInput] = useState('')
  const [adminTyping, setAdminTyping] = useState(false)
  const [replyTarget, setReplyTarget] = useState<LiveChatMessage | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [ended, setEnded] = useState<'user' | 'admin' | null>(null)
  const [endReason, setEndReason] = useState<string | null>(null)
  const [historyHidden, setHistoryHidden] = useState<{ hidden: boolean; hiddenAt: number | null }>({ hidden: false, hiddenAt: null })
  const [wallpaperId, setWallpaperId] = useState('default')
  const [wallpaperPickerOpen, setWallpaperPickerOpen] = useState(false)
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [adminOnline, setAdminOnline] = useState(true) // optimistic until first poll lands
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [voicePhase, setVoicePhase] = useState<'idle' | 'recording' | 'preview'>('idle')
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const [viewer, setViewer] = useState<{ open: boolean; loading: boolean; error: string | null; url: string | null; mediaType: 'image' | 'video' | null; viewsRemaining: number | null }>(
    { open: false, loading: false, error: null, url: null, mediaType: null, viewsRemaining: null }
  )
  const isMobile = useIsMobile()
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Archive (older messages beyond the latest 20 shown live) ───────────
  const [hasArchive, setHasArchive] = useState(false)
  const [archiveStatus, setArchiveStatus] = useState<{ requested: boolean; granted: boolean; expiresAt?: number | null }>({ requested: false, granted: false, expiresAt: null })
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveMessages, setArchiveMessages] = useState<LiveChatMessage[]>([])
  const [archiveLoading, setArchiveLoading] = useState(false)

  // The parent chat widget animates with a CSS transform, which creates a new
  // containing block for `position: fixed` descendants — that's what was
  // trapping the "full screen on mobile" panel inside the small widget box.
  // Rendering through a portal attaches this panel directly to <body>, so
  // `fixed inset-0` below is relative to the real viewport again.
  useEffect(() => { setMounted(true) }, [])

  const { presence, setPresenceFromBroadcast } = usePresence(chatId, 'user')

  const messageMap = useRef<Map<string, LiveChatMessage>>(new Map())
  const syncMessages = useCallback((updater: (map: Map<string, LiveChatMessage>) => void) => {
    updater(messageMap.current)
    setMessages(Array.from(messageMap.current.values()).sort((a, b) => Number(a.created_at) - Number(b.created_at)))
  }, [])

  // ── Initial load + polling fallback ─────────────────────────────────────
  useEffect(() => {
    let stop = false
    const load = async () => {
      try {
        const res = await fetch(`/api/live-chat?chatId=${encodeURIComponent(chatId)}`)
        if (res.ok && !stop) {
          const data = await res.json()
          const hidden = data.historyHidden?.hidden ? { hidden: true, hiddenAt: Number(data.historyHidden.hiddenAt) || null } : { hidden: false, hiddenAt: null }
          if (hidden.hidden) {
            // Admin cleared history from this point back — drop any older
            // messages we already had cached locally from before that.
            syncMessages(map => {
              for (const [id, m] of map) if (Number(m.created_at) <= (hidden.hiddenAt || 0)) map.delete(id)
              for (const m of (data.messages || [])) map.set(m.id, m)
            })
          } else {
            syncMessages(map => {
              for (const m of (data.messages || [])) if (!map.get(m.id)?._pending || true) map.set(m.id, m)
            })
          }
          setHistoryHidden(hidden)
          setAdminTyping(!!data.adminTyping)
          setAdminOnline(data.adminOnline !== false)
          setHasArchive(!!data.hasArchive)
          if (data.wallpaperId) setWallpaperId(data.wallpaperId)
          if (data.archiveStatus) setArchiveStatus({ requested: !!data.archiveStatus.requested, granted: !!data.archiveStatus.granted, expiresAt: data.archiveStatus.expiresAt || null })
          if (data.status === 'closed' && !ended) { setEnded(data.endedBy || 'admin'); setEndReason(data.endReason || null) }
        }
      } catch {}
    }
    load()
    const interval = setInterval(load, 4000)
    return () => { stop = true; clearInterval(interval) }
  }, [chatId, syncMessages, ended])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  // Mark admin messages delivered/read while this panel is open.
  useEffect(() => {
    const mark = () => {
      fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_delivered', chatId }) })
        .then(r => { if (!r.ok) console.error('[live-chat] mark_delivered failed', r.status) })
        .catch(err => console.error('[live-chat] mark_delivered error', err))
      if (document.visibilityState === 'visible') {
        fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', chatId }) })
          .then(r => { if (!r.ok) console.error('[live-chat] mark_read failed', r.status) })
          .catch(err => console.error('[live-chat] mark_read error', err))
      }
    }
    mark()
    const t = setInterval(mark, 5000)
    return () => clearInterval(t)
  }, [chatId, messages.length])

  // ── Realtime ─────────────────────────────────────────────────────────────
  const { sendCallSignal } = useLiveChatRealtime(chatId, {
    onNewMessage: (m) => syncMessages(map => { map.set(m.id, m) }),
    onMessageUpdated: (m) => syncMessages(map => { map.set(m.id, m) }),
    onReceiptsUpdated: (ids, status) => syncMessages(map => { for (const id of ids) { const ex = map.get(id); if (ex) map.set(id, { ...ex, status }) } }),
    onPresence: (role, info) => setPresenceFromBroadcast(role, info as any),
    onTyping: (role) => { if (role === 'admin') { setAdminTyping(true); setTimeout(() => setAdminTyping(false), 3500) } },
    onChatEnded: (by, reason) => { setEnded(by); setEndReason(reason || null) },
    onCallSignal: (payload) => call.handleSignal(payload),
    onWallpaperChanged: (payload) => { if (payload.wallpaperId) setWallpaperId(payload.wallpaperId) },
    onChatDeleted: () => { setEnded('admin'); setEndReason('This conversation was removed by Admin.') },
    onHistoryHidden: (payload) => {
      setHistoryHidden({ hidden: payload.hidden, hiddenAt: payload.hiddenAt })
      if (payload.hidden) {
        syncMessages(map => { for (const [id, m] of map) if (Number(m.created_at) <= (payload.hiddenAt || 0)) map.delete(id) })
        setHasArchive(false)
      }
    },
  })

  const logCall = useCallback(async (action: 'start' | 'end', data: any) => {
    const res = await fetch('/api/live-chat/call-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) })
    return res.json()
  }, [])

  // Let a parent that owns `externalCall` route outgoing WebRTC signaling
  // through THIS panel's one-and-only Realtime subscription (see the prop
  // doc comment above) instead of opening its own second subscription.
  useEffect(() => {
    onCallSignalChannelReady?.(sendCallSignal)
    return () => onCallSignalChannelReady?.(() => {
      console.error('[live-chat] Cannot send call signal — chat panel unmounted, channel not connected.')
    })
  }, [sendCallSignal, onCallSignalChannelReady])

  // Falls back to an internally-owned call hook only if the parent didn't
  // supply one — see the `externalCall` doc comment above.
  const ownCall = useWebRTCCall({ chatId, role: 'user', onSignal: sendCallSignal, logCall })
  const call = externalCall || ownCall

  // ── Send / edit / unsend ────────────────────────────────────────────────
  const sendMessage = async () => {
    const content = input.trim()
    if (!content) return
    setInput('')
    const clientId = newClientId()
    const optimistic: LiveChatMessage = {
      id: clientId, chat_id: chatId, role: 'user', content, created_at: Date.now(),
      client_id: clientId, reply_to_id: replyTarget?.id || null, status: 'sent', _pending: true,
    }
    syncMessages(map => map.set(clientId, optimistic))
    const replyToId = replyTarget?.id
    setReplyTarget(null)
    try {
      const res = await fetch('/api/live-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', chatId, content, clientId, replyToId }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      syncMessages(map => { map.delete(clientId); if (data.message) map.set(data.message.id, data.message) })
    } catch {
      syncMessages(map => map.set(clientId, { ...optimistic, _pending: false, status: 'failed' }))
    }
  }

  const changeWallpaper = async (id: string) => {
    setWallpaperId(id) // optimistic
    setWallpaperPickerOpen(false)
    try {
      await fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'set_wallpaper', chatId, wallpaperId: id }) })
    } catch {}
  }

  const retryMessage = (m: LiveChatMessage) => {
    setInput(m.content)
    syncMessages(map => map.delete(m.id))
  }

  const editMessage = async (m: LiveChatMessage, newContent: string) => {
    if (!newContent || newContent === m.content) return
    syncMessages(map => map.set(m.id, { ...m, content: newContent, edited_at: Date.now() }))
    await fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit_message', chatId, messageId: m.id, content: newContent }) }).catch(() => {})
  }

  const unsendMessage = async (m: LiveChatMessage) => {
    syncMessages(map => map.set(m.id, { ...m, unsent_at: Date.now(), content: '' }))
    await fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unsend_message', chatId, messageId: m.id }) }).catch(() => {})
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    if (typingTimeout.current) return
    fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'typing', chatId, role: 'user' }) }).catch(() => {})
    typingTimeout.current = setTimeout(() => { typingTimeout.current = null }, 3000)
  }

  const jumpToReply = (id: string) => {
    document.getElementById(`lc-msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const doEndChat = async (reason?: string) => {
    setConfirmEnd(false)
    if (call.state !== 'idle') call.endCall()
    await fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'end_chat', chatId, reason }) }).catch(() => {})
    setEnded('user')
    setEndReason(reason || null)
    onEnded?.()
  }

  // ── View-once media: send ────────────────────────────────────────────
  const handleMediaSelect = async (media: PendingMedia) => {
    if (uploading || ended) return
    setUploading(true)
    const viewMode = media.viewMode || 'twice'
    const mediaKeep = viewMode === 'keep'
    const mediaViewLimit = viewMode === 'once' ? 1 : 2
    try {
      const res = await fetch(`/api/live-chat/media-upload?chatId=${encodeURIComponent(chatId)}&filename=${encodeURIComponent(media.filename)}&type=${media.mediaType}`, {
        method: 'POST',
        headers: { 'Content-Type': media.file.type || (media.mediaType === 'video' ? 'video/webm' : 'image/jpeg') },
        body: media.file,
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')

      const clientId = newClientId()
      const optimistic: LiveChatMessage = {
        id: clientId, chat_id: chatId, role: 'user', content: '', created_at: Date.now(),
        client_id: clientId, status: 'sent', _pending: true,
        media_url: data.url, media_type: media.mediaType, media_view_limit: mediaViewLimit, media_view_count: 0, media_locked: false, media_keep: mediaKeep, is_sender: true,
      }
      syncMessages(map => map.set(clientId, optimistic))

      const sendRes = await fetch('/api/live-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', chatId, content: '', clientId, mediaUrl: data.url, mediaType: media.mediaType, mediaViewLimit, mediaKeep }),
      })
      const sendData = await sendRes.json()
      syncMessages(map => { map.delete(clientId); if (sendData.message) map.set(sendData.message.id, { ...sendData.message, is_sender: true }) })
    } catch {
      // Silent — the optimistic bubble (if any) simply stays as a failed send.
    } finally {
      setUploading(false)
    }
  }

  // ── Voice note: upload + send ──────────────────────────────────────────
  const handleVoiceSend = async (note: PendingVoiceNote) => {
    if (uploading || ended) return
    setUploading(true)
    try {
      const ext = note.file.type.includes('mp4') ? 'm4a' : 'webm'
      const filename = `voice_${Date.now()}.${ext}`
      const res = await fetch(`/api/live-chat/media-upload?chatId=${encodeURIComponent(chatId)}&filename=${encodeURIComponent(filename)}&type=audio`, {
        method: 'POST', headers: { 'Content-Type': note.file.type || 'audio/webm' }, body: note.file,
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')

      const clientId = newClientId()
      const optimistic: LiveChatMessage = {
        id: clientId, chat_id: chatId, role: 'user', content: '', created_at: Date.now(),
        client_id: clientId, status: 'sent', _pending: true,
        media_url: data.url, media_type: 'audio', duration_ms: note.durationMs, is_sender: true,
      }
      syncMessages(map => map.set(clientId, optimistic))

      const sendRes = await fetch('/api/live-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', chatId, content: '', clientId, mediaUrl: data.url, mediaType: 'audio', durationMs: note.durationMs }),
      })
      const sendData = await sendRes.json()
      syncMessages(map => { map.delete(clientId); if (sendData.message) map.set(sendData.message.id, { ...sendData.message, is_sender: true }) })
    } catch {
      // Silent — matches handleMediaSelect's failure behavior.
    } finally {
      setUploading(false)
    }
  }

  // ── GIF (already hosted externally — no upload step needed) ───────────
  const handlePickGif = async (url: string) => {
    setEmojiOpen(false)
    if (ended) return
    const clientId = newClientId()
    const optimistic: LiveChatMessage = {
      id: clientId, chat_id: chatId, role: 'user', content: '', created_at: Date.now(),
      client_id: clientId, status: 'sent', _pending: true, media_url: url, media_type: 'gif', is_sender: true,
    }
    syncMessages(map => map.set(clientId, optimistic))
    try {
      const res = await fetch('/api/live-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', chatId, content: '', clientId, mediaUrl: url, mediaType: 'gif' }),
      })
      const data = await res.json()
      syncMessages(map => { map.delete(clientId); if (data.message) map.set(data.message.id, { ...data.message, is_sender: true }) })
    } catch {
      syncMessages(map => map.set(clientId, { ...optimistic, _pending: false, status: 'failed' }))
    }
  }

  // ── Sticker (rendered as a naked full-size emoji message) ──────────────
  const handlePickSticker = (sticker: string) => {
    setEmojiOpen(false)
    if (ended) return
    setInput('')
    const clientId = newClientId()
    const optimistic: LiveChatMessage = { id: clientId, chat_id: chatId, role: 'user', content: sticker, created_at: Date.now(), client_id: clientId, status: 'sent', _pending: true }
    syncMessages(map => map.set(clientId, optimistic))
    fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'message', chatId, content: sticker, clientId }) })
      .then(r => r.json())
      .then(data => syncMessages(map => { map.delete(clientId); if (data.message) map.set(data.message.id, data.message) }))
      .catch(() => syncMessages(map => map.set(clientId, { ...optimistic, _pending: false, status: 'failed' })))
  }

  const handleReact = async (m: LiveChatMessage, emoji: string) => {
    syncMessages(map => { const ex = map.get(m.id); if (ex) map.set(m.id, { ...ex, user_reaction: ex.user_reaction === emoji ? null : emoji }) })
    await fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle_reaction', chatId, messageId: m.id, emoji }) }).catch(() => {})
  }

  const handleStar = async (m: LiveChatMessage) => {
    syncMessages(map => { const ex = map.get(m.id); if (ex) map.set(m.id, { ...ex, starred_by_user: !ex.starred_by_user }) })
    await fetch('/api/live-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'toggle_star', chatId, messageId: m.id }) }).catch(() => {})
  }

  // ── View-once media: open full-screen viewer ────────────────────────
  const openMedia = async (m: LiveChatMessage) => {
    setViewer({ open: true, loading: true, error: null, url: null, mediaType: (m.media_type === 'video' ? 'video' : 'image'), viewsRemaining: null })
    try {
      const res = await fetch('/api/live-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'view_media', chatId, messageId: m.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setViewer(v => ({ ...v, loading: false, error: data.error || 'This media is no longer available.' }))
        return
      }
      setViewer({ open: true, loading: false, error: null, url: data.url, mediaType: data.mediaType, viewsRemaining: data.viewsRemaining })
      if (!m.is_sender) {
        syncMessages(map => { const ex = map.get(m.id); if (ex) map.set(m.id, { ...ex, media_view_count: (ex.media_view_count ?? 0) + 1, media_locked: !!data.locked }) })
      }
    } catch {
      setViewer(v => ({ ...v, loading: false, error: 'Could not load media. Please try again.' }))
    }
  }
  const closeMediaViewer = () => setViewer(v => ({ ...v, open: false, url: null }))

  // ── Chat Media gallery: open an item directly (already unmasked, so no
  //    view_media round-trip / view-consumption is needed for these). ────
  const openGalleryItem = (item: { media_url: string; media_type: 'image' | 'video' | 'audio' }) => {
    if (item.media_type === 'audio') return
    setMediaGalleryOpen(false)
    setViewer({ open: true, loading: false, error: null, url: item.media_url, mediaType: item.media_type, viewsRemaining: null })
  }

  // ── Archive: request access, or fetch it once approved ──────────────────
  const openArchive = useCallback(async () => {
    setArchiveOpen(true)
    if (archiveStatus.granted) {
      setArchiveLoading(true)
      try {
        const res = await fetch('/api/live-chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_archive', chatId }),
        })
        const data = await res.json()
        if (res.ok) setArchiveMessages(data.messages || [])
      } catch {}
      setArchiveLoading(false)
    } else if (!archiveStatus.requested) {
      try {
        const res = await fetch('/api/live-chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'request_archive', chatId }),
        })
        const data = await res.json()
        if (res.ok) setArchiveStatus({ requested: !!data.requested, granted: !!data.granted })
      } catch {}
    }
  }, [chatId, archiveStatus])

  // Poll archive status while the archive modal is open — auto-loads once
  // the admin approves, and also detects the 10-minute grant expiring so
  // the visitor is asked to request access again rather than silently
  // being shown a stale "granted" state.
  useEffect(() => {
    if (!archiveOpen) return
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/live-chat?chatId=${encodeURIComponent(chatId)}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.archiveStatus) {
          setArchiveStatus({ requested: !!data.archiveStatus.requested, granted: !!data.archiveStatus.granted, expiresAt: data.archiveStatus.expiresAt || null })
          if (!data.archiveStatus.granted) setArchiveMessages([]) // grant expired (or was revoked) — clear stale data
        }
      } catch {}
    }, 4000)
    return () => clearInterval(poll)
  }, [archiveOpen, chatId])

  // Once granted while the modal is open, fetch the full history automatically.
  useEffect(() => {
    if (!archiveOpen || !archiveStatus.granted || archiveMessages.length) return
    (async () => {
      setArchiveLoading(true)
      try {
        const res = await fetch('/api/live-chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_archive', chatId }),
        })
        const data = await res.json()
        if (res.ok) setArchiveMessages(data.messages || [])
      } catch {}
      setArchiveLoading(false)
    })()
  }, [archiveOpen, archiveStatus.granted, archiveMessages.length, chatId])

  // Only the latest 20 messages show in the live view — the rest live in the archive.
  const visibleMessages = messages.slice(-20)
  const activeWallpaper = getWallpaper(wallpaperId)

  const panel = (
    <div
      className={`flex flex-col h-full bg-background text-foreground ${isMobile ? 'fixed inset-0 z-[100000]' : ''}`}
      style={wallpaperCssVars(activeWallpaper) as any}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div>
          <p className="font-semibold text-foreground text-sm">Abhishek</p>
          <PresenceBadge info={presence.admin} />
        </div>
        <div className="flex items-center gap-1">
          <CallStartButtons disabled={!!ended} onAudio={() => call.startCall('audio')} onVideo={() => call.startCall('video')} />
          <ChatMediaButton onClick={() => setMediaGalleryOpen(true)} />
          <WallpaperPickerButton onClick={() => setWallpaperPickerOpen(true)} />
          <button onClick={() => setConfirmEnd(true)} className="text-[11px] text-muted-foreground hover:text-red-400 px-2">End</button>
          <button onClick={onMinimize || onClose} title="Hide chat (stays active)" className="text-muted-foreground hover:text-foreground p-1"><Minus className="w-4 h-4" /></button>
          <button onClick={onClose} title="Close" className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {ended && (
        <div className="mx-4 mt-2 text-center text-xs text-muted-foreground bg-muted rounded-lg py-2 flex-shrink-0 px-3">
          <p>Chat ended{ended === 'admin' ? ' by Admin' : ''}.</p>
          {endReason && <p className="mt-0.5 italic">"{endReason}"</p>}
        </div>
      )}

      {historyHidden.hidden && !ended && (
        <div className="mx-4 mt-2 text-center text-xs text-muted-foreground bg-muted rounded-lg py-2 flex-shrink-0">
          🔒 Earlier messages in this chat were cleared by Admin
        </div>
      )}

      {!ended && !adminOnline && (
        <div className="mx-4 mt-2 text-center text-xs text-red-400 bg-red-500/10 rounded-lg py-2 flex-shrink-0 px-3">
          🔴 Abhishek is currently unavailable — leave a message (text or voice note) and he'll get back to you.
        </div>
      )}

      {hasArchive && (
        <button
          onClick={openArchive}
          className="mx-4 mt-2 text-center text-xs text-violet-500 hover:text-violet-400 bg-violet-500/10 rounded-lg py-2 flex-shrink-0"
        >
          🗂️ View earlier messages (archive)
        </button>
      )}

      <div className="flex-1 overflow-y-auto py-2 relative" style={{ background: activeWallpaper.background }}>
        {activeWallpaper.live && <LiveWallpaperOverlay type={activeWallpaper.live} />}
        <div className="relative z-10">
        {(() => {
          let lastDay: string | null = null
          return visibleMessages.map(m => {
            const day = chatDayKey(m.created_at)
            const showSeparator = day !== lastDay
            lastDay = day
            return (
              <div key={m.id} id={`lc-msg-${m.id}`}>
                {showSeparator && <DateSeparator label={formatDateSeparator(m.created_at)} />}
                <MessageBubble
                  message={m}
                  isMine={m.role === 'user'}
                  viewerRole="user"
                  replyToMessage={m.reply_to_id ? messages.find(x => x.id === m.reply_to_id) : null}
                  onReply={setReplyTarget}
                  onEdit={editMessage}
                  onUnsend={unsendMessage}
                  onRetry={retryMessage}
                  onJumpToReply={jumpToReply}
                  formatTime={fmtTime}
                  onViewMedia={openMedia}
                  onReact={handleReact}
                  onStar={handleStar}
                />
              </div>
            )
          })
        })()}
        {adminTyping && <p className="px-4 text-xs text-muted-foreground italic">Abhishek is typing…</p>}
        <div ref={bottomRef} />
        </div>
      </div>

      <div className="p-3 border-t border-border flex-shrink-0">
        {replyTarget && <ReplyPreview message={replyTarget} onCancel={() => setReplyTarget(null)} />}
        <div className="flex items-center gap-1">
          {voicePhase === 'idle' && <MediaComposer disabled={!!ended || uploading} onSelect={handleMediaSelect} />}
          {voicePhase === 'idle' && <EmojiPickerButton buttonRef={emojiBtnRef} onClick={() => setEmojiOpen(v => !v)} />}
          {emojiOpen && (
            <EmojiPicker
              anchorRef={emojiBtnRef}
              onClose={() => setEmojiOpen(false)}
              onPickEmoji={(e) => setInput(v => v + e)}
              onPickGif={handlePickGif}
              onPickSticker={handlePickSticker}
            />
          )}
          {voicePhase === 'idle' && (
            <input
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              disabled={!!ended}
              placeholder={ended ? 'This chat has ended' : uploading ? 'Sending media…' : 'Type a message…'}
              className="flex-1 min-w-0 bg-muted rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
            />
          )}
          {input.trim() && voicePhase === 'idle' ? (
            <button onClick={sendMessage} disabled={!!ended} className="p-2.5 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white disabled:opacity-40 shrink-0">
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <VoiceRecorder disabled={!!ended || uploading} onSend={handleVoiceSend} onPhaseChange={setVoicePhase} />
          )}
        </div>
      </div>

      <MediaViewerModal
        open={viewer.open} loading={viewer.loading} error={viewer.error}
        url={viewer.url} mediaType={viewer.mediaType} viewsRemaining={viewer.viewsRemaining}
        onClose={closeMediaViewer}
      />
      <EndChatConfirm open={confirmEnd} askReason onConfirm={doEndChat} onCancel={() => setConfirmEnd(false)} />
      <WallpaperPicker open={wallpaperPickerOpen} currentId={wallpaperId} onSelect={(w) => changeWallpaper(w.id)} onClose={() => setWallpaperPickerOpen(false)} />
      <ChatMediaGallery open={mediaGalleryOpen} chatId={chatId} onClose={() => setMediaGalleryOpen(false)} onOpenItem={openGalleryItem} />
      {/* When a parent supplies `externalCall`, it also owns rendering the
          global <CallModal/> so the call UI (and, importantly, the minimized
          floating bubble) keeps showing even after this panel unmounts. */}
      {!externalCall && (
        <CallModal
          state={call.state} callType={call.callType} peerName="Admin" error={call.error}
          localVideoEl={call.localVideoEl} remoteVideoEl={call.remoteVideoEl} remoteAudioEl={call.remoteAudioEl}
          localMuted={call.localMuted} localVideoOff={call.localVideoOff} speakerOn={call.speakerOn} duration={call.duration}
          onAccept={call.acceptCall} onReject={call.rejectCall} onEnd={call.endCall}
          onToggleMute={call.toggleMute} onToggleVideo={call.toggleVideo} onToggleSpeaker={call.toggleSpeaker}
          videoFilter={call.videoFilter} videoFilterOptions={call.videoFilterOptions} onSetVideoFilter={call.applyVideoFilter}
          proximitySupported={call.proximitySupported} screenDimmed={call.screenDimmed} onDismissScreenDim={call.dismissScreenDim}
          minimized={call.minimized} onToggleMinimize={call.toggleMinimize}
          pipSupported={call.pipSupported} pipActive={call.pipActive} onRequestPiP={call.requestPiP}
        />
      )}

      {archiveOpen && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={() => setArchiveOpen(false)}>
          <div className="w-full max-w-sm max-h-[80vh] bg-background rounded-2xl border border-border flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-semibold text-sm text-foreground">Chat Archive</p>
              <button onClick={() => setArchiveOpen(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {!archiveStatus.granted ? (
                <div className="text-center text-sm text-muted-foreground px-6 py-8">
                  {archiveStatus.requested ? (
                    <>🔒 Your full chat history request has been sent to Admin.<br />You'll be able to view it here as soon as Admin approves.</>
                  ) : (
                    <>
                      🔒 Admin's last approval to view your full history has expired (approvals last 10 minutes).
                      <br /><br />
                      <button onClick={openArchive} className="text-violet-500 hover:text-violet-400 font-medium underline">
                        Request access again
                      </button>
                    </>
                  )}
                </div>
              ) : archiveLoading ? (
                <div className="text-center text-sm text-muted-foreground px-6 py-8">Loading full history…</div>
              ) : (
                <>
                  {archiveStatus.expiresAt && (
                    <ArchiveExpiryNotice expiresAt={archiveStatus.expiresAt} />
                  )}
                  {(() => {
                  let lastDay: string | null = null
                  return archiveMessages.map(m => {
                    const day = chatDayKey(m.created_at)
                    const showSeparator = day !== lastDay
                    lastDay = day
                    return (
                      <div key={m.id}>
                        {showSeparator && <DateSeparator label={formatDateSeparator(m.created_at)} />}
                        <MessageBubble
                          message={m}
                          isMine={m.role === 'user'}
                          viewerRole="user"
                          replyToMessage={m.reply_to_id ? archiveMessages.find(x => x.id === m.reply_to_id) : null}
                          onReply={() => {}}
                          onEdit={() => {}}
                          onUnsend={() => {}}
                          onJumpToReply={() => {}}
                          formatTime={fmtTime}
                          onViewMedia={openMedia}
                        />
                      </div>
                    )
                  })
                })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // On mobile this needs to escape the animated (transformed) widget wrapper
  // to actually cover the full viewport — see the `mounted` effect above.
  if (isMobile) {
    return mounted ? createPortal(panel, document.body) : null
  }
  return panel
}
