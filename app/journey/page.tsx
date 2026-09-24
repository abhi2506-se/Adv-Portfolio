'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import {
  ArrowLeft, MapPin, Calendar, Tag, Play, Music, Image as ImageIcon,
  FileText, Award, ChevronLeft, ChevronRight, X, Download,
  Volume2, VolumeX, Grid3X3, Layers, Heart, ZoomIn,
  MessageCircle, Send, Trash2, RefreshCw, Edit3, Check,
  Sparkles, Loader2, UserPlus, Users, Share2, Copy, CheckCheck, CheckCircle,
  Instagram, Twitter, Facebook, Link2, Plus, Lock,
} from 'lucide-react'
import { useJourneyData } from '@/hooks/useJourneyData'
import { useScrollLock } from '@/hooks/use-scroll-lock'
import { openAuthModal } from '@/components/first-visit-terms'
import {
  getMediaUrl, isVideoId, type BlogPost, type Certificate,
  getJourneyProfile, type JourneyProfile,
  getLikes, toggleLike, addComment, deleteComment, type LikeData, type Comment,
  getStories, type JourneyStory,
  getFollowStatus, followAdmin, unfollowAdmin, getDeviceFingerprint,
} from '@/lib/journey-store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Media protection wrapper ─────────────────────────────────────────────────
// Prevents right-click save, drag-to-download on all media inside.
function ProtectedMedia({ children }: { children: React.ReactNode }) {
  const block = (e: React.SyntheticEvent) => e.preventDefault()
  return (
    <div
      onContextMenu={block}
      onDragStart={block}
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      className="w-full h-full"
    >
      {children}
    </div>
  )
}

