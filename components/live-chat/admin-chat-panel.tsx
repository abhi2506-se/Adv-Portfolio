'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Bookmark, BookmarkCheck, CheckCircle2, X, Minus, Maximize2, Settings2, EyeOff, Eye, ArchiveRestore, Phone, Video, ArrowLeft, MoreVertical, Trash2 } from 'lucide-react'
import { usePresence } from '@/hooks/use-presence'
import { useLiveChatRealtime } from '@/hooks/use-live-chat-realtime'
import { useWebRTCCall } from '@/hooks/use-webrtc-call'
import { useIsMobile } from '@/hooks/use-mobile'
import { PresenceBadge } from './presence-badge'
import { MessageBubble, DateSeparator, type LiveChatMessage } from './message-bubble'
import { ReplyPreview, EndChatConfirm, DeleteChatConfirm } from './reply-preview'
import { CallModal } from './call-modal'
import { MediaComposer, type PendingMedia } from './media-composer'
import { MediaViewerModal } from './media-viewer-modal'
import { VoiceRecorder, type PendingVoiceNote } from './voice-recorder'
import { EmojiPicker, EmojiPickerButton } from './emoji-picker'
import { ForwardPicker } from './forward-picker'
import { WallpaperPicker, WallpaperPickerButton, LiveWallpaperOverlay } from './wallpaper-picker'
import { ChatMediaGallery, ChatMediaButton } from './chat-media-gallery'
import { getWallpaper, wallpaperCssVars } from '@/lib/live-chat-wallpapers'
import { chatDayKey, formatDateSeparator } from '@/lib/chat-format'

// WhatsApp-style: only the time shows on each bubble now — the date is
// shown once via a separator pill above the first message of that day.
function fmtTime(ts: any) {
  const n = typeof ts === 'string' ? parseInt(ts, 10) : Number(ts)
  const d = new Date(n)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
}

function newClientId() {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

async function api(action: string, extra: Record<string, any> = {}) {
  const res = await fetch('/api/live-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    // This helper is only ever used by the admin panel, so always assert
    // role: 'admin' explicitly rather than letting the server infer it
    // solely from the session cookie — see app/api/live-chat/route.ts.
    body: JSON.stringify({ action, role: 'admin', ...extra }),
  })
  return res.json().catch(() => ({}))
}

/**
 * Full admin-side Live Chat panel (calls, reply, edit/unsend, receipts,
 * presence, approve/save/end chat, saved-chats browser). Renders its own
 * chat list — pass a `chats` override only if you need external control.
 */