// ─── Abhigram Splash Screen ───────────────────────────────────────────────────
function AbhigramSplash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-gradient-to-br from-rose-600 via-orange-500 to-yellow-400"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.08 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Bokeh orbs */}
      {[...Array(6)].map((_, i) => (
        <motion.div key={i} className="absolute rounded-full bg-white/10"
          style={{
            width: 80 + i * 50, height: 80 + i * 50,
            left: `${10 + i * 14}%`, top: `${5 + i * 12}%`,
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      <motion.div className="flex flex-col items-center gap-4 relative z-10"
        initial={{ opacity: 0, scale: 0.4, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}>

        {/* Logo ring */}
        <div className="relative">
          <motion.div
            className="w-24 h-24 rounded-[30px] bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl border border-white/30"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
            <span className="text-4xl font-black text-white tracking-tighter">A</span>
          </motion.div>
          {/* Sparkle dots */}
          {[0, 72, 144, 216, 288].map((deg, i) => (
            <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-white"
              style={{
                top: `calc(50% + ${Math.sin(deg * Math.PI / 180) * 52}px - 4px)`,
                left: `calc(50% + ${Math.cos(deg * Math.PI / 180) * 52}px - 4px)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.4, 0], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, delay: 0.4 + i * 0.1, repeat: Infinity, repeatDelay: 0.8 }}
            />
          ))}
        </div>

        <motion.div className="text-center"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}>
          <h1 className="text-3xl font-black text-white tracking-tight">Abhigram</h1>
          <p className="text-white/70 text-sm mt-1 font-medium">My Journey · My Story ✨</p>
        </motion.div>
      </motion.div>

      {/* Bottom loader bar */}
      <motion.div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40 h-0.5 bg-white/20 rounded-full overflow-hidden">
        <motion.div className="h-full bg-white rounded-full"
          initial={{ width: 0 }} animate={{ width: '100%' }}
          transition={{ duration: 1.9, ease: 'easeInOut' }} />
      </motion.div>
    </motion.div>
  )
}

// ─── Media thumbnail ──────────────────────────────────────────────────────────
function MediaThumbnail({ mediaId, type, className }: {
  mediaId: string; type: 'image' | 'video' | 'audio'; className?: string
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { getMediaUrl(mediaId).then(u => setUrl(u)) }, [mediaId])

  if (!url) return (
    <div className={`bg-muted flex items-center justify-center ${className}`}>
      <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
    </div>
  )
  if (type === 'video') return (
    <ProtectedMedia>
      <video src={url} className={className} muted playsInline preload="metadata"
        onMouseOver={e => (e.currentTarget as HTMLVideoElement).play?.()}
        onMouseOut={e => { const v = e.currentTarget as HTMLVideoElement; v.pause?.(); v.currentTime = 0 }}
        controlsList="nodownload" />
    </ProtectedMedia>
  )
  return (
    <ProtectedMedia>
      <img src={url} alt="" className={className} loading="lazy" draggable={false} />
    </ProtectedMedia>
  )
}

// ─── Full media viewer (protected) ───────────────────────────────────────────
function FullMediaViewer({ mediaId, type, videoRef }: {
  mediaId: string; type: 'image' | 'video'; videoRef?: React.RefObject<HTMLVideoElement>
}) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { getMediaUrl(mediaId).then(u => setUrl(u)) }, [mediaId])

  if (!url) return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )
  if (type === 'video') return (
    <ProtectedMedia>
      <video ref={videoRef} src={url} className="w-full h-full object-contain"
        controls autoPlay loop playsInline
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        onContextMenu={e => e.preventDefault()}
        style={{ pointerEvents: 'auto' }}
      />
    </ProtectedMedia>
  )
  return (
    <ProtectedMedia>
      <img src={url} alt="" className="w-full h-full object-contain" draggable={false} />
    </ProtectedMedia>
  )
}

// ─── Audio player — below location, NOT on image ─────────────────────────────
function SongInfo({ audioId, audioName, startTime = 0, endTime, videoRef }: {
  audioId: string
  audioName?: string
  startTime?: number
  endTime?: number
  videoRef?: React.RefObject<HTMLVideoElement>
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioId.startsWith('http')) { setUrl(audioId); return }
    getMediaUrl(audioId).then(u => setUrl(u))
  }, [audioId])

  useEffect(() => {
    const aud = audioRef.current
    if (!aud || !url) return
    aud.src = url
    aud.currentTime = startTime
    aud.play().then(() => setPlaying(true)).catch(() => {})
  }, [url, startTime])

  useEffect(() => {
    const aud = audioRef.current
    if (!aud || !endTime) return
    const check = () => { if (aud.currentTime >= endTime) aud.currentTime = startTime }
    aud.addEventListener('timeupdate', check)
    return () => aud.removeEventListener('timeupdate', check)
  }, [startTime, endTime])

  useEffect(() => {
    const vid = videoRef?.current
    const aud = audioRef.current
    if (!vid || !aud) return
    const onPlay = () => { aud.currentTime = startTime; aud.play().then(() => setPlaying(true)).catch(() => {}) }
    const onPause = () => { aud.pause(); setPlaying(false) }
    vid.addEventListener('play', onPlay); vid.addEventListener('pause', onPause)
    return () => { vid.removeEventListener('play', onPlay); vid.removeEventListener('pause', onPause) }
  }, [videoRef, url, startTime])

  const toggleMute = () => {
    if (!audioRef.current) return
    audioRef.current.muted = !muted
    setMuted(!muted)
  }

  const [songName, artistName] = audioName
    ? audioName.includes(' — ')
      ? audioName.split(' — ')
      : [audioName, '']
    : ['Unknown Song', '']

  return (
    <div className="flex items-center gap-2.5 py-1">
      <audio ref={audioRef} style={{ display: 'none' }} loop={!endTime} />
      {/* Animated equalizer bars */}
      <div className="flex items-end gap-[2px] h-4 flex-shrink-0">
        {[0, 1, 2, 3].map(i => (
          <motion.div key={i}
            className={`w-[2px] rounded-full ${playing ? 'bg-rose-500' : 'bg-muted-foreground/40'}`}
            animate={playing ? {
              height: ['4px', `${8 + i * 4}px`, '4px'],
            } : { height: '4px' }}
            transition={{ duration: 0.5 + i * 0.1, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
          />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{songName}</p>
        {artistName && <p className="text-[10px] text-muted-foreground truncate">{artistName}</p>}
      </div>
      <button onClick={toggleMute}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
        {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

// ─── Double-tap heart animation ───────────────────────────────────────────────
function HeartBurst({ x, y }: { x: number; y: number }) {
  return (
    <motion.div className="fixed pointer-events-none z-[9999] flex items-center justify-center"
      style={{ left: x - 44, top: y - 44, width: 88, height: 88 }}
      initial={{ opacity: 1, scale: 0.3 }}
      animate={{ opacity: 0, scale: 1.4 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}>
      <Heart className="w-20 h-20 text-rose-500 fill-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
    </motion.div>
  )
}

// ─── Likes & Comments Panel ───────────────────────────────────────────────────
function LikesComments({ postId, onDoubleTapLiked }: {
  postId: string
  onDoubleTapLiked?: boolean  // parent signals double-tap
}) {
  const [likeData, setLikeData] = useState<LikeData>({ count: 0, comments: [] })
  const [liked, setLiked] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorEmail, setAuthorEmail] = useState('')
  const [authorError, setAuthorError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Track which comment IDs this device has posted
  const [myCommentIds, setMyCommentIds] = useState<string[]>([])

  const AUTHOR_KEY = '__journey_commenter_name'
  const EMAIL_KEY = '__journey_commenter_email'
  const MY_COMMENTS_KEY = `__my_comments_${postId}`

  useEffect(() => {
    getLikes(postId).then(d => setLikeData(d))
    const key = `liked_${postId}`
    if (typeof window !== 'undefined') {
      setLiked(localStorage.getItem(key) === '1')
      // Prefer logged-in user session data over previously saved commenter name
      try {
        const session = localStorage.getItem('portfolio_user_session_v1')
        if (session) {
          const u = JSON.parse(session)
          if (u?.id && u?.email) {
            const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
            if (fullName) setAuthorName(fullName)
            if (u.email) setAuthorEmail(u.email)
            const savedIds = JSON.parse(localStorage.getItem(MY_COMMENTS_KEY) || '[]')
            setMyCommentIds(savedIds)
            return
          }
        }
      } catch {}
      // Fallback to previously saved commenter name
      const savedName = localStorage.getItem(AUTHOR_KEY) || ''
      if (savedName) setAuthorName(savedName)
      const savedEmail = localStorage.getItem(EMAIL_KEY) || ''
      if (savedEmail) setAuthorEmail(savedEmail)
      const savedIds = JSON.parse(localStorage.getItem(MY_COMMENTS_KEY) || '[]')
      setMyCommentIds(savedIds)
    }
  }, [postId])

  // React to double-tap signal from parent
  useEffect(() => {
    if (onDoubleTapLiked && !liked) handleLike()
  }, [onDoubleTapLiked]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLike = async () => {
    // Require login to like
    try {
      const raw = localStorage.getItem('portfolio_user_session_v1')
      const u = raw ? JSON.parse(raw) : null
      if (!u?.id) { openAuthModal('landing'); return }
    } catch { openAuthModal('landing'); return }
    if (liked) return
    const key = `liked_${postId}`
    setLiked(true)
    localStorage.setItem(key, '1')
    setLikeData(prev => ({ ...prev, count: prev.count + 1 }))
    try {
      const updated = await toggleLike(postId)
      setLikeData(updated)
    } catch {}
  }

  const handleComment = async () => {
    // Require login to comment
    try {
      const raw = localStorage.getItem('portfolio_user_session_v1')
      const u = raw ? JSON.parse(raw) : null
      if (!u?.id) { openAuthModal('landing'); return }
    } catch { openAuthModal('landing'); return }
    if (!authorName.trim()) { setAuthorError(true); inputRef.current?.focus(); return }
    if (!commentText.trim()) return
    setAuthorError(false)
    setSubmitting(true)
    localStorage.setItem(AUTHOR_KEY, authorName.trim())
    if (authorEmail.trim()) localStorage.setItem(EMAIL_KEY, authorEmail.trim())
    try {
      // Call API with email so admin reply can notify user
      const res = await fetch('/api/journey/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'comment', author: authorName.trim(), text: commentText.trim(), email: authorEmail.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      const updated = await res.json()
      setLikeData(updated)
      const newComment = updated.comments[updated.comments.length - 1]
      if (newComment) {
        const ids = [...myCommentIds, newComment.id]
        setMyCommentIds(ids)
        localStorage.setItem(MY_COMMENTS_KEY, JSON.stringify(ids))
      }
      setCommentText('')
    } catch {} finally { setSubmitting(false) }
  }

  const handleDeleteComment = async (commentId: string, isMyComment: boolean) => {
    if (!isMyComment) return // only owner can delete
    try {
      const updated = await deleteComment(postId, commentId)
      setLikeData(updated)
      const ids = myCommentIds.filter(id => id !== commentId)
      setMyCommentIds(ids)
      localStorage.setItem(MY_COMMENTS_KEY, JSON.stringify(ids))
    } catch {}
  }

  return (
    <div className="space-y-0">
      {/* Action bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-white/10">
        <motion.button onClick={handleLike}
          whileTap={{ scale: 1.35 }}
          title={liked ? 'Liked' : 'Like this post (login required)'}
          className={`flex items-center gap-1.5 transition-all ${liked ? 'text-rose-500' : 'text-white/60 hover:text-rose-400'}`}>
          <Heart className={`w-5 h-5 transition-all ${liked ? 'fill-rose-500 scale-110' : ''}`} />
          <span className="text-sm font-semibold">{likeData.count}</span>
        </motion.button>

        <button onClick={() => { setShowComments(!showComments); setTimeout(() => inputRef.current?.focus(), 200) }}
          title="Comment (login required)"
          className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">{likeData.comments.length}</span>
        </button>

        <span className="ml-auto text-[10px] text-white/25 flex items-center gap-1">
          <Lock className="w-2.5 h-2.5" /> Login to like &amp; comment
        </span>
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden px-4 pb-4 space-y-3">
            {/* Comment list */}
            {likeData.comments.length > 0 && (
              <div className="space-y-2.5 max-h-72 overflow-y-auto">
                {likeData.comments.map((c: any) => {
                  const isMyComment = myCommentIds.includes(c.id)
                  return (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 group flex-col">
                      <div className="flex items-start gap-2.5 w-full">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                          {c.author[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0 bg-white/5 rounded-2xl px-3 py-2">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-white/90">{c.author}</span>
                            <span className="text-[10px] text-white/35">{relativeTime(c.createdAt)}</span>
                            {isMyComment && <span className="text-[9px] text-blue-400/70 ml-auto">you</span>}
                          </div>
                          <p className="text-xs text-white/65 break-words leading-relaxed">{c.text}</p>
                        </div>
                        {isMyComment && (
                          <button onClick={() => handleDeleteComment(c.id, isMyComment)}
                            className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-all flex-shrink-0 mt-1.5"
                            title="Delete your comment">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {/* Admin reply */}
                      {c.adminReply && (
                        <div className="ml-9 w-full bg-emerald-950/40 border border-emerald-500/20 rounded-xl px-3 py-2">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold text-emerald-400">↩ Abhishek replied</span>
                            <span className="text-[9px] text-white/30">{relativeTime(c.adminRepliedAt)}</span>
                          </div>
                          <p className="text-xs text-emerald-100/80 leading-relaxed">{c.adminReply}</p>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            )}

            {likeData.comments.length === 0 && (
              <p className="text-[11px] text-white/30 text-center py-1">Be the first to comment!</p>
            )}

            {/* Add comment form */}
            <div className="space-y-2 pt-1">
              {/* When logged in: name auto-shown as badge, email hidden (used only for reply notifications) */}
              {authorName && authorEmail ? (
                <div className="flex items-center gap-1.5 text-[10px] text-rose-300 bg-rose-500/10 rounded-lg px-2.5 py-1.5 border border-rose-500/20">
                  <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
                  Commenting as <strong className="text-white/80">{authorName}</strong>
                </div>
              ) : (
                <div className="relative">
                  <input value={authorName} onChange={e => { setAuthorName(e.target.value); setAuthorError(false) }}
                    placeholder="Your name *"
                    className={`w-full bg-white/5 border rounded-xl px-3 py-2 text-xs text-white/80 placeholder-white/30 focus:outline-none transition-colors
                      ${authorError ? 'border-rose-500/60 bg-rose-500/5' : 'border-white/10 focus:border-white/30'}`} />
                  {authorError && (
                    <p className="text-[10px] text-rose-400 mt-0.5 ml-1">Name is required to comment</p>
                  )}
                </div>
              )}
              {/* Email field: only show if user isn't logged in (email auto-fetched for reply notifications) */}
              {!(authorName && authorEmail) && (
                <input value={authorEmail} onChange={e => setAuthorEmail(e.target.value)}
                  placeholder="Email (optional – get notified of replies)"
                  type="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-white/30" />
              )}
              <div className="flex gap-2">
                <input ref={inputRef} value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment() } }}
                  placeholder="Write a comment…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 placeholder-white/30 focus:outline-none focus:border-white/30" />
                <motion.button onClick={handleComment}
                  disabled={!commentText.trim() || submitting} whileTap={{ scale: 0.92 }}
                  className="w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-400 disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-colors">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Certificate Viewer ───────────────────────────────────────────────────────
function CertificateViewer({ cert, onClose }: { cert: Certificate; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => { getMediaUrl(cert.mediaId).then(u => setUrl(u)) }, [cert.mediaId])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-white text-base sm:text-lg truncate">{cert.title}</h2>
          <p className="text-white/50 text-xs sm:text-sm">{cert.issuer} · {cert.date}</p>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors ml-3 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 min-h-0 p-3 sm:p-4">
        {!url ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : cert.fileType === 'pdf' ? (
          <iframe src={url} className="w-full h-full rounded-xl border border-white/10" title={cert.title} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ProtectedMedia>
              <img src={url} alt={cert.title} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" draggable={false} />
            </ProtectedMedia>
          </div>
        )}
      </div>
      <div className="border-t border-white/10 flex-shrink-0">
        <LikesComments postId={`cert_${cert.id}`} />
        {cert.description && <div className="px-5 pb-4"><p className="text-white/60 text-sm">{cert.description}</p></div>}
      </div>
    </motion.div>
  )
}

// ─── Blog Lightbox ────────────────────────────────────────────────────────────
function BlogLightbox({ post, onClose, onPrev, onNext }: {
  post: BlogPost; onClose: () => void; onPrev?: () => void; onNext?: () => void
}) {
  const [mediaIndex, setMediaIndex] = useState(0)
  const [heartBurst, setHeartBurst] = useState<{ x: number; y: number; key: number } | null>(null)
  const [doubleTapLiked, setDoubleTapLiked] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastTapRef = useRef<number>(0)
  const touchStartXRef = useRef<number | null>(null)
  const hasMedia = post.mediaIds.length > 0
  const currentId = post.mediaIds[mediaIndex]
  const isVideo = (id: string) => isVideoId(id)

  // Double-tap detection only — single tap does nothing
  const handleMediaTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't fire on touch — handled by onTouchEnd separately
    if (e.type === 'click') {
      const now = Date.now()
      const gap = now - lastTapRef.current
      if (gap < 350 && gap > 0) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const clientX = (e as React.MouseEvent).clientX
        const clientY = (e as React.MouseEvent).clientY
        setHeartBurst({ x: clientX, y: clientY, key: now })
        setDoubleTapLiked(true)
        setTimeout(() => setDoubleTapLiked(false), 100)
      }
      lastTapRef.current = now
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const now = Date.now()
    const gap = now - lastTapRef.current
    if (gap < 350 && gap > 0) {
      const touch = e.changedTouches[0]
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const clientX = touch?.clientX ?? rect.left + rect.width / 2
      const clientY = touch?.clientY ?? rect.top + rect.height / 2
      setHeartBurst({ x: clientX, y: clientY, key: now })
      setDoubleTapLiked(true)
      setTimeout(() => setDoubleTapLiked(false), 100)
    }
    lastTapRef.current = now
  }

  // Swipe handlers for multi-image navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
  }

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || post.mediaIds.length <= 1) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartXRef.current
    if (Math.abs(dx) > 40) {
      if (dx < 0) setMediaIndex(i => Math.min(post.mediaIds.length - 1, i + 1))
      else setMediaIndex(i => Math.max(0, i - 1))
    }
    touchStartXRef.current = null
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/98 flex flex-col md:flex-row">

      {/* Heart burst overlay */}
      <AnimatePresence>
        {heartBurst && (
          <HeartBurst key={heartBurst.key} x={heartBurst.x} y={heartBurst.y} />
        )}
      </AnimatePresence>

      {/* Media side */}
      <div
        className="relative flex-1 min-h-0 bg-black flex items-center justify-center select-none"
        style={{ minHeight: '50vh' }}
        onClick={handleMediaTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={e => { handleTouchEnd(e); handleSwipeEnd(e) }}
      >
        {onPrev && (
          <button onClick={e => { e.stopPropagation(); onPrev() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {onNext && (
          <button onClick={e => { e.stopPropagation(); onNext() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onClose() }}
          className="absolute top-3 left-3 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80 transition-colors">
          <X className="w-4 h-4" />
        </button>

        {hasMedia ? (
          <div className="w-full h-full relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div key={currentId} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full h-full">
                <FullMediaViewer mediaId={currentId}
                  type={isVideo(currentId) ? 'video' : 'image'}
                  videoRef={isVideo(currentId) ? videoRef : undefined} />
              </motion.div>
            </AnimatePresence>

            {/* Multi-media dots */}
            {post.mediaIds.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {post.mediaIds.map((_, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setMediaIndex(i) }}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${i === mediaIndex ? 'bg-white scale-125' : 'bg-white/40'}`} />
                ))}
              </div>
            )}
            {/* Arrow buttons for multi-image (desktop) */}
            {post.mediaIds.length > 1 && (
              <>
                <button onClick={e => { e.stopPropagation(); setMediaIndex(i => Math.max(0, i - 1)) }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/80 z-10 hidden sm:flex"
                  disabled={mediaIndex === 0}><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={e => { e.stopPropagation(); setMediaIndex(i => Math.min(post.mediaIds.length - 1, i + 1)) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white disabled:opacity-30 hover:bg-black/80 z-10 hidden sm:flex"
                  disabled={mediaIndex === post.mediaIds.length - 1}><ChevronRight className="w-4 h-4" /></button>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/30">
            <ImageIcon className="w-14 h-14" /><p>No media</p>
          </div>
        )}
      </div>

      {/* Details side */}
      <div className="w-full md:w-[400px] bg-zinc-950 flex flex-col border-t md:border-t-0 md:border-l border-white/10 overflow-hidden max-h-[50vh] md:max-h-none">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs">AS</div>
            <div>
              <p className="font-semibold text-white text-sm">Abhishek Singh</p>
              {post.location && (
                <div className="flex items-center gap-1 text-white/50 text-xs">
                  <MapPin className="w-2.5 h-2.5" />{post.location}
                </div>
              )}
              {/* Song info below location — NOT on image */}
              {post.audioId && (
                <SongInfo audioId={post.audioId} audioName={post.audioName}
                  startTime={post.audioStartTime} endTime={post.audioEndTime}
                  videoRef={isVideo(currentId) ? videoRef : undefined} />
              )}
            </div>
          </div>
          <button onClick={onClose} className="hidden md:flex w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {/* AI Caption — shown prominently if present */}
          {post.caption && (
            <div className="bg-gradient-to-br from-rose-500/8 to-orange-500/5 border border-rose-500/15 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3 h-3 text-rose-400" />
                <span className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider">Caption</span>
              </div>
              <p className="text-white/80 text-sm leading-relaxed">{post.caption}</p>
            </div>
          )}

          <div>
            <h2 className="text-white font-bold text-base leading-tight mb-1.5">{post.title}</h2>
            <p className="text-white/65 leading-relaxed text-sm">{post.description}</p>
          </div>

          {post.experience && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">✨ What I Experienced</p>
              <p className="text-white/75 text-sm leading-relaxed">{post.experience}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {post.tags.map(tag => (
              <span key={tag} className="text-xs px-2.5 py-1 bg-rose-500/15 text-rose-300 rounded-full border border-rose-500/20">#{tag}</span>
            ))}
          </div>

          <div className="flex items-center gap-1 text-white/35 text-xs">
            <Calendar className="w-3 h-3" />
            {new Date(post.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Likes & Comments */}
        <div className="flex-shrink-0 border-t border-white/10">
          <LikesComments postId={post.id} onDoubleTapLiked={doubleTapLiked} />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Blog Grid Card ───────────────────────────────────────────────────────────
function BlogCard({ post, onClick }: { post: BlogPost; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const hasVideo = post.mediaIds.some(id => isVideoId(id))
  const hasAudio = !!post.audioId

  useEffect(() => { getLikes(post.id).then(d => setLikeCount(d.count)) }, [post.id])

  return (
    <motion.div whileHover={{ scale: 1.015 }} transition={{ duration: 0.15 }}
      onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      className="relative aspect-square cursor-pointer overflow-hidden bg-muted rounded-sm">
      {post.coverMediaId ? (
        <ProtectedMedia>
          <MediaThumbnail mediaId={post.coverMediaId}
            type={isVideoId(post.coverMediaId) ? 'video' : 'image'}
            className="w-full h-full object-cover" />
        </ProtectedMedia>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/60">
          <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
        </div>
      )}

      {/* Badges */}
      <div className="absolute top-2 right-2 flex gap-1">
        {hasVideo && <div className="w-5 h-5 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"><Play className="w-2.5 h-2.5 text-white fill-white" /></div>}
        {hasAudio && <div className="w-5 h-5 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"><Music className="w-2.5 h-2.5 text-white" /></div>}
        {post.mediaIds.length > 1 && <div className="w-5 h-5 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"><Layers className="w-2.5 h-2.5 text-white" /></div>}
      </div>

      {likeCount > 0 && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur rounded-full px-1.5 py-0.5">
          <Heart className="w-2.5 h-2.5 text-rose-400 fill-rose-400" />
          <span className="text-xs text-white/80">{likeCount}</span>
        </div>
      )}

      <AnimatePresence>
        {hovered && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 p-3">
            <Lock className="w-5 h-5 text-white/60" />
            <p className="text-white font-bold text-sm text-center line-clamp-2">{post.title}</p>
            {post.location && (
              <div className="flex items-center gap-1 text-white/70 text-xs">
                <MapPin className="w-3 h-3" />{post.location}
              </div>
            )}
            <p className="text-white/50 text-[10px] mt-0.5">Login to view</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Certificate Card ─────────────────────────────────────────────────────────
function CertCard({ cert, onClick }: { cert: Certificate; onClick: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [likeData, setLikeData] = useState<LikeData>({ count: 0, comments: [] })

  useEffect(() => {
    if (cert.fileType !== 'image') return
    getMediaUrl(cert.mediaId).then(u => setUrl(u))
  }, [cert.mediaId, cert.fileType])

  useEffect(() => { getLikes(`cert_${cert.id}`).then(d => setLikeData(d)) }, [cert.id])

  const GRADIENTS: Record<string, string> = {
    'Cloud': 'from-blue-600 to-cyan-500', 'Web Dev': 'from-violet-600 to-purple-500',
    'AI/ML': 'from-rose-500 to-orange-500', 'DevOps': 'from-green-600 to-teal-500',
    'Data Science': 'from-yellow-500 to-orange-600', 'default': 'from-slate-600 to-slate-500',
  }
  const gradient = GRADIENTS[cert.category] ?? GRADIENTS['default']

  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.15 }}
      className="relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card group">
      <div onClick={onClick} className="relative h-44 sm:h-52 overflow-hidden">
        {cert.fileType === 'image' && url ? (
          <ProtectedMedia><img src={url} alt={cert.title} className="w-full h-full object-cover" draggable={false} /></ProtectedMedia>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <FileText className="w-14 h-14 text-white/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute top-2.5 right-2.5">
          <span className="text-xs px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white/80 border border-white/10">{cert.fileType.toUpperCase()}</span>
        </div>
        <ZoomIn className="absolute top-2.5 left-2.5 w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
      </div>
      <div className="p-3.5">
        <p className="font-bold text-foreground text-sm mb-0.5 line-clamp-2">{cert.title}</p>
        <p className="text-muted-foreground text-xs mb-2.5">{cert.issuer}</p>
        <div className="flex items-center justify-between mb-2.5">
          <span className={`text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient} text-white font-medium`}>{cert.category || 'Certificate'}</span>
          <span className="text-muted-foreground text-xs">{cert.date}</span>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Heart className={`w-3.5 h-3.5 ${likeData.count > 0 ? 'text-rose-400 fill-rose-400' : ''}`} /><span>{likeData.count}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MessageCircle className="w-3.5 h-3.5" /><span>{likeData.comments.length}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Share Profile Modal ────────────────────────────────────────────────────
function ShareProfileModal({ onClose, profileName }: { onClose: () => void; profileName: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href : ''

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const share = (platform: string) => {
    const text = `Check out ${profileName}'s Journey on Abhigram! 🚀`
    const encoded = encodeURIComponent(url)
    const encodedText = encodeURIComponent(text)
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encoded}`,
      instagram: url, // Instagram doesn't support direct web share; copy link instead
    }
    if (platform === 'instagram') { copy(); return }
    window.open(urls[platform], '_blank', 'width=600,height=400')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-background border border-border rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-base">Share Profile</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {/* Social buttons */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { id: 'twitter', label: 'Twitter', bg: 'bg-sky-500', icon: <Twitter className="w-5 h-5 text-white" /> },
              { id: 'facebook', label: 'Facebook', bg: 'bg-blue-600', icon: <Facebook className="w-5 h-5 text-white" /> },
              { id: 'whatsapp', label: 'WhatsApp', bg: 'bg-green-500', icon: <MessageCircle className="w-5 h-5 text-white" /> },
              { id: 'instagram', label: 'Instagram', bg: 'bg-gradient-to-br from-rose-500 to-orange-400', icon: <Instagram className="w-5 h-5 text-white" /> },
            ].map(p => (
              <button key={p.id} onClick={() => share(p.id)} className="flex flex-col items-center gap-1.5">
                <div className={`w-12 h-12 rounded-2xl ${p.bg} flex items-center justify-center shadow-sm`}>{p.icon}</div>
                <span className="text-[10px] text-muted-foreground">{p.label}</span>
              </button>
            ))}
          </div>
          {/* Link copy */}
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5">
            <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground flex-1 truncate">{url}</span>
            <button onClick={copy} className="flex items-center gap-1 text-xs font-medium text-foreground hover:text-rose-500 transition-colors flex-shrink-0">
              {copied ? <><CheckCheck className="w-3.5 h-3.5 text-green-500" /><span className="text-green-500">Copied!</span></> : <><Copy className="w-3.5 h-3.5" />Copy</>}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Instagram-style Story Ring ──────────────────────────────────────────────
function StoryRing({ onClick }: { onClick: () => void }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 via-orange-500 to-yellow-400 p-0.5 shadow-md">
        <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
          <Instagram className="w-7 h-7 text-rose-400" />
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground truncate max-w-[64px]">Story</span>
    </motion.button>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function JourneyPage() {
  const router = useRouter()
  const { blogs, certificates, loading } = useJourneyData()
  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === "undefined") return false
    if (sessionStorage.getItem("abhigram_splash_seen")) return false
    return true
  })
  const [activeTab,  setActiveTab]      = useState<'blogs'>('blogs')
  const [activeBlog, setActiveBlog]     = useState<number | null>(null)
  // activeCert removed — certs moved to main portfolio section
  const [mounted,    setMounted]        = useState(false)
  const [profile,    setProfile]        = useState<JourneyProfile | null>(null)
  const [showShare,  setShowShare]      = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [isFollowing, setIsFollowing]  = useState(false)
  const [showFollowModal, setShowFollowModal] = useState(false)
  const [stories, setStories] = useState<JourneyStory[]>([])
  const [activeStory, setActiveStory] = useState<JourneyStory | null>(null)
  const [userSession, setUserSession] = useState<{ id: string; first_name?: string; email: string } | null>(null)
  const followingCount = profile?.followingCount ?? 318

  // Helper: require login before action
  const requireLogin = (then: () => void) => {
    try {
      const raw = localStorage.getItem('portfolio_user_session_v1')
      if (raw) { const u = JSON.parse(raw); if (u?.id && u?.email) { then(); return } }
    } catch {}
    openAuthModal('landing')
  }

  // Lock body scroll when any modal/overlay is open
  useScrollLock(!!(activeBlog !== null || showShare || showFollowModal || activeStory))

  useEffect(() => {
    setMounted(true)
    getJourneyProfile().then(p => setProfile(p))
    getStories().then(s => setStories(s))
    // Load session
    try {
      const raw = localStorage.getItem('portfolio_user_session_v1')
      if (raw) { const u = JSON.parse(raw); if (u?.id && u?.email) setUserSession(u) }
    } catch {}
    const onLogin = (e: Event) => { const d = (e as CustomEvent).detail; if (d) setUserSession(d) }
    const onLogout = () => setUserSession(null)
    window.addEventListener('portfolio_login', onLogin)
    window.addEventListener('portfolio_logout', onLogout)
    return () => {
      window.removeEventListener('portfolio_login', onLogin)
      window.removeEventListener('portfolio_logout', onLogout)
    }
    const fp = getDeviceFingerprint()
    getFollowStatus(fp).then(d => {
      setFollowersCount(d.count)
      setIsFollowing(d.isFollowing)
    })
  }, [])

  if (!mounted) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
    </div>
  )

  const activeBlogPost = activeBlog !== null ? blogs[activeBlog] : null
  const profileName = profile?.name || 'Abhishek Singh'
  const profileInitials = profileName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const totalPosts = blogs.length

  return (
    <>
      {/* Abhigram Splash */}
      <AnimatePresence>
        {showSplash && <AbhigramSplash onDone={() => { setShowSplash(false); sessionStorage.setItem("abhigram_splash_seen", "1") }} />}
      </AnimatePresence>

      <div className="min-h-screen bg-background text-foreground">
        {/* Nav */}
        <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 h-13 sm:h-14 flex items-center gap-3">
            <button onClick={() => router.push('/')}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-base sm:text-lg tracking-tight truncate flex items-center gap-1.5">
                Abhigram
                <span className="text-[10px] font-medium text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded-full">Journey</span>
              </h1>
            </div>
            <div className="flex bg-secondary rounded-full p-0.5 sm:p-1 gap-0.5 sm:gap-1">
              <button onClick={() => setActiveTab('blogs')}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${activeTab === 'blogs' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>
                <Grid3X3 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span>Posts</span>
                {blogs.length > 0 && <span className="text-xs opacity-60">({blogs.length})</span>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Instagram-style Profile Section ── */}
        <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-5 pb-3">
          {/* Top row: avatar + stats */}
          <div className="flex items-center gap-5 sm:gap-8 mb-3">
            {/* Avatar with story ring */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-rose-500 via-orange-500 to-yellow-500 p-0.5">
                <div className="w-full h-full rounded-full bg-background overflow-hidden">
                  {profile?.journeyProfileUrl
                    ? <img src={profile.journeyProfileUrl} alt="Profile" className="w-full h-full object-cover" draggable={false} />
                    : <div className="w-full h-full flex items-center justify-center"><span className="font-bold text-2xl">{profileInitials}</span></div>}
                </div>
              </div>
            </div>

            {/* Name + Stats */}
            <div className="flex-1 min-w-0">
              {/* Name appears ABOVE followers/following */}
              <h2 className="font-bold text-sm sm:text-base flex items-center gap-1.5 mb-3">
                {profileName}
                {profile?.blueTick && (
                  /* Instagram-style blue verified tick */
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L13.8 5.4L17.6 4.2L16.8 8.1L20.4 9.9L18 13L20.4 16.1L16.8 17.9L17.6 21.8L13.8 20.6L12 24L10.2 20.6L6.4 21.8L7.2 17.9L3.6 16.1L6 13L3.6 9.9L7.2 8.1L6.4 4.2L10.2 5.4L12 2Z" fill="#3797F0"/>
                    <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </h2>

              <div className="flex gap-4 sm:gap-8 mb-3">
                <div className="text-center">
                  <p className="font-bold text-foreground text-base sm:text-lg">{loading ? '…' : totalPosts}</p>
                  <p className="text-muted-foreground text-xs">posts</p>
                </div>
                <div className="text-center cursor-pointer">
                  <p className="font-bold text-foreground text-base sm:text-lg">{followersCount.toLocaleString()}</p>
                  <p className="text-muted-foreground text-xs">followers</p>
                </div>
                <div className="text-center cursor-pointer">
                  <p className="font-bold text-foreground text-base sm:text-lg">{followingCount}</p>
                  <p className="text-muted-foreground text-xs">following</p>
                </div>
              </div>

              {/* Action buttons: Follow + Share */}
              <div className="flex gap-2">
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    if (isFollowing) {
                      requireLogin(() => {
                        const fp = getDeviceFingerprint()
                        unfollowAdmin(fp).then(d => {
                          setIsFollowing(false)
                          setFollowersCount(d.count)
                        })
                      })
                    } else {
                      requireLogin(() => setShowFollowModal(true))
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all ${
                    isFollowing
                      ? 'bg-secondary text-foreground border border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                      : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white'
                  }`}>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isFollowing ? 'Following ✓' : 'Follow'}</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.96 }}
                  onClick={() => setShowShare(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs sm:text-sm font-semibold transition-colors">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Profile</span>
                </motion.button>
              </div>
            </div>
          </div>

          {/* Bio (name already shown above, just tagline/bio here) */}
          <div className="mb-3">
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{profile?.tagline || 'DevOps Engineer · Full Stack Developer'}</p>
            {profile?.bio && profile.bio !== profile.tagline && (
              <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{profile.bio}</p>
            )}
            {/* Instagram link */}
            <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 mt-1 text-xs text-rose-400 hover:text-rose-300 transition-colors">
              <Instagram className="w-3 h-3" />
              <span>View on Instagram</span>
            </a>
          </div>

          {/* Stories row - horizontal scroll */}
          <div className="flex items-center gap-3 pb-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {/* Real stories from admin */}
            {stories.length === 0 ? (
              /* Placeholder stories when none added */
              [{label:'Travel',emoji:'✈️'},{label:'Code',emoji:'💻'},{label:'Life',emoji:'🌟'}].map((s,i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 opacity-40">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 via-orange-500 to-yellow-400 p-0.5">
                    <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-2xl">{s.emoji}</div>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[64px]">{s.label}</span>
                </div>
              ))
            ) : (
              stories.map(s => (
                <motion.button key={s.id} whileTap={{ scale: 0.94 }}
                  onClick={() => setActiveStory(s)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 via-orange-500 to-yellow-400 p-0.5">
                    <div className="w-full h-full rounded-full bg-secondary overflow-hidden">
                      {s.media_id ? (
                        s.media_type === 'video'
                          ? <video src={s.media_id.startsWith('http') ? s.media_id : `/api/journey/media?id=${s.media_id}`} className="w-full h-full object-cover" muted playsInline />
                          : <img src={s.media_id.startsWith('http') ? s.media_id : `/api/journey/media?id=${s.media_id}`} alt={s.label} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">{s.emoji}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[64px]">{s.label}</span>
                </motion.button>
              ))
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-20">
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-4 text-muted-foreground">
              <div className="w-10 h-10 border-2 border-muted-foreground/20 border-t-muted-foreground/60 rounded-full animate-spin" />
              <p className="text-sm">Loading journey…</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key="blogs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {blogs.length === 0 ? (
                    <div className="py-24 flex flex-col items-center gap-4 text-muted-foreground">
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center"><ImageIcon className="w-8 h-8" /></div>
                      <p className="text-lg font-medium">No posts yet</p>
                      <p className="text-sm text-center max-w-xs">Add your first memory from the admin dashboard to start your journey.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-0.5">
                      {blogs.map((post, idx) => <BlogCard key={post.id} post={post} onClick={() => setActiveBlog(idx)} />)}
                    </div>
                  )}
                </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Blog lightbox */}
        <AnimatePresence>
          {activeBlogPost && (
            <BlogLightbox post={activeBlogPost} onClose={() => setActiveBlog(null)}
              onPrev={activeBlog! > 0 ? () => setActiveBlog(i => i! - 1) : undefined}
              onNext={activeBlog! < blogs.length - 1 ? () => setActiveBlog(i => i! + 1) : undefined} />
          )}
        </AnimatePresence>

        {/* Share profile modal */}
        <AnimatePresence>
          {showShare && <ShareProfileModal onClose={() => setShowShare(false)} profileName={profileName} />}
        </AnimatePresence>

        {/* Follow modal */}
        <AnimatePresence>
          {showFollowModal && (
            <FollowModal
              onClose={() => setShowFollowModal(false)}
              onFollow={(name, email) => {
                const fp = getDeviceFingerprint()
                followAdmin(name, email, fp).then(d => {
                  if (d.success) {
                    setIsFollowing(true)
                    setFollowersCount(d.count)
                    setShowFollowModal(false)
                  }
                })
              }}
            />
          )}
        </AnimatePresence>

        {/* Story viewer */}
        <AnimatePresence>
          {activeStory && <StoryViewer story={activeStory} stories={stories} onClose={() => setActiveStory(null)} />}
        </AnimatePresence>
      </div>
    </>
  )
}

// ─── Follow Modal ─────────────────────────────────────────────────────────────

function FollowModal({ onClose, onFollow }: {
  onClose: () => void
  onFollow: (name: string, email: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isAutoFilled, setIsAutoFilled] = useState(false)

  // Auto-fill from logged-in user session
  useEffect(() => {
    try {
      const session = localStorage.getItem('portfolio_user_session_v1')
      if (session) {
        const u = JSON.parse(session)
        if (u?.id && u?.email) {
          const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
          if (fullName) setName(fullName)
          if (u.email) setEmail(u.email)
          setIsAutoFilled(true)
        }
      }
    } catch {}
  }, [])

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return }
    if (!email.trim()) { setError('Email is required to follow.'); return }
    if (!/\S+@\S+\.\S+/.test(email.trim())) { setError('Please enter a valid email address.'); return }
    setSubmitting(true)
    setError('')
    try {
      await onFollow(name.trim(), email.trim())
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 26 }}
        className="w-full max-w-sm bg-background border border-border rounded-3xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-foreground text-lg">Follow Journey</h3>
            <p className="text-muted-foreground text-xs mt-0.5">
              {isAutoFilled ? 'Your details are auto-filled from your account' : 'Enter your details to follow this journey'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar preview */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white font-bold text-2xl">
            {name ? name.charAt(0).toUpperCase() : '?'}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-3">
          {isAutoFilled && (
            <div className="flex items-center gap-1.5 text-xs text-rose-500 bg-rose-500/10 rounded-lg px-3 py-1.5 border border-rose-500/20">
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
              Name &amp; email auto-filled from your account
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Your Name *</label>
            <input
              value={name}
              onChange={e => !isAutoFilled && setName(e.target.value)}
              readOnly={isAutoFilled}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Ravi Kumar"
              className={`w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-rose-500/60 transition-all ${isAutoFilled ? 'opacity-70 cursor-default' : ''}`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={e => !isAutoFilled && setEmail(e.target.value)}
              readOnly={isAutoFilled}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="ravi@example.com"
              className={`w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-rose-500/60 transition-all ${isAutoFilled ? 'opacity-70 cursor-default' : ''}`}
            />
          </div>
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>

        {/* Follow button */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={submitting}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all">
          {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Following…</> : <><UserPlus className="w-4 h-4" />Follow this Journey</>}
        </motion.button>

        <p className="text-center text-muted-foreground text-xs">Your follow is permanent on this device. You'll receive email updates for new blog posts.</p>
      </motion.div>
    </motion.div>
  )
}

// ─── Story Viewer ─────────────────────────────────────────────────────────────

function StoryViewer({ story, stories, onClose }: {
  story: JourneyStory
  stories: JourneyStory[]
  onClose: () => void
}) {
  const [current, setCurrent] = useState(stories.findIndex(s => s.id === story.id))
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const DURATION = 5000

  const activeStory = stories[current]

  useEffect(() => {
    setProgress(0)
    if (timerRef.current) clearInterval(timerRef.current)
    const start = Date.now()
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min((elapsed / DURATION) * 100, 100)
      setProgress(pct)
      if (pct >= 100) {
        if (current < stories.length - 1) {
          setCurrent(c => c + 1)
        } else {
          onClose()
        }
      }
    }, 50)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [current])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black flex items-center justify-center"
      onClick={onClose}>
      <div className="relative w-full max-w-sm h-full max-h-[100dvh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-3">
          {stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-none"
                style={{ width: i < current ? '100%' : i === current ? `${progress}%` : '0%' }} />
            </div>
          ))}
        </div>

        {/* Top bar */}
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center gap-3 px-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-lg flex-shrink-0">
            {activeStory?.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{activeStory?.label}</p>
            {activeStory?.title && activeStory.title !== activeStory.label && (
              <p className="text-white/70 text-xs truncate">{activeStory.title}</p>
            )}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Media */}
        <div className="w-full h-full bg-black rounded-2xl overflow-hidden">
          {activeStory?.media_id ? (
            activeStory.media_type === 'video'
              ? <video src={activeStory.media_id.startsWith('http') ? activeStory.media_id : `/api/journey/media?id=${activeStory.media_id}`}
                  className="w-full h-full object-cover" autoPlay muted playsInline loop />
              : <img src={activeStory.media_id.startsWith('http') ? activeStory.media_id : `/api/journey/media?id=${activeStory.media_id}`}
                  alt={activeStory.label} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-8xl">{activeStory?.emoji}</div>
          )}
        </div>

        {/* Tap zones */}
        <div className="absolute inset-0 flex">
          <div className="flex-1" onClick={e => { e.stopPropagation(); if (current > 0) setCurrent(c => c - 1) }} />
          <div className="flex-1" onClick={e => { e.stopPropagation(); if (current < stories.length - 1) setCurrent(c => c + 1); else onClose() }} />
        </div>
      </div>
    </motion.div>
  )
}