export function AdminChatPanel() {
  const [chats, setChats] = useState<any[]>([])
  const [savedChats, setSavedChats] = useState<any[]>([])
  const [endedChats, setEndedChats] = useState<any[]>([])
  const [view, setView] = useState<'active' | 'saved' | 'ended'>('active')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [replyTarget, setReplyTarget] = useState<LiveChatMessage | null>(null)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [userTyping, setUserTyping] = useState(false)
  const [endNotice, setEndNotice] = useState<{ name: string; reason: string | null } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [viewer, setViewer] = useState<{ open: boolean; loading: boolean; error: string | null; url: string | null; mediaType: 'image' | 'video' | null; viewsRemaining: number | null }>(
    { open: false, loading: false, error: null, url: null, mediaType: null, viewsRemaining: null }
  )
  // ── Archive: admin can always view the full history instantly ──────────
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveMessages, setArchiveMessages] = useState<LiveChatMessage[]>([])
  const [archiveLoading, setArchiveLoading] = useState(false)
  // Mobile "chat is open" full-screen mode — toggleable in Settings, and can
  // be minimized (hidden) at any time without ending the underlying chat.
  const [mobileFullscreen, setMobileFullscreen] = useState(true)
  const [minimized, setMinimized] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!actionsMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) setActionsMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('touchstart', onDocClick)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick)
    }
  }, [actionsMenuOpen])
  // Close the menu whenever a different chat is selected.
  useEffect(() => { setActionsMenuOpen(false) }, [selectedId])
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [voicePhase, setVoicePhase] = useState<'idle' | 'recording' | 'preview'>('idle')
  const [forwardTarget, setForwardTarget] = useState<LiveChatMessage | null>(null)
  const [showPhone, setShowPhone] = useState(false)
  const [wallpaperPickerOpen, setWallpaperPickerOpen] = useState(false)
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [wallpaperOverrides, setWallpaperOverrides] = useState<Record<string, string>>({})
  const emojiBtnRef = useRef<HTMLButtonElement>(null)
  const isMobile = useIsMobile()
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messageMap = useRef<Map<string, LiveChatMessage>>(new Map())
  const [, forceTick] = useState(0)

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(d => {
      const v = d?.settings?.live_chat_mobile_fullscreen
      if (v !== undefined) setMobileFullscreen(v === 'true' || v === true)
    }).catch(() => {})
  }, [])

  // ── Tell the server Abhishek is online while this panel is open. This
  //    drives the visitor's "leave a message" fallback, the AI hybrid
  //    auto-responder, and the AI → human handoff message. ─────────────
  useEffect(() => {
    const beat = () => fetch('/api/live-chat/admin-status', { method: 'POST' }).catch(() => {})
    beat()
    const t = setInterval(beat, 15000)
    return () => clearInterval(t)
  }, [])

  const saveMobileFullscreenSetting = async (val: boolean) => {
    setMobileFullscreen(val)
    await fetch('/api/admin/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { live_chat_mobile_fullscreen: val ? 'true' : 'false' } }),
    }).catch(() => {})
  }

  const selected = chats.find(c => c.id === selectedId) || savedChats.find(c => c.id === selectedId) || endedChats.find(c => c.id === selectedId) || null
  const { presence, setPresenceFromBroadcast } = usePresence(selectedId, 'admin', true)

  const syncMessages = useCallback((updater: (map: Map<string, LiveChatMessage>) => void) => {
    updater(messageMap.current)
    forceTick(v => v + 1)
  }, [])

  const currentMessages = () => Array.from(messageMap.current.values()).sort((a, b) => Number(a.created_at) - Number(b.created_at))

  // ── Load active chats (polling fallback; realtime pushes live updates) ──
  const loadChats = useCallback(async () => {
    try {
      const res = await fetch('/api/live-chat?admin=1')
      if (res.ok) {
        const data = await res.json()
        setChats(data.chats || [])
        if (selectedId) {
          const c = (data.chats || []).find((x: any) => x.id === selectedId)
          if (c) {
            messageMap.current = new Map((c.messages || []).map((m: LiveChatMessage) => [m.id, m]))
            setUserTyping(c.typingRole === 'user')
            forceTick(v => v + 1)
          }
        }
      }
    } catch {}
  }, [selectedId])

  useEffect(() => { loadChats(); const t = setInterval(loadChats, 4000); return () => clearInterval(t) }, [loadChats])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [selectedId, messageMap.current.size])

  const loadSaved = useCallback(async () => {
    const res = await fetch('/api/live-chat?saved=1')
    if (res.ok) { const data = await res.json(); setSavedChats(data.chats || []) }
  }, [])
  useEffect(() => { if (view === 'saved') loadSaved() }, [view, loadSaved])

  const loadEnded = useCallback(async () => {
    const res = await fetch('/api/live-chat?endedMode=1')
    if (res.ok) { const data = await res.json(); setEndedChats(data.chats || []) }
  }, [])
  useEffect(() => { if (view === 'ended') { loadEnded(); const t = setInterval(loadEnded, 8000); return () => clearInterval(t) } }, [view, loadEnded])

  const selectChat = (chat: any) => {
    setSelectedId(chat.id)
    setMinimized(false)
    setShowPhone(false)
    messageMap.current = new Map((chat.messages || []).map((m: LiveChatMessage) => [m.id, m]))
    forceTick(v => v + 1)
  }

  // ── View-once media: send ────────────────────────────────────────────
  const handleMediaSelect = async (media: PendingMedia) => {
    if (uploading || !selectedId) return
    setUploading(true)
    const viewMode = media.viewMode || 'twice'
    const mediaKeep = viewMode === 'keep'
    const mediaViewLimit = viewMode === 'once' ? 1 : 2
    try {
      const res = await fetch(`/api/live-chat/media-upload?chatId=${encodeURIComponent(selectedId)}&filename=${encodeURIComponent(media.filename)}&type=${media.mediaType}`, {
        method: 'POST',
        headers: { 'Content-Type': media.file.type || (media.mediaType === 'video' ? 'video/webm' : 'image/jpeg') },
        body: media.file,
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')

      const clientId = newClientId()
      const optimistic: LiveChatMessage = {
        id: clientId, chat_id: selectedId, role: 'admin', content: '', created_at: Date.now(),
        client_id: clientId, status: 'sent', _pending: true,
        media_url: data.url, media_type: media.mediaType, media_view_limit: mediaViewLimit, media_view_count: 0, media_locked: false, media_keep: mediaKeep, is_sender: true,
      }
      syncMessages(map => map.set(clientId, optimistic))
      const sendData = await api('admin_reply', { chatId: selectedId, content: '', clientId, mediaUrl: data.url, mediaType: media.mediaType, mediaViewLimit, mediaKeep })
      syncMessages(map => { map.delete(clientId); if (sendData.message) map.set(sendData.message.id, { ...sendData.message, is_sender: true }) })
    } catch {
      // Silent — swallow upload/send errors, optimistic bubble simply stays as sent-but-unconfirmed.
    } finally {
      setUploading(false)
    }
  }

  // ── Voice note: upload + send ──────────────────────────────────────────
  const handleVoiceSend = async (note: PendingVoiceNote) => {
    if (uploading || !selectedId) return
    setUploading(true)
    try {
      const ext = note.file.type.includes('mp4') ? 'm4a' : 'webm'
      const filename = `voice_${Date.now()}.${ext}`
      const res = await fetch(`/api/live-chat/media-upload?chatId=${encodeURIComponent(selectedId)}&filename=${encodeURIComponent(filename)}&type=audio`, {
        method: 'POST', headers: { 'Content-Type': note.file.type || 'audio/webm' }, body: note.file,
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed')

      const clientId = newClientId()
      const optimistic: LiveChatMessage = {
        id: clientId, chat_id: selectedId, role: 'admin', content: '', created_at: Date.now(),
        client_id: clientId, status: 'sent', _pending: true,
        media_url: data.url, media_type: 'audio', duration_ms: note.durationMs, is_sender: true,
      }
      syncMessages(map => map.set(clientId, optimistic))
      const sendData = await api('admin_reply', { chatId: selectedId, content: '', clientId, mediaUrl: data.url, mediaType: 'audio', durationMs: note.durationMs })
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
    if (!selectedId) return
    const clientId = newClientId()
    const optimistic: LiveChatMessage = {
      id: clientId, chat_id: selectedId, role: 'admin', content: '', created_at: Date.now(),
      client_id: clientId, status: 'sent', _pending: true, media_url: url, media_type: 'gif', is_sender: true,
    }
    syncMessages(map => map.set(clientId, optimistic))
    const data = await api('admin_reply', { chatId: selectedId, content: '', clientId, mediaUrl: url, mediaType: 'gif' })
    syncMessages(map => { map.delete(clientId); if (data.message) map.set(data.message.id, { ...data.message, is_sender: true }) })
  }

  // ── Sticker (rendered as a naked full-size emoji message) ──────────────
  const handlePickSticker = async (sticker: string) => {
    setEmojiOpen(false)
    if (!selectedId) return
    const clientId = newClientId()
    const optimistic: LiveChatMessage = { id: clientId, chat_id: selectedId, role: 'admin', content: sticker, created_at: Date.now(), client_id: clientId, status: 'sent', _pending: true }
    syncMessages(map => map.set(clientId, optimistic))
    const data = await api('admin_reply', { chatId: selectedId, content: sticker, clientId })
    syncMessages(map => { map.delete(clientId); if (data.message) map.set(data.message.id, data.message) })
  }

  const handleReact = async (m: LiveChatMessage, emoji: string) => {
    if (!selectedId) return
    syncMessages(map => { const ex = map.get(m.id); if (ex) map.set(m.id, { ...ex, admin_reaction: ex.admin_reaction === emoji ? null : emoji }) })
    await api('toggle_reaction', { chatId: selectedId, messageId: m.id, emoji })
  }

  const handleStar = async (m: LiveChatMessage) => {
    if (!selectedId) return
    syncMessages(map => { const ex = map.get(m.id); if (ex) map.set(m.id, { ...ex, starred_by_admin: !ex.starred_by_admin }) })
    await api('toggle_star', { chatId: selectedId, messageId: m.id })
  }

  const submitForward = async (toChatId: string) => {
    if (!forwardTarget || !selectedId) return
    await api('forward_message', { fromChatId: selectedId, messageId: forwardTarget.id, toChatId })
    setForwardTarget(null)
    loadChats()
  }

  // ── View-once media: open full-screen viewer ────────────────────────
  const openMedia = async (m: LiveChatMessage) => {
    if (!selectedId) return
    setViewer({ open: true, loading: true, error: null, url: null, mediaType: (m.media_type === 'video' ? 'video' : 'image'), viewsRemaining: null })
    const data = await api('view_media', { chatId: selectedId, messageId: m.id })
    if (!data.ok) {
      setViewer(v => ({ ...v, loading: false, error: data.error || 'This media is no longer available.' }))
      return
    }
    setViewer({ open: true, loading: false, error: null, url: data.url, mediaType: data.mediaType, viewsRemaining: data.viewsRemaining })
    if (!m.is_sender) {
      syncMessages(map => { const ex = map.get(m.id); if (ex) map.set(m.id, { ...ex, media_view_count: (ex.media_view_count ?? 0) + 1, media_locked: !!data.locked }) })
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

  // Mark read while viewing.
  useEffect(() => {
    if (!selectedId) return
    const mark = () => {
      api('mark_delivered', { chatId: selectedId }).catch(err => console.error('[live-chat] admin mark_delivered error', err))
      api('mark_read', { chatId: selectedId }).catch(err => console.error('[live-chat] admin mark_read error', err))
    }
    mark()
    const t = setInterval(mark, 5000)
    return () => clearInterval(t)
  }, [selectedId, messageMap.current.size])

  // ── Realtime ──────────────────────────────────────────────────────────
  const { sendCallSignal } = useLiveChatRealtime(selectedId, {
    onNewMessage: (m) => { if (m.chat_id === selectedId) syncMessages(map => map.set(m.id, m)) },
    onMessageUpdated: (m) => { if (m.chat_id === selectedId) syncMessages(map => map.set(m.id, m)) },
    onReceiptsUpdated: (ids, status) => syncMessages(map => { for (const id of ids) { const ex = map.get(id); if (ex) map.set(id, { ...ex, status }) } }),
    onPresence: (role, info) => setPresenceFromBroadcast(role, info as any),
    onTyping: (role) => { if (role === 'user') { setUserTyping(true); setTimeout(() => setUserTyping(false), 3500) } },
    onChatEnded: (by, reason) => {
      loadChats()
      if (by === 'user') {
        const name = selected?.user_name || 'Visitor'
        setEndNotice({ name, reason: reason || null })
        setTimeout(() => setEndNotice(n => (n && n.name === name ? null : n)), 8000)
      }
    },
    onCallSignal: (payload) => call.handleSignal(payload),
    onWallpaperChanged: (payload) => {
      if (payload.chatId && payload.wallpaperId) setWallpaperOverrides(o => ({ ...o, [payload.chatId]: payload.wallpaperId }))
    },
    onChatDeleted: (payload) => {
      if (payload.chatId === selectedId) setSelectedId(null)
      loadChats()
    },
  })

  const logCall = useCallback(async (action: 'start' | 'end', data: any) => {
    const res = await fetch('/api/live-chat/call-log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) })
    return res.json()
  }, [])
  const call = useWebRTCCall({ chatId: selectedId, role: 'admin', onSignal: sendCallSignal, logCall })

  // ── Actions ───────────────────────────────────────────────────────────
  const sendReply = async () => {
    const content = input.trim()
    if (!content || !selectedId) return
    setInput('')
    const clientId = newClientId()
    const optimistic: LiveChatMessage = { id: clientId, chat_id: selectedId, role: 'admin', content, created_at: Date.now(), client_id: clientId, reply_to_id: replyTarget?.id || null, status: 'sent', _pending: true }
    syncMessages(map => map.set(clientId, optimistic))
    const replyToId = replyTarget?.id
    setReplyTarget(null)
    const data = await api('admin_reply', { chatId: selectedId, content, clientId, replyToId })
    syncMessages(map => { map.delete(clientId); if (data.message) map.set(data.message.id, data.message) })
  }

  const editMessage = async (m: LiveChatMessage, newContent: string) => {
    if (!newContent || newContent === m.content || !selectedId) return
    syncMessages(map => map.set(m.id, { ...m, content: newContent, edited_at: Date.now() }))
    await api('edit_message', { chatId: selectedId, messageId: m.id, content: newContent })
  }
  const unsendMessage = async (m: LiveChatMessage) => {
    if (!selectedId) return
    syncMessages(map => map.set(m.id, { ...m, unsent_at: Date.now(), content: '' }))
    await api('unsend_message', { chatId: selectedId, messageId: m.id })
  }
  const handleTyping = (val: string) => {
    setInput(val)
    if (typingTimeout.current || !selectedId) return
    api('typing', { chatId: selectedId, role: 'admin' })
    typingTimeout.current = setTimeout(() => { typingTimeout.current = null }, 3000)
  }
  const jumpToReply = (id: string) => document.getElementById(`lc-admin-msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const approve = async (chatId: string) => { await api('approve', { chatId }); loadChats() }
  const saveChat = async (chatId: string) => { await api('save_chat', { chatId, savedBy: 'admin' }); loadChats() }
  const unsaveChat = async (chatId: string) => { await api('unsave_chat', { chatId }); loadSaved() }
  const changeWallpaper = async (chatId: string, wallpaperId: string) => {
    setWallpaperOverrides(o => ({ ...o, [chatId]: wallpaperId })) // optimistic
    setWallpaperPickerOpen(false)
    await api('set_wallpaper', { chatId, wallpaperId })
    loadChats()
  }
  const doDeleteChat = async () => {
    setConfirmDelete(false)
    if (!selectedId) return
    if (call.state !== 'idle') call.endCall()
    await api('admin_delete_chat', { chatId: selectedId })
    setSelectedId(null)
    loadChats()
    loadSaved()
    loadEnded()
  }
  const doEndChat = async () => {
    setConfirmEnd(false)
    if (!selectedId) return
    if (call.state !== 'idle') call.endCall()
    await api('end_chat', { chatId: selectedId })
    setSelectedId(null)
    loadChats()
  }

  // ── Archive: admin always has instant access, no approval needed ────────
  const openArchive = async (chatId: string) => {
    setArchiveOpen(true)
    setArchiveLoading(true)
    try {
      const data = await api('get_archive', { chatId })
      setArchiveMessages(data.messages || [])
    } catch {}
    setArchiveLoading(false)
  }
  const grantArchive = async (chatId: string) => { await api('grant_archive', { chatId }); loadChats() }
  const denyArchive = async (chatId: string) => { await api('deny_archive', { chatId }); loadChats() }
  const hideHistory = async (chatId: string) => { await api('hide_history', { chatId }); loadChats() }
  const unhideHistory = async (chatId: string) => { await api('unhide_history', { chatId }); loadChats() }

  const pendingCount = chats.filter(c => c.status === 'pending').length
  const list = view === 'active' ? chats : view === 'saved' ? savedChats : endedChats
  const activeWallpaperId = selected ? (wallpaperOverrides[selected.id] || selected.wallpaper_id || 'default') : 'default'
  const activeWallpaper = getWallpaper(activeWallpaperId)

  // On mobile, once a chat is open (selected + not minimized), and the
  // admin has enabled the "auto full-screen on mobile" setting, take over
  // the whole viewport for a focused chat experience.
  const mobileFullscreenActive = isMobile && mobileFullscreen && !!selectedId && !minimized

  return (
    <div className={mobileFullscreenActive ? 'fixed inset-0 z-[100000] bg-background p-2' : 'grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[70vh] min-h-[500px]'}>
      {/* ── Instant "visitor wants to end chat" notice ── */}
      {endNotice && (
        <div className="fixed top-4 right-4 z-[9999] max-w-xs bg-slate-900 border border-red-500/30 rounded-xl shadow-2xl px-4 py-3">
          <p className="text-sm text-white font-semibold">👋 {endNotice.name} ended the chat</p>
          {endNotice.reason ? (
            <p className="text-xs text-white/60 mt-1 italic">Reason: "{endNotice.reason}"</p>
          ) : (
            <p className="text-xs text-white/40 mt-1">No reason given</p>
          )}
          <button onClick={() => setEndNotice(null)} className="absolute top-1.5 right-1.5 text-white/40 hover:text-white p-1"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {/* ── Chat list ── */}
      <div className={`border border-white/10 rounded-2xl overflow-hidden flex-col ${mobileFullscreenActive ? 'hidden' : 'flex'}`}>
        <div className="flex items-center border-b border-white/10">
          <button onClick={() => setView('active')} className={`flex-1 py-2.5 text-sm font-medium ${view === 'active' ? 'text-white bg-white/5' : 'text-white/50'}`}>
            Active {pendingCount > 0 && <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5">{pendingCount}</span>}
          </button>
          <button onClick={() => setView('saved')} className={`flex-1 py-2.5 text-sm font-medium ${view === 'saved' ? 'text-white bg-white/5' : 'text-white/50'}`}>
            Saved Chats
          </button>
          <button onClick={() => setView('ended')} className={`flex-1 py-2.5 text-sm font-medium ${view === 'ended' ? 'text-white bg-white/5' : 'text-white/50'}`}>
            Ended
          </button>
          <button onClick={() => setShowSettings(s => !s)} title="Live Chat settings" className="px-2.5 py-2.5 text-white/50 hover:text-white">
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
        {showSettings && (
          <div className="px-3 py-2.5 border-b border-white/10 bg-white/5">
            <label className="flex items-center justify-between gap-3 text-xs text-white/80">
              <span>Auto full-screen chat on mobile</span>
              <button
                role="switch"
                aria-checked={mobileFullscreen}
                onClick={() => saveMobileFullscreenSetting(!mobileFullscreen)}
                className={`relative w-9 h-5 rounded-full transition-colors ${mobileFullscreen ? 'bg-violet-600' : 'bg-white/20'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${mobileFullscreen ? 'translate-x-4' : ''}`} />
              </button>
            </label>
            <p className="text-[10px] text-white/40 mt-1">When on, opening a chat on your phone takes over the full screen. You can always minimize it with the — button without ending the chat.</p>
          </div>
        )}
        {minimized && selected && (
          <button onClick={() => setMinimized(false)} className="w-full flex items-center justify-between px-3 py-2 bg-violet-600/20 text-violet-200 text-xs">
            <span>Chat with {selected.user_name} is minimized</span>
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex-1 overflow-y-auto">
          {list.map((c: any) => (
            <button key={c.id} onClick={() => selectChat(c)} className={`w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/5 ${selectedId === c.id ? 'bg-white/10' : ''}`}>
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-sm text-white font-medium truncate">{c.user_name}</p>
                {c.user_phone && <span title="Has a contact number on file"><Phone className="w-3 h-3 text-white/30 shrink-0" /></span>}
                {c.status === 'pending' && <span className="text-[10px] bg-amber-500/20 text-amber-300 rounded-full px-1.5 py-0.5 shrink-0">Pending</span>}
                {c.status === 'closed' && <span className="text-[10px] bg-red-500/20 text-red-300 rounded-full px-1.5 py-0.5 shrink-0">Ended</span>}
                {c.history_hidden_from_user && <span title="History hidden from user"><EyeOff className="w-3 h-3 text-white/30 shrink-0" /></span>}
              </div>
              <p className="text-xs text-white/40 truncate">
                {c.status === 'closed' && c.end_reason
                  ? `Ended: "${c.end_reason}"`
                  : (c.messages?.[c.messages.length - 1]?.content || '—')}
              </p>
            </button>
          ))}
          {list.length === 0 && <p className="text-center text-white/30 text-sm py-8">No chats</p>}
        </div>
      </div>

      {/* ── Selected chat ── */}
      <div className={`border border-white/10 rounded-2xl overflow-hidden flex-col flex ${mobileFullscreenActive ? 'h-full' : ''} ${isMobile && minimized ? 'hidden' : ''}`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">Select a chat</div>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
              <button
                onClick={() => setSelectedId(null)}
                title="Back to chat list"
                className="p-2 -ml-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0 flex-1">
                {selected.user_phone ? (
                  <button onClick={() => setShowPhone(v => !v)} className="font-semibold text-white text-sm hover:underline decoration-dotted underline-offset-2 flex items-center gap-1.5 truncate">
                    <span className="truncate">{selected.user_name}</span>
                    <span className="text-[10px] text-white/40 font-normal shrink-0">{showPhone ? '📞 ' + selected.user_phone : '(tap for number)'}</span>
                  </button>
                ) : (
                  <p className="font-semibold text-white text-sm truncate">{selected.user_name}</p>
                )}
                {view === 'active' ? <PresenceBadge info={presence.user} /> : (
                  <span className="text-xs text-white/40">{view === 'saved' ? 'Saved conversation' : 'Ended conversation'}</span>
                )}
              </div>

              {view === 'active' && (
                <div className="relative shrink-0" ref={actionsMenuRef}>
                  <button
                    onClick={() => setActionsMenuOpen(v => !v)}
                    title="More options"
                    className={`p-2 rounded-lg hover:bg-white/10 ${actionsMenuOpen ? 'bg-white/10 text-white' : 'text-white/70 hover:text-white'}`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {actionsMenuOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-60 bg-slate-900 border border-white/10 rounded-xl shadow-2xl py-1 text-sm z-50">
                      <button onClick={() => { call.startCall('audio'); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                        <Phone className="w-4 h-4" /> Audio Call
                      </button>
                      <button onClick={() => { call.startCall('video'); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                        <Video className="w-4 h-4" /> Video Call
                      </button>
                      {selected.status === 'pending' && (
                        <button onClick={() => { approve(selected.id); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-green-600/10 text-green-300 flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4" /> Approve
                        </button>
                      )}
                      <button onClick={() => { openArchive(selected.id); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                        🗂️ <span>View Archive</span>
                      </button>
                      {!selected.archive_access_granted ? (
                        <button onClick={() => { grantArchive(selected.id); setActionsMenuOpen(false) }} title="Approval lasts 10 minutes" className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                          <ArchiveRestore className="w-4 h-4" /> Grant Archive Access
                        </button>
                      ) : null}
                      {selected.history_hidden_from_user ? (
                        <button onClick={() => { unhideHistory(selected.id); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                          <Eye className="w-4 h-4" /> Unhide History
                        </button>
                      ) : (
                        <button onClick={() => { hideHistory(selected.id); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                          <EyeOff className="w-4 h-4" /> Hide History
                        </button>
                      )}
                      <button onClick={() => { setWallpaperPickerOpen(true); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                        🎨 <span>Change Wallpaper</span>
                      </button>
                      <button onClick={() => { setMediaGalleryOpen(true); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                        📷 <span>Chat Media</span>
                      </button>
                      <button onClick={() => { saveChat(selected.id); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                        <Bookmark className="w-4 h-4" /> Save Chat
                      </button>
                      {isMobile && (
                        <button onClick={() => { setMinimized(true); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-white/10 text-white/85 flex items-center gap-2.5">
                          <Minus className="w-4 h-4" /> Minimize
                        </button>
                      )}
                      <div className="border-t border-white/10 my-1" />
                      <button onClick={() => { setConfirmEnd(true); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-red-600/10 text-red-300 flex items-center gap-2.5">
                        <X className="w-4 h-4" /> End Chat
                      </button>
                      <button onClick={() => { setConfirmDelete(true); setActionsMenuOpen(false) }} className="w-full text-left px-3 py-2 hover:bg-red-600/10 text-red-400 flex items-center gap-2.5">
                        <Trash2 className="w-4 h-4" /> Delete Chat
                      </button>
                    </div>
                  )}
                </div>
              )}
              {view === 'saved' && (
                <div className="flex items-center gap-2 shrink-0">
                  <WallpaperPickerButton dark onClick={() => setWallpaperPickerOpen(true)} />
                  <ChatMediaButton dark onClick={() => setMediaGalleryOpen(true)} />
                  <button onClick={() => unsaveChat(selected.id)} className="flex items-center gap-1 text-xs text-white/60 hover:text-white">
                    <BookmarkCheck className="w-3.5 h-3.5" /> Unsave
                  </button>
                  <button onClick={() => setConfirmDelete(true)} title="Delete this chat permanently" className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
              {view === 'ended' && (
                <div className="flex items-center gap-2 shrink-0">
                  <WallpaperPickerButton dark onClick={() => setWallpaperPickerOpen(true)} />
                  <ChatMediaButton dark onClick={() => setMediaGalleryOpen(true)} />
                  <button onClick={() => openArchive(selected.id)} title="View full chat history" className="flex items-center gap-1 text-xs bg-white/10 text-white/80 px-2 py-1 rounded-lg hover:bg-white/20">
                    🗂️ Archive
                  </button>
                  <button onClick={() => setConfirmDelete(true)} title="Delete this chat permanently" className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              )}
            </div>

            {view === 'active' && selected.status === 'closed' && (
              <div className="px-4 py-2 bg-red-600/10 border-b border-white/10 text-xs text-red-200">
                ⛔ This chat was ended by {selected.ended_by_user ? 'the visitor' : 'you'}.
                {selected.end_reason && <span className="italic"> Reason: "{selected.end_reason}"</span>}
              </div>
            )}

            {view === 'active' && selected.archive_requested_at && !selected.archive_access_granted && (
              <div className="flex items-center justify-between gap-2 px-4 py-2 bg-violet-600/10 border-b border-white/10 text-xs">
                <span className="text-violet-200">🗂️ {selected.user_name} requested access to their full chat archive</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => grantArchive(selected.id)} title="Approval lasts 10 minutes" className="bg-green-600/20 text-green-300 px-2 py-1 rounded-lg hover:bg-green-600/30">Approve</button>
                  <button onClick={() => denyArchive(selected.id)} className="bg-white/10 text-white/60 px-2 py-1 rounded-lg hover:bg-white/20">Deny</button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto py-2 relative" style={{ background: activeWallpaper.background, ...(wallpaperCssVars(activeWallpaper) as any) }}>
              {activeWallpaper.live && <LiveWallpaperOverlay type={activeWallpaper.live} />}
              <div className="relative z-10">
              {(() => {
                let lastDay: string | null = null
                const list = (view === 'active' ? currentMessages() : (selected.messages || []))
                return list.map((m: LiveChatMessage) => {
                  const day = chatDayKey(m.created_at)
                  const showSeparator = day !== lastDay
                  lastDay = day
                  return (
                    <div key={m.id} id={`lc-admin-msg-${m.id}`}>
                      {showSeparator && <DateSeparator label={formatDateSeparator(m.created_at)} />}
                      <MessageBubble
                        message={m}
                        isMine={m.role === 'admin'}
                        viewerRole="admin"
                        replyToMessage={m.reply_to_id ? list.find((x: any) => x.id === m.reply_to_id) : null}
                        onReply={setReplyTarget}
                        onEdit={editMessage}
                        onUnsend={unsendMessage}
                        onJumpToReply={jumpToReply}
                        formatTime={fmtTime}
                        onViewMedia={openMedia}
                        onReact={handleReact}
                        onStar={handleStar}
                        onForward={setForwardTarget}
                      />
                    </div>
                  )
                })
              })()}
              {userTyping && <p className="px-4 text-xs text-white/40 italic">{selected.user_name} is typing…</p>}
              <div ref={bottomRef} />
              </div>
            </div>

            {view === 'active' && selected.status !== 'closed' && (
              <div className="p-3 border-t border-white/10">
                {replyTarget && <ReplyPreview message={replyTarget} onCancel={() => setReplyTarget(null)} />}
                <div className="flex items-center gap-1">
                  {voicePhase === 'idle' && <MediaComposer disabled={uploading} onSelect={handleMediaSelect} />}
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
                      onChange={e => handleTyping(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                      placeholder={uploading ? 'Sending media…' : 'Reply…'}
                      className="flex-1 min-w-0 bg-white/5 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-white/40 outline-none"
                    />
                  )}
                  {input.trim() && voicePhase === 'idle' ? (
                    <button onClick={sendReply} className="p-2.5 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-white disabled:opacity-40 shrink-0">
                      <Send className="w-4 h-4" />
                    </button>
                  ) : (
                    <VoiceRecorder disabled={uploading} onSend={handleVoiceSend} onPhaseChange={setVoicePhase} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <MediaViewerModal
        open={viewer.open} loading={viewer.loading} error={viewer.error}
        url={viewer.url} mediaType={viewer.mediaType} viewsRemaining={viewer.viewsRemaining}
        onClose={closeMediaViewer}
      />
      <EndChatConfirm open={confirmEnd} onConfirm={doEndChat} onCancel={() => setConfirmEnd(false)} />
      <DeleteChatConfirm open={confirmDelete} userName={selected?.user_name} onConfirm={doDeleteChat} onCancel={() => setConfirmDelete(false)} />
      <WallpaperPicker dark open={wallpaperPickerOpen} currentId={activeWallpaperId} onSelect={(w) => selected && changeWallpaper(selected.id, w.id)} onClose={() => setWallpaperPickerOpen(false)} />
      <ChatMediaGallery dark open={mediaGalleryOpen} chatId={selectedId} onClose={() => setMediaGalleryOpen(false)} onOpenItem={openGalleryItem} />
      <ForwardPicker
        open={!!forwardTarget}
        chats={chats.map(c => ({ id: c.id, user_name: c.user_name }))}
        excludeChatId={selectedId || undefined}
        onPick={submitForward}
        onClose={() => setForwardTarget(null)}
      />
      <CallModal
        state={call.state} callType={call.callType} peerName={selected?.user_name || 'Visitor'} error={call.error}
        localVideoEl={call.localVideoEl} remoteVideoEl={call.remoteVideoEl} remoteAudioEl={call.remoteAudioEl}
        localMuted={call.localMuted} localVideoOff={call.localVideoOff} speakerOn={call.speakerOn} duration={call.duration}
        onAccept={call.acceptCall} onReject={call.rejectCall} onEnd={call.endCall}
        onToggleMute={call.toggleMute} onToggleVideo={call.toggleVideo} onToggleSpeaker={call.toggleSpeaker}
        videoFilter={call.videoFilter} videoFilterOptions={call.videoFilterOptions} onSetVideoFilter={call.applyVideoFilter}
        proximitySupported={call.proximitySupported} screenDimmed={call.screenDimmed} onDismissScreenDim={call.dismissScreenDim}
        minimized={call.minimized} onToggleMinimize={call.toggleMinimize}
        pipSupported={call.pipSupported} pipActive={call.pipActive} onRequestPiP={call.requestPiP}
      />

      {archiveOpen && (
        <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={() => setArchiveOpen(false)}>
          <div className="w-full max-w-md max-h-[80vh] bg-slate-900 rounded-2xl border border-white/10 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="font-semibold text-sm text-white">Full Chat Archive{selected ? ` — ${selected.user_name}` : ''}</p>
              <button onClick={() => setArchiveOpen(false)} className="text-white/60 hover:text-white p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {archiveLoading ? (
                <div className="text-center text-sm text-white/40 px-6 py-8">Loading full history…</div>
              ) : archiveMessages.length === 0 ? (
                <div className="text-center text-sm text-white/40 px-6 py-8">No messages found.</div>
              ) : (
                (() => {
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
                          isMine={m.role === 'admin'}
                          viewerRole="admin"
                          replyToMessage={m.reply_to_id ? archiveMessages.find(x => x.id === m.reply_to_id) : null}
                          onReply={() => {}}
                          onEdit={() => {}}
                          onUnsend={() => {}}
                          onJumpToReply={() => {}}
                          formatTime={fmtTime}
                          onViewMedia={openMedia}
                          onForward={setForwardTarget}
                        />
                      </div>
                    )
                  })
                })()
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
